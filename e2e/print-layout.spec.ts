import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('69教材すべてがA4の4枚カードとためし描きシートに欠けずに収まる', async ({ page, request }) => {
  const response = await request.get('/data/lessons.json');
  const catalog = await response.json() as { lessons: { id: string; safety: string[] }[] };
  await page.goto('/?view=teacher&mode=teacher');
  const add = page.getByLabel('レッスンを追加');
  await expect(add).toBeVisible();
  for (const lesson of catalog.lessons) await add.selectOption(lesson.id);
  await page.getByRole('button', { name: '印刷プレビュー', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'A4印刷プレビュー' });
  await expect(dialog).toHaveAttribute('data-layout-ready', 'true');
  await expect(dialog.getByRole('button', { name: '印刷する', exact: true })).toBeEnabled();
  const cards = dialog.locator('.print-card[data-lesson-id]');
  await expect(cards).toHaveCount(69);
  const measurements = await cards.evaluateAll(elements => elements.map(element => {
    const card = element as HTMLElement;
    return { id: card.dataset.lessonId, font: Number(card.dataset.fontSize), overflowY: card.scrollHeight - card.clientHeight, overflowX: card.scrollWidth - card.clientWidth };
  }));
  expect(measurements.filter(card => card.overflowY > 1 || card.overflowX > 1)).toEqual([]);
  expect(measurements.every(card => card.font >= 8.5)).toBe(true);
  const pages = dialog.locator('.print-page');
  await expect(pages).toHaveCount(18);
  for (const grid of await dialog.locator('.print-card-grid').all()) await expect(grid.locator('.print-card')).toHaveCount(4);
  const paper = await pages.first().boundingBox();
  expect(paper?.width).toBeCloseTo(210 * 96 / 25.4, 0);
  expect(paper?.height).toBeCloseTo(297 * 96 / 25.4, 0);
  for (const lesson of catalog.lessons) {
    const card = dialog.locator(`.print-card[data-lesson-id="${lesson.id}"]`);
    for (const safety of lesson.safety) await expect(card).toContainText(safety.replace(/\{([^{}|]+)\|[^{}|]+\}/gu, '$1'));
  }
  await mkdir('docs/full-implementation', { recursive: true });
  await page.emulateMedia({ media: 'print' });
  await dialog.locator('.print-page:has([data-lesson-id="M-07"])').screenshot({ path: 'docs/full-implementation/print-longest-cards.png' });
  await page.emulateMedia({ media: 'screen' });
  await dialog.getByLabel('用紙').selectOption('sheet');
  await expect(dialog).toHaveAttribute('data-layout-ready', 'true');
  await expect(dialog.getByRole('button', { name: '印刷する', exact: true })).toBeEnabled();
  await expect(dialog.locator('.worksheet')).toHaveCount(69);
  expect(await dialog.locator('.worksheet').evaluateAll(elements => elements.filter(element => element.scrollHeight > element.clientHeight + 1).length)).toBe(0);
  await page.emulateMedia({ media: 'print' });
  await dialog.locator('.worksheet').first().screenshot({ path: 'docs/full-implementation/print-worksheet.png' });
});
