import { plainCaption } from '../engine/ruby';
import type { Lesson } from '../content/types';

export function matchesLessonQuery(lesson: Pick<Lesson, 'title' | 'goal' | 'materials' | 'tags' | 'id'>, query: string): boolean {
  const value = query.trim().toLocaleLowerCase();
  if (!value) return true;
  const text = [lesson.title, lesson.goal, ...lesson.materials, ...lesson.tags, lesson.id].join(' ');
  const reading = text.replace(/\{[^{}|]+\|([^{}|]+)\}/gu, '$1');
  return `${plainCaption(text)} ${reading}`.toLocaleLowerCase().includes(value);
}
