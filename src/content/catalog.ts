import { MODULE_IDS } from './types.ts';
import type { Catalog, Challenge, Lesson, TeacherSet } from './types';
import { captionErrors } from '../engine/ruby.ts';
export type { Catalog, Challenge, ChallengeExample, Lesson, ModuleId, TeacherSet } from './types';

export const EXPECTED_LESSON_IDS = Object.entries({ P: 10, C: 12, W: 18, M: 7, K: 6, Z: 10, O: 6 }).flatMap(([prefix, count]) => Array.from({ length: count }, (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`));
const prefixes = ['P', 'C', 'W', 'M', 'K', 'Z', 'O'];
const levelMap: Record<string, readonly number[]> = { P:[1,1,1,2,2,2,2,3,3,2], C:[1,1,1,1,1,1,2,2,1,1,2,2], W:[2,2,2,2,2,2,2,2,2,2,2,2,3,3,2,3,3,3], M:[1,1,1,2,2,1,2], K:[1,3,2,3,2,1], Z:[1,1,2,3,2,2,3,3,3,3], O:[2,3,2,2,3,3] };
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const textList = (v: unknown, min = 1): v is string[] => Array.isArray(v) && v.length >= min && v.every(text);

/** Validate content before a route can expose it; unknown references are never silently dropped. */
export function validateCatalog(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value) || !Array.isArray(value.lessons) || !Array.isArray(value.challenges) || !Array.isArray(value.teacherSets)) return ['カタログの lessons/challenges/teacherSets 配列が必要です'];
  const ids = new Set<string>();
  for (const lesson of value.lessons) {
    if (!isRecord(lesson) || !text(lesson.id)) { errors.push('レッスンIDが必要です'); continue; }
    const id = lesson.id;
    if (ids.has(id)) errors.push(`${id}: ID重複`);
    ids.add(id);
    if (!EXPECTED_LESSON_IDS.includes(id)) errors.push(`${id}: 未知のID`);
    const index = prefixes.indexOf(id[0]);
    if (lesson.module !== MODULE_IDS[index] || lesson.order !== Number(id.slice(2))) errors.push(`${id}: module/orderがIDと一致しません`);
    if (typeof lesson.level !== 'number' || lesson.level !== levelMap[id[0]]?.[Number(id.slice(2))-1]) errors.push(`${id}: levelが内容マップと一致しません`);
    if (!Number.isInteger(lesson.activityMinutes) || Number(lesson.activityMinutes) < 1 || Number(lesson.activityMinutes) > 60) errors.push(`${id}: 実物で試す時間が不正です`);
    for (const key of ['title', 'goal', 'hint']) if (!text(lesson[key])) errors.push(`${id}.${key}: 文が必要です`);
    for (const key of ['materials', 'try', 'useIdeas', 'tags', 'safety']) if (!textList(lesson[key])) errors.push(`${id}.${key}: 空でない文の配列が必要です`);
    if (!textList(lesson.notice, 2) || lesson.notice.length > 3) errors.push(`${id}.notice: 問いは2〜3個です`);
    if (!textList(lesson.related, 1) || lesson.related.some(ref => !EXPECTED_LESSON_IDS.includes(ref) || ref === id) || new Set(lesson.related).size !== lesson.related.length) errors.push(`${id}.related: 関連IDが不正です`);
    if (lesson.anim !== `anim/${id}.json`) errors.push(`${id}: 台本の参照が違います`);
    if (!isRecord(lesson.teacherNote) || !['preparation', 'support', 'prompt'].every(key => text(lesson.teacherNote && isRecord(lesson.teacherNote) ? lesson.teacherNote[key] : undefined))) errors.push(`${id}: 先生メモが必要です`);
    if (!isRecord(lesson.review) || lesson.review.status !== 'unverified' || !text(lesson.review.conditions)) errors.push(`${id}: 実物の確認状況が必要です`);
    for (const key of ['title', 'goal', 'hint', 'materials', 'try', 'notice', 'useIdeas', 'safety']) {
      const field = lesson[key];
      for (const sentence of Array.isArray(field) ? field : [field]) if (typeof sentence === 'string') errors.push(...captionErrors(sentence).map(error => `${id}.${key}: ${error}`));
    }
  }
  if (ids.size !== 69 || EXPECTED_LESSON_IDS.some(id => !ids.has(id))) errors.push('指定された69レッスンが必要です');
  const challengeIds = new Set<string>();
  for (const c of value.challenges) {
    if (!isRecord(c) || !text(c.id)) { errors.push('チャレンジIDが必要です'); continue; }
    if (challengeIds.has(c.id)) errors.push(`${c.id}: チャレンジID重複`);
    challengeIds.add(c.id);
    if (!text(c.title) || !text(c.invitation) || !textList(c.materials) || !textList(c.safety)) errors.push(`${c.id}: チャレンジ本文が必要です`);
    if (!textList(c.lessons) || c.lessons.some(id => !ids.has(id)) || new Set(c.lessons).size !== c.lessons.length) errors.push(`${c.id}: 参照するレッスンが不正です`);
    if (!Array.isArray(c.examples) || c.examples.length < 3) { errors.push(`${c.id}: 異なる作例は3つ以上必要です`); continue; }
    const examples = new Set<string>();
    for (const e of c.examples) {
      if (!isRecord(e) || !['id', 'title', 'image', 'motif', 'layout', 'description'].every(key => text(e[key])) || !textList(e.colors) || !textList(e.techniques)) { errors.push(`${c.id}: 作例データが不正です`); continue; }
      if (examples.has(String(e.id))) errors.push(`${c.id}: 作例ID重複`);
      examples.add(String(e.id));
      if (!/^assets\/challenges\/[a-z0-9-]+\.svg$/u.test(String(e.image))) errors.push(`${c.id}: 作例画像の参照が不正です`);
    }
    if (new Set(c.examples.map(e => isRecord(e) ? `${e.motif}|${e.layout}|${String(e.techniques)}` : '')).size < 3) errors.push(`${c.id}: 色だけを替えた作例は使いません`);
  }
  if (challengeIds.size !== 6) errors.push('作品チャレンジは6件です');
  const setIds = new Set<string>();
  for (const s of value.teacherSets) {
    if (!isRecord(s) || !text(s.id) || !text(s.title) || !text(s.prompt) || !textList(s.lessons) || s.lessons.some(id => !ids.has(id))) { errors.push('先生用逆引きの本文・参照が不正です'); continue; }
    if (setIds.has(s.id) || new Set(s.lessons).size !== s.lessons.length) errors.push(`${s.id}: 逆引きIDまたは参照ID重複`);
    setIds.add(s.id);
  }
  if (setIds.size !== 7) errors.push('先生用逆引きは7件です');
  return errors;
}

export async function readCatalog(base = import.meta.env.BASE_URL): Promise<Catalog> {
  const get = async (file: string) => {
    const response = await fetch(`${base}data/${file}`);
    if (!response.ok) throw new Error('教材を読みこめませんでした。もう一度ためしてください。');
    const data: unknown = await response.json();
    if (!isRecord(data) || data.schemaVersion !== 1) throw new Error('教材の版が対応していません。');
    return data;
  };
  const [lessons, challenges, sets] = await Promise.all([get('lessons.json'), get('challenges.json'), get('teacher-index.json')]);
  const catalog: unknown = { lessons: lessons.lessons, challenges: challenges.challenges, teacherSets: sets.teacherSets };
  const errors = validateCatalog(catalog);
  if (errors.length) throw new Error(`教材データを確認してください。\n${errors.join('\n')}`);
  return catalog as { lessons: Lesson[]; challenges: Challenge[]; teacherSets: TeacherSet[] };
}

export const loadCatalog = readCatalog;
