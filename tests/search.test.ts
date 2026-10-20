import { expect, it } from 'vitest';
import { matchesLessonQuery } from '../src/app/search';
it('finds a lesson by kanji, reading, material, tag and case-insensitive ID', () => {
  const lesson = { id: 'O-05', title: '{顔|かお}のかきかた', goal: '{位置|いち}をくらべる', materials: ['{鉛筆|えんぴつ}'], tags: ['観察'] };
  for (const query of ['顔', 'かお', 'えんぴつ', '観察', ' o-05 ', '']) expect(matchesLessonQuery(lesson, query)).toBe(true);
  expect(matchesLessonQuery(lesson, 'not-a-lesson')).toBe(false);
});
