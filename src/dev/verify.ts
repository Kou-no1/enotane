import { Renderer } from '../engine/stage';
import { Player } from '../engine/player';
import { parseScript } from '../engine/schema';
import type { Action, Script, Step } from '../engine/types';

export interface GalleryVerification { name: string; ok: boolean; detail: string }
type DiagnosticLayer = 'under' | 'paint' | 'wet' | 'top' | 'wetMask';
const pauseForUi = () => new Promise<void>(resolve => setTimeout(resolve, 0));
const SAMPLE_IDS = ['P-02', 'C-09', 'W-11'] as const;
const SNAPSHOT_BUDGET = 48 * 1024 * 1024;
const IMAGE_BUDGET = 128 * 1024 * 1024;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function readPixels(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const context = canvas.getContext('2d');
  assert(context !== null, 'Canvas 2Dを使用できません。');
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

/** Fixed byte hashing is sufficient for same-browser image comparisons. */
function hash(pixels: Uint8ClampedArray): string {
  let value = 2166136261;
  for (let index = 0; index < pixels.length; index++) {
    value = Math.imul(value ^ pixels[index], 16777619);
  }
  return (value >>> 0).toString(16).padStart(8, '0');
}

function alphaPixels(pixels: Uint8ClampedArray): number {
  let count = 0;
  for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) count++;
  return count;
}

function alphaSum(pixels: Uint8ClampedArray): number {
  let sum = 0;
  for (let index = 3; index < pixels.length; index += 4) sum += pixels[index];
  return sum;
}

function pixelDifference(before: Uint8ClampedArray, after: Uint8ClampedArray): string {
  assert(before.length === after.length, '比較する画像の解像度が変わっています。');
  let changedPixels = 0;
  let alphaChangedPixels = 0;
  let maxRgbDifference = 0;
  let maxAlphaDifference = 0;
  for (let index = 0; index < before.length; index += 4) {
    let changed = false;
    for (let channel = 0; channel < 3; channel++) {
      const difference = Math.abs(before[index + channel] - after[index + channel]);
      maxRgbDifference = Math.max(maxRgbDifference, difference);
      changed ||= difference > 0;
    }
    const alphaDifference = Math.abs(before[index + 3] - after[index + 3]);
    if (alphaDifference > 0) alphaChangedPixels++;
    maxAlphaDifference = Math.max(maxAlphaDifference, alphaDifference);
    if (changed || alphaDifference > 0) changedPixels++;
  }
  return `差分${changedPixels}画素、最大RGB差${maxRgbDifference}、alpha差${alphaChangedPixels}画素/最大${maxAlphaDifference}、alphaSum ${alphaSum(before)}→${alphaSum(after)}`;
}

function brightness(pixels: Uint8ClampedArray, cx: number, cy: number, width: number, height: number): number {
  let sum = 0;
  let count = 0;
  const scaleX = width / 1000;
  const scaleY = height / 625;
  for (let y = Math.round((cy - 12) * scaleY); y < Math.round((cy + 12) * scaleY); y++) {
    for (let x = Math.round((cx - 12) * scaleX); x < Math.round((cx + 12) * scaleX); x++) {
      const index = (y * width + x) * 4;
      sum += (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
      count++;
    }
  }
  return sum / count;
}

function renderPixels(renderer: Renderer, canvas: HTMLCanvasElement, script: Script,
  stepIndex: number, timeMs = script.steps[stepIndex].durationMs, layer?: DiagnosticLayer): Uint8ClampedArray {
  renderer.render(stepIndex, timeMs, {
    left: false, still: false, showGuides: false, ...(layer ? { layer } : {}),
  });
  // Inspect the stored 1000×625 raster for layer invariants. Display scaling
  // and GPU readback are relevant to visual hashes, not source preservation.
  return layer ? renderer.getLayerImageData(layer).data : readPixels(canvas);
}

async function withRenderer<T>(script: Script,
  operation: (renderer: Renderer, canvas: HTMLCanvasElement) => Promise<T>): Promise<T> {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 625;
  let renderer: Renderer | undefined;
  try {
    renderer = new Renderer(canvas, script);
    await renderer.ready;
    return await operation(renderer, canvas);
  } finally {
    renderer?.dispose();
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function cadenceHash(renderer: Renderer, canvas: HTMLCanvasElement, script: Script,
  hz: 30 | 60, speed: 0.5 | 1 | 1.5): Promise<string> {
  const player = new Player(script.steps.map(step => step.durationMs));
  try {
    player.setSpeed(speed);
    player.playPause();
    player.tick(0);
    const totalMs = script.steps.reduce((sum, step) => sum + step.durationMs, 0);
    const frames = Math.ceil(totalMs / speed / (1000 / hz)) + 2;
    let lastSample = '';
    for (let frame = 1; frame <= frames; frame++) {
      player.tick(frame * (1000 / hz));
      const state = player.getState();
      const bucket = Math.floor(state.stepTimeMs / script.steps[state.stepIndex].durationMs * 4);
      const key = `${state.stepIndex}:${bucket}:${state.status}`;
      // Drive the actual clock at 30/60Hz, but draw representative quarter-step
      // frames. Full-frame drawing hundreds of times would block the gallery.
      if (key !== lastSample || state.status === 'lesson-ended') {
        renderer.render(state.stepIndex, state.stepTimeMs, { left: false, still: false, showGuides: false });
        lastSample = key;
        await pauseForUi();
      }
      if (state.status === 'lesson-ended') return hash(readPixels(canvas));
    }
    throw new Error(`${hz}Hz / ${speed}倍で最終ステップへ到達しませんでした。`);
  } finally {
    player.dispose();
  }
}

function fixture(id: string, steps: Step[]): Script {
  return parseScript({
    schemaVersion: 1, id, seed: 1009,
    stage: { paper: 'gayoushi', view: 'top', mirror: 'handedness' },
    regions: {}, steps,
  });
}

function whiteFixture(): Script {
  return fixture('P-01', [
    { id: 'dark', durationMs: 6000, caption: 'くらい いろを ぬるよ', description: '暗い下地。', actions: [
      { id: 'dark-fill', type: 'crayon.fill', t: 0, dur: 3500,
        region: { shape: 'rect', x: 100, y: 100, w: 800, h: 430 },
        color: 'kuro', kind: 'oil-pastel', pressure: 1 },
    ] },
    { id: 'white', durationMs: 7000, caption: 'しろで あかるく するよ', description: '白パスと不透明な白絵の具を重ねる。', actions: [
      { id: 'white-pastel', type: 'crayon.stroke', t: 0, dur: 3000,
        path: { gen: 'line', x1: 280, y1: 220, x2: 720, y2: 220 },
        color: 'shiro', kind: 'oil-pastel', width: 80, pressure: 1 },
      { id: 'white-paint', type: 'paint.stroke', t: 3500, dur: 3000,
        path: { gen: 'line', x1: 280, y1: 390, x2: 720, y2: 390 },
        color: 'shiro', width: 80, mode: 'opaque', water: 0 },
    ] },
    { id: 'observe', durationMs: 7000, caption: 'あかるさを くらべよう', description: '暗い下地と白の重なりを確認する。', actions: [
      { id: 'wait', type: 'wait', t: 0, dur: 7000 },
    ] },
  ]);
}

function actionFixture(): Script {
  return fixture('P-01', [
    { id: 'tools', durationMs: 8000, caption: 'いろいろな せんと めん', description: '画材と補助演出の確認。', actions: [
      { id: 'enter', type: 'hand.enter', t: 0, dur: 200, tool: 'pencil' },
      { id: 'pencil', type: 'pencil.stroke', t: 300, dur: 700,
        path: { gen: 'line', x1: 250, y1: 150, x2: 500, y2: 150 }, width: 4 },
      { id: 'hatch', type: 'pencil.hatch', t: 1100, dur: 700,
        region: { shape: 'rect', x: 100, y: 200, w: 250, h: 120 }, spacing: 8, cross: true },
      { id: 'crayon', type: 'crayon.stroke', t: 1900, dur: 700,
        path: { gen: 'line', x1: 450, y1: 150, x2: 750, y2: 150 }, color: 'aka' },
      { id: 'fill', type: 'crayon.fill', t: 2700, dur: 700,
        region: { shape: 'rect', x: 100, y: 350, w: 250, h: 150 }, colors: ['ao', 'momo'], pattern: 'stripes' },
      { id: 'smudge', type: 'smudge', t: 3500, dur: 700,
        path: { gen: 'line', x1: 160, y1: 440, x2: 300, y2: 440 }, strength: 0.6 },
      { id: 'paint-line', type: 'paint.stroke', t: 4300, dur: 700,
        path: { gen: 'line', x1: 430, y1: 400, x2: 750, y2: 400 }, color: 'aka', mode: 'opaque', brush: 'flat' },
      { id: 'paint-area', type: 'paint.wash', t: 5100, dur: 700,
        region: { shape: 'rect', x: 500, y: 180, w: 200, h: 150 }, color: 'ao', pattern: 'grad', gradTo: 'kiiro' },
      { id: 'move', type: 'hand.move', t: 5900, dur: 400, to: [500, 500] },
      { id: 'exit', type: 'hand.exit', t: 6400, dur: 300 },
      { id: 'arrow', type: 'note.arrow', t: 300, dur: 7500, at: [700, 500], to: [900, 450], text: 'せん' },
      { id: 'circle', type: 'note.circle', t: 1100, dur: 5000, at: [860, 200], r: 35, text: 'ここ' },
      { id: 'label', type: 'note.label', t: 0, dur: 7900, at: [500, 570], text: 'いろを くらべよう' },
      { id: 'zoom', type: 'zoom.to', t: 6000, dur: 500, rect: [100, 100, 800, 450] },
      { id: 'reset', type: 'zoom.reset', t: 6700, dur: 400 },
      { id: 'pause', type: 'wait', t: 7200, dur: 800 },
    ] },
    { id: 'wet', durationMs: 8000, caption: 'みずと いろを おくよ', description: '透明水・にじみ・乾燥を確認する。', actions: [
      { id: 'water', type: 'paint.wash', t: 0, dur: 1000, color: 'water', water: 1,
        region: { shape: 'ellipse', cx: 500, cy: 310, rx: 280, ry: 180 } },
      { id: 'drop', type: 'paint.drop', t: 1100, dur: 200, at: [500, 310], color: 'aka', size: 25 },
      { id: 'bleed', type: 'paint.bleed', t: 1400, dur: 1600, source: 'drop', radius: 110,
        region: { shape: 'ellipse', cx: 500, cy: 310, rx: 280, ry: 180 } },
      { id: 'sheen', type: 'fx.sheen', t: 1000, dur: 5500,
        region: { shape: 'ellipse', cx: 500, cy: 310, rx: 280, ry: 180 } },
      { id: 'dry', type: 'paint.dry', t: 6600, dur: 1200,
        region: { shape: 'ellipse', cx: 500, cy: 310, rx: 280, ry: 180 } },
    ] },
    { id: 'scratch', durationMs: 8000, caption: 'ひっかいて みるよ', description: '下地・上塗り・削除を確認する。', actions: [
      { id: 'under', type: 'crayon.fill', t: 0, dur: 1500, layer: 'under', colors: ['kiiro', 'momo', 'mizu'], pattern: 'stripes',
        region: { shape: 'rect', x: 100, y: 100, w: 800, h: 430 } },
      { id: 'cover', type: 'scratch.cover', t: 1700, dur: 1500,
        region: { shape: 'rect', x: 100, y: 100, w: 800, h: 430 } },
      { id: 'scratch', type: 'scratch.stroke', t: 3400, dur: 2000, width: 8,
        path: { gen: 'burst', cx: 500, cy: 310, r: 170, rays: 10 } },
      { id: 'observe', type: 'note.label', t: 5500, dur: 2000, at: [500, 570], text: 'したの いろ' },
      { id: 'wait', type: 'wait', t: 7600, dur: 400 },
    ] },
  ]);
}

const PHASE_ZERO_ACTIONS: Action['type'][] = [
  'hand.enter', 'hand.exit', 'hand.move', 'pencil.stroke', 'pencil.hatch',
  'crayon.stroke', 'crayon.fill', 'smudge', 'paint.stroke', 'paint.wash',
  'paint.drop', 'paint.bleed', 'paint.dry', 'fx.sheen', 'scratch.cover', 'scratch.stroke',
  'note.arrow', 'note.circle', 'note.label', 'zoom.to', 'zoom.reset', 'wait',
];

/** Browser checks: image equality is claimed only inside this browser run. */
export async function verifyGallery(onProgress?: (text: string) => void): Promise<GalleryVerification[]> {
  const results: GalleryVerification[] = [];
  const check = async (name: string, operation: () => Promise<string>) => {
    onProgress?.(name);
    await pauseForUi();
    try { results.push({ name, ok: true, detail: await operation() }); }
    catch (error) { results.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) }); }
  };
  const loaded = await Promise.allSettled(SAMPLE_IDS.map(async id => {
    const response = await fetch(new URL(`data/anim/${id}.json`, document.baseURI));
    assert(response.ok, `${id}: HTTP ${response.status}`);
    const script = parseScript(await response.json());
    assert(script.id === id, `${id}: ファイルと台本IDが一致しません。`);
    return script;
  }));

  for (let index = 0; index < loaded.length; index++) {
    const entry = loaded[index];
    if (entry.status === 'rejected') {
      results.push({ name: `${SAMPLE_IDS[index]} 読み込み`, ok: false,
        detail: entry.reason instanceof Error ? entry.reason.message : String(entry.reason) });
      continue;
    }
    const script = entry.value;
    await check(`${script.id} 再現性・戻る・速度`, async () => withRenderer(script, async (renderer, canvas) => {
      const last = script.steps.length - 1;
      const expected = hash(renderPixels(renderer, canvas, script, last));
      const paint = renderPixels(renderer, canvas, script, last, undefined, script.id === 'C-09' ? 'under' : 'paint');
      assert(alphaPixels(paint) > 0, '最終作例の描画が空です。');
      for (const [hz, speed] of [[30, 1], [60, 0.5], [60, 1], [60, 1.5]] as const) {
        const actual = await cadenceHash(renderer, canvas, script, hz, speed);
        assert(actual === expected, `${hz}Hz/${speed}倍の最終画像が不一致: ${actual} / ${expected}`);
      }
      for (const [step, progress] of [[0, 0], [1, 0.55], [0, 0.7], [last, 0.25], [1, 0]] as const) {
        renderPixels(renderer, canvas, script, step, script.steps[step].durationMs * progress);
        await pauseForUi();
      }
      const restored = hash(renderPixels(renderer, canvas, script, last));
      assert(restored === expected, `戻る・再開始後の画像が不一致: ${restored} / ${expected}`);
      return `最終hash ${expected}。30/60HzのPlayer時刻、0.5/1/1.5倍、代表フレームと任意移動後の最終画像が一致。`;
    }));

    if (script.id === 'W-11') {
      await check('W-11 水・にじみ・乾燥の層', async () => withRenderer(script, async (renderer, canvas) => {
        const wetMask = renderPixels(renderer, canvas, script, 0, undefined, 'wetMask');
        const wetCount = alphaPixels(wetMask);
        assert(wetCount > 1000, '水だけをぬった領域がwetMaskへ記録されません。');
        const waterPigment = renderPixels(renderer, canvas, script, 0, undefined, 'wet');
        assert(alphaPixels(waterPigment) === 0, '透明水が顔料としてwetへ描かれています。');
        const spread = renderPixels(renderer, canvas, script, script.steps.length - 2, undefined, 'wet');
        assert(alphaPixels(spread) > 0, '乾燥前のにじみが空です。');
        let outside = 0;
        for (let offset = 3; offset < spread.length; offset += 4) {
          if (spread[offset] > 8 && wetMask[offset] === 0) outside++;
        }
        assert(outside === 0, `ぬれた範囲の外に${outside}画素の顔料があります。`);
        const last = script.steps.length - 1;
        const maskPixelsAfter = renderPixels(renderer, canvas, script, last, undefined, 'wetMask');
        const wetPixelsAfter = renderPixels(renderer, canvas, script, last, undefined, 'wet');
        const retainedPixels = renderPixels(renderer, canvas, script, last, undefined, 'paint');
        const maskAfter = alphaPixels(maskPixelsAfter);
        const wetAfter = alphaPixels(wetPixelsAfter);
        const retained = alphaPixels(retainedPixels);
        const dryDetails = `wet ${wetAfter}画素/alphaSum ${alphaSum(wetPixelsAfter)}、wetMask ${maskAfter}画素/alphaSum ${alphaSum(maskPixelsAfter)}、paint ${retained}画素/alphaSum ${alphaSum(retainedPixels)}`;
        assert(maskAfter === 0 && wetAfter === 0, `乾燥後もwet/wetMaskが残っています：${dryDetails}`);
        assert(retained > 0, '乾燥時に顔料まで消えています。');
        return `水マスク${wetCount}画素、領域外0、乾燥後 ${dryDetails}。`;
      }));
    }

    if (script.id === 'C-09') {
      await check('C-09 上塗りだけを削り下地を保持', async () => withRenderer(script, async (renderer, canvas) => {
        const underPixelsBefore = renderPixels(renderer, canvas, script, 0, undefined, 'under');
        const underBefore = hash(underPixelsBefore);
        const cover = renderPixels(renderer, canvas, script, 1, undefined, 'top');
        const coveredPixels = alphaPixels(cover);
        const coveredAlpha = alphaSum(cover);
        assert(coveredPixels > 1000, '黒い上塗りが空です。');
        const last = script.steps.length - 1;
        const scratched = renderPixels(renderer, canvas, script, last, undefined, 'top');
        const remainingPixels = alphaPixels(scratched);
        const remainingAlpha = alphaSum(scratched);
        assert(remainingPixels < coveredPixels && remainingAlpha < coveredAlpha,
          'ひっかいた後にtopの不透明画素が減っていません。');
        assert(remainingPixels > 0, 'ひっかきで上塗り全体が消えています。');
        const underPixelsAfter = renderPixels(renderer, canvas, script, last, undefined, 'under');
        const underAfter = hash(underPixelsAfter);
        assert(underAfter === underBefore,
          `ひっかきが下地を変更しています：hash ${underBefore}→${underAfter}、${pixelDifference(underPixelsBefore, underPixelsAfter)}`);
        return `top ${coveredPixels}→${remainingPixels}画素。under hash ${underAfter}を維持。`;
      }));
    }

    await check(`${script.id} 画像キャッシュ予算・再生成`, async () => {
      let expected = '';
      let metrics = '';
      await withRenderer(script, async (renderer, canvas) => {
        for (let step = 0; step < script.steps.length; step++) {
          renderPixels(renderer, canvas, script, step);
          await pauseForUi();
        }
        const stats = renderer.getStats();
        assert(stats.snapshotBytes <= SNAPSHOT_BUDGET, `チェックポイントが48MiBを超えています: ${stats.snapshotBytes}`);
        assert(stats.estimatedBytes <= IMAGE_BUDGET, `推定画素量が128MiBを超えています: ${stats.estimatedBytes}`);
        expected = hash(renderPixels(renderer, canvas, script, script.steps.length - 1));
        metrics = `snapshot ${(stats.snapshotBytes / 1048576).toFixed(1)}MiB / 画素推定 ${(stats.estimatedBytes / 1048576).toFixed(1)}MiB / cache ${stats.cacheEntries}`;
      });
      // A new renderer must reproduce the same image after the old one is
      // disposed; this avoids only comparing an already-cached final bitmap.
      await withRenderer(script, async (renderer, canvas) => {
        const actual = hash(renderPixels(renderer, canvas, script, script.steps.length - 1));
        assert(actual === expected, `新しいRendererの画像が不一致: ${actual} / ${expected}`);
      });
      return `${metrics}。破棄後の新規Rendererでもhash一致。実メモリの測定とは別。`;
    });
  }

  await check('白パス・不透明な白水彩の通常合成', async () => {
    const script = whiteFixture();
    return withRenderer(script, async (renderer, canvas) => {
      const before = renderPixels(renderer, canvas, script, 0);
      const pastelBefore = brightness(before, 500, 220, canvas.width, canvas.height);
      const paintBefore = brightness(before, 500, 390, canvas.width, canvas.height);
      const after = renderPixels(renderer, canvas, script, 2);
      const pastelAfter = brightness(after, 500, 220, canvas.width, canvas.height);
      const paintAfter = brightness(after, 500, 390, canvas.width, canvas.height);
      assert(pastelAfter > pastelBefore + 40, `白パスで明るくなりません: ${pastelBefore.toFixed(1)}→${pastelAfter.toFixed(1)}`);
      assert(paintAfter > paintBefore + 40, `不透明白水彩で明るくなりません: ${paintBefore.toFixed(1)}→${paintAfter.toFixed(1)}`);
      return `24×24画素の平均明度：白パス ${pastelBefore.toFixed(1)}→${pastelAfter.toFixed(1)}、白水彩 ${paintBefore.toFixed(1)}→${paintAfter.toFixed(1)}。`;
    });
  });

  await check('Phase 0 全22アクションの描画スモーク', async () => {
    const script = actionFixture();
    const present = new Set(script.steps.flatMap(step => step.actions.map(action => action.type)));
    assert(PHASE_ZERO_ACTIONS.every(type => present.has(type)), '確認台本に不足しているアクションがあります。');
    return withRenderer(script, async (renderer, canvas) => {
      let rendered = 0;
      for (let step = 0; step < script.steps.length; step++) {
        const times = new Set<number>([0, script.steps[step].durationMs]);
        for (const action of script.steps[step].actions) {
          times.add(action.t + action.dur / 2);
          times.add(action.t + action.dur);
        }
        for (const time of [...times].sort((left, right) => left - right)) {
          renderer.render(step, time, { left: false, still: false, showGuides: true });
          rendered++;
          await pauseForUi();
        }
      }
      assert(alphaPixels(renderPixels(renderer, canvas, script, 2, undefined, 'under')) > 0, 'スモーク台本の下地が空です。');
      return `${present.size}種のアクション、途中と終端${rendered}フレームを例外なく描画。個別作用の意味は水・スクラッチ・白の検証で確認。`;
    });
  });
  onProgress?.(`確認完了：${results.filter(result => result.ok).length}/${results.length}項目`);
  return results;
}
