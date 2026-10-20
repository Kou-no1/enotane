import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const resource = vi.hoisted(() => ({ dispose: vi.fn(), draw: vi.fn(), constructFails: false, startFails: false }));
vi.mock('../src/engine/stage', () => ({ Renderer: class {
  ready = Promise.resolve(); render = resource.draw; renderTo = vi.fn(); dispose = resource.dispose;
} }));
import { recordLesson } from '../src/app/features';
import type { Script } from '../src/engine/types';

const script: Script = { schemaVersion: 1, id: 'P-02', seed: 1, stage: { paper: 'gayoushi', view: 'top', mirror: 'handedness' }, regions: {}, steps: [{ id: 'first', durationMs: 5000, caption: 'せんを かこう', description: 'まっすぐな線', actions: [] }] };
const stopTrack = vi.fn();
const capture = vi.fn(() => ({ getTracks: () => [{ stop: stopTrack }] }));
class FakeCanvas {
  width = 0; height = 0; captureStream = capture;
  getContext() { return { fillRect() {}, drawImage() {}, fillText() {} }; }
}
// The capability check deliberately tests the prototype, as browsers do.
FakeCanvas.prototype.captureStream = capture;
class FakeRecorder {
  static isTypeSupported() { return true; }
  state = 'inactive';
  ondataavailable: unknown; onerror: unknown; onstop: unknown;
  constructor() { if (resource.constructFails) throw new Error('encoder constructor failed'); }
  start() { if (resource.startFails) throw new Error('encoder start failed'); this.state = 'recording'; }
  stop() { this.state = 'inactive'; }
}
beforeEach(() => {
  vi.clearAllMocks(); resource.constructFails = false; resource.startFails = false;
  resource.draw.mockImplementation(() => {});
  vi.stubGlobal('HTMLCanvasElement', FakeCanvas); vi.stubGlobal('MediaRecorder', FakeRecorder);
  vi.stubGlobal('document', { hidden: false, createElement: () => new FakeCanvas(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());
const run = () => recordLesson(script, { left: false, includeTools: false, captions: true }, new AbortController().signal, vi.fn());
describe('動画保存の失敗時の解放', () => {
  it('エンコーダー構築に失敗しても録画トラックと描画バッファを解放する', async () => {
    resource.constructFails = true;
    await expect(run()).rejects.toThrow('encoder constructor failed');
    expect(stopTrack).toHaveBeenCalledOnce(); expect(resource.dispose).toHaveBeenCalledOnce();
  });
  it('最初の描画に失敗しても録画トラックと描画バッファを解放する', async () => {
    resource.draw.mockImplementation(() => { throw new Error('initial draw failed'); });
    await expect(run()).rejects.toThrow('initial draw failed');
    expect(stopTrack).toHaveBeenCalledOnce(); expect(resource.dispose).toHaveBeenCalledOnce();
  });
  it('録画開始に失敗してもトラック・バッファ・イベント監視を解放する', async () => {
    resource.startFails = true;
    await expect(run()).rejects.toThrow('encoder start failed');
    expect(stopTrack).toHaveBeenCalledOnce(); expect(resource.dispose).toHaveBeenCalledOnce();
    expect(document.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
  it('準備中に中止された場合は録画トラックを作らず描画バッファを解放する', async () => {
    const abort = new AbortController(); abort.abort();
    await expect(recordLesson(script, { left: false, includeTools: false, captions: false }, abort.signal, vi.fn())).rejects.toThrow('中止');
    expect(capture).not.toHaveBeenCalled(); expect(resource.dispose).toHaveBeenCalledOnce();
  });
});
