import { useSyncExternalStore } from 'react';

export interface Settings {
  ruby: boolean; kiki: 'right' | 'left'; speed: 0.5 | 1 | 1.5;
  voice: boolean; motion: 'system' | 'reduced' | 'full'; saveProgress: boolean;
}
export type Stamp = 'tried' | 'done' | 'want-to-use';
export interface StampRecord { stamp: Stamp; at: string }
export type Stamps = Record<string, StampRecord>;
export const DEFAULT_SETTINGS: Settings = { ruby: true, kiki: 'right', speed: 1, voice: false, motion: 'system', saveProgress: true };
export const STORAGE_KEY = 'enotane_v1';
export const validLessonId = (id: string): boolean => {
  const match = /^(P|C|W|M|K|Z|O)-(\d{2})$/.exec(id);
  const counts: Record<string, number> = { P: 10, C: 12, W: 18, M: 7, K: 6, Z: 10, O: 6 };
  return Boolean(match && Number(match[2]) >= 1 && Number(match[2]) <= counts[match[1]]);
};
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
interface Saved { schemaVersion: 1; stamps: Stamps; settings: Settings; favorites: string[] }
export function parseSaved(value: unknown): Saved {
  if (!object(value) || value.schemaVersion !== 1 || !object(value.settings) || !object(value.stamps)) throw new Error('保存データの形式を確認できません。今回は保存せずに使えます。');
  const s = value.settings;
  if (typeof s.ruby !== 'boolean' || !['right', 'left'].includes(String(s.kiki)) || ![0.5, 1, 1.5].includes(Number(s.speed)) || typeof s.speed !== 'number' || typeof s.voice !== 'boolean' || !['system', 'reduced', 'full'].includes(String(s.motion)) || typeof s.saveProgress !== 'boolean') throw new Error('設定の形式を確認できません。今回は保存せずに使えます。');
  const stamps: Stamps = {};
  for (const [id, record] of Object.entries(value.stamps)) {
    if (!validLessonId(id) || !object(record) || !['tried', 'done', 'want-to-use'].includes(String(record.stamp)) || typeof record.at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.at)) throw new Error('スタンプの形式を確認できません。今回は保存せずに使えます。');
    stamps[id] = { stamp: record.stamp as Stamp, at: record.at };
  }
  const favorites = value.favorites ?? [];
  if (!Array.isArray(favorites) || favorites.length > 69 || favorites.some(id => typeof id !== 'string' || !validLessonId(id)) || new Set(favorites).size !== favorites.length) throw new Error('お気に入りの形式を確認できません。今回は保存せずに使えます。');
  return { schemaVersion: 1, stamps, settings: { ruby: s.ruby, kiki: s.kiki as Settings['kiki'], speed: s.speed as Settings['speed'], voice: s.voice, motion: s.motion as Settings['motion'], saveProgress: s.saveProgress }, favorites: [...favorites] as string[] };
}
export interface ProgressSnapshot { settings: Settings; stamps: Stamps; favorites: string[]; saveError: string; teacherMode: boolean }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export class ProgressStore {
  private saved: Saved = { schemaVersion: 1, stamps: {}, settings: { ...DEFAULT_SETTINGS }, favorites: [] };
  private temporary: Record<string, StampRecord | null> = {};
  private temporaryFavorites: string[] | null = null;
  private teacherMode = false;
  private teacherSaving = false;
  private writable = true;
  private saveError = '';
  private listeners = new Set<() => void>();
  private snapshot!: ProgressSnapshot;
  constructor(private storage?: StorageLike, private now: () => Date = () => new Date()) {
    try { const raw = storage?.getItem(STORAGE_KEY); if (raw) this.saved = parseSaved(JSON.parse(raw)); }
    catch (error) { this.writable = false; this.saveError = error instanceof SyntaxError ? '保存データを読み込めません。今回は保存せずに使えます。' : error instanceof Error ? error.message : 'このブラウザでは保存せずに使います。'; }
    if (!storage) { this.writable = false; this.saveError = 'このブラウザでは保存せずに使います。'; }
    this.refresh();
  }
  private settings(): Settings { return { ...this.saved.settings, saveProgress: this.teacherMode ? this.teacherSaving : this.saved.settings.saveProgress }; }
  private refresh(): void {
    const stamps = { ...this.saved.stamps };
    if (!this.settings().saveProgress || !this.writable) for (const [id, value] of Object.entries(this.temporary)) { if (value) stamps[id] = { ...value }; else delete stamps[id]; }
    this.snapshot = { settings: this.settings(), stamps, favorites: this.temporaryFavorites ?? [...this.saved.favorites], saveError: this.saveError, teacherMode: this.teacherMode };
    for (const listener of this.listeners) listener();
  }
  private persist(): void {
    if (!this.writable || !this.storage) return;
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(this.saved)); }
    catch { this.writable = false; this.saveError = '保存できませんでした。今回のきろくはこの画面の中だけに残ります。'; }
  }
  getSnapshot = (): ProgressSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  updateSettings = (patch: Partial<Settings>): void => {
    const wasSaving = this.settings().saveProgress;
    const clean = { ...this.saved.settings, ...patch };
    // Validate settings without allowing unknown fields into the stored schema.
    this.saved.settings = parseSaved({ schemaVersion: 1, settings: clean, stamps: {}, favorites: [] }).settings;
    if (this.teacherMode && patch.saveProgress !== undefined) this.teacherSaving = patch.saveProgress;
    // The teacher's initial OFF is a view override, never a saved setting.
    if (this.teacherMode && patch.saveProgress === undefined) this.saved.settings.saveProgress = clean.saveProgress;
    if (!wasSaving && this.settings().saveProgress) { this.temporary = {}; this.temporaryFavorites = null; }
    this.persist(); this.refresh();
  };
  setTeacherMode = (on: boolean): void => {
    if (on === this.teacherMode) return;
    this.teacherMode = on; this.teacherSaving = false;
    if (this.settings().saveProgress) { this.temporary = {}; this.temporaryFavorites = null; }
    this.refresh();
  };
  setStamp = (id: string, stamp: Stamp | null): void => {
    if (!validLessonId(id) || (stamp !== null && !['tried', 'done', 'want-to-use'].includes(stamp))) throw new Error('スタンプを保存するレッスンが不正です。');
    const record = stamp ? { stamp, at: localDate(this.now()) } : null;
    if (this.settings().saveProgress && this.writable) {
      if (record) this.saved.stamps[id] = record; else delete this.saved.stamps[id];
      this.persist();
    } else this.temporary[id] = record;
    this.refresh();
  };
  toggleFavorite = (id: string): void => {
    if (!validLessonId(id)) throw new Error('お気に入りのレッスンが不正です。');
    const current = this.temporaryFavorites ?? this.saved.favorites;
    const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id];
    if (this.settings().saveProgress && this.writable) { this.saved.favorites = next; this.persist(); }
    else this.temporaryFavorites = next;
    this.refresh();
  };
  /** The caller presents a confirmation view before invoking this method. */
  resetStamps = (): void => { this.saved.stamps = {}; this.temporary = {}; this.persist(); this.refresh(); };
}
let store: ProgressStore | undefined;
function sharedStore(): ProgressStore {
  if (!store) { let storage: Storage | undefined; try { storage = window.localStorage; } catch { /* Memory fallback. */ } store = new ProgressStore(storage); }
  return store;
}
export function useProgress() {
  const current = sharedStore();
  const snapshot = useSyncExternalStore(current.subscribe, current.getSnapshot, current.getSnapshot);
  return { ...snapshot, updateSettings: current.updateSettings, toggleFavorite: current.toggleFavorite, setStamp: current.setStamp, resetStamps: current.resetStamps, setTeacherMode: current.setTeacherMode };
}
