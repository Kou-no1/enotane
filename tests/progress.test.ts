import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, ProgressStore, STORAGE_KEY, localDate, parseSaved } from '../src/store/progress';
function memory(initial?: string) {
  const values = new Map<string, string>([['other_app', 'keep']]); if (initial) values.set(STORAGE_KEY, initial);
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const initial = () => JSON.stringify({ schemaVersion: 1, settings: DEFAULT_SETTINGS, stamps: { 'W-11': { stamp: 'tried', at: '2026-10-09' } } });
describe('browser-local records and privacy', () => {
  it('does not replace saved stamps while recording is OFF or transfer temporary records back ON', () => {
    const storage = memory(initial()), store = new ProgressStore(storage);
    store.updateSettings({ saveProgress: false }); store.setStamp('P-02', 'done'); store.setStamp('W-11', null); store.updateSettings({ ruby: false });
    expect(store.getSnapshot().stamps['P-02'].stamp).toBe('done'); expect(store.getSnapshot().stamps['W-11']).toBeUndefined();
    expect(JSON.parse(storage.values.get(STORAGE_KEY)!).stamps).toEqual({ 'W-11': { stamp: 'tried', at: '2026-10-09' } });
    store.updateSettings({ saveProgress: true }); expect(store.getSnapshot().stamps['P-02']).toBeUndefined(); expect(store.getSnapshot().stamps['W-11'].stamp).toBe('tried');
    store.setStamp('P-02', 'want-to-use'); expect(JSON.parse(storage.values.get(STORAGE_KEY)!).stamps['P-02'].stamp).toBe('want-to-use');
  });
  it('starts teacher mode with a session recording override and keeps the saved settings', () => {
    const storage = memory(initial()), store = new ProgressStore(storage); store.setTeacherMode(true);
    expect(store.getSnapshot().settings.saveProgress).toBe(false); store.setStamp('P-02', 'done'); store.updateSettings({ kiki: 'left' });
    const saved = JSON.parse(storage.values.get(STORAGE_KEY)!); expect(saved.settings.saveProgress).toBe(true); expect(saved.stamps['P-02']).toBeUndefined();
    store.setTeacherMode(false); expect(store.getSnapshot().settings.saveProgress).toBe(true); expect(store.getSnapshot().stamps['W-11']).toBeDefined();
  });
  it('resets only stamps after the UI confirmation, retaining settings, favorites and other apps', () => {
    const storage = memory(initial()), store = new ProgressStore(storage); store.updateSettings({ ruby: false }); store.toggleFavorite('P-02'); store.resetStamps();
    const saved = JSON.parse(storage.values.get(STORAGE_KEY)!); expect(saved.stamps).toEqual({}); expect(saved.settings.ruby).toBe(false); expect(saved.favorites).toEqual(['P-02']); expect(storage.values.get('other_app')).toBe('keep');
  });
  it.each(['{broken', JSON.stringify({ schemaVersion: 2, private: 'preserve' })])('preserves corrupt or future-version data and falls back to memory', raw => {
    const storage = memory(raw), store = new ProgressStore(storage); store.setStamp('P-02', 'done'); store.updateSettings({ speed: 0.5 });
    expect(store.getSnapshot().stamps['P-02'].stamp).toBe('done'); expect(store.getSnapshot().saveError).not.toBe(''); expect(storage.values.get(STORAGE_KEY)).toBe(raw);
  });
  it('keeps usable in-memory records when storage throws', () => {
    const store = new ProgressStore({ getItem: () => null, setItem: () => { throw new Error('quota'); } }); store.setStamp('P-02', 'done'); store.setStamp('C-09', 'tried');
    expect(store.getSnapshot().stamps['C-09']).toBeDefined(); expect(store.getSnapshot().saveError).toContain('保存できません');
  });
  it('rejects unknown lesson IDs and stores only supported setting fields', () => {
    const storage = memory(), store = new ProgressStore(storage); expect(() => store.setStamp('P-99', 'done')).toThrow();
    expect(() => parseSaved({ schemaVersion: 1, settings: DEFAULT_SETTINGS, stamps: { bad: { stamp: 'done', at: '2026-10-09' } } })).toThrow();
    expect(parseSaved({ schemaVersion: 1, settings: { ...DEFAULT_SETTINGS, name: 'not saved' }, stamps: {} }).settings).not.toHaveProperty('name');
  });
  it('uses the device local calendar rather than UTC for stamp dates', () => {
    const date = new Date(2026, 9, 9, 0, 15); expect(localDate(date)).toBe('2026-10-09');
    const store = new ProgressStore(memory(), () => date); store.setStamp('P-02', 'tried'); expect(store.getSnapshot().stamps['P-02'].at).toBe('2026-10-09');
  });
});
