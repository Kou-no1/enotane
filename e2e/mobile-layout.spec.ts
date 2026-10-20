import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('360〜1024pxと文字200%でも教材・設定・先生・比較画面が横にはみ出さない', async ({ page }) => {
  test.setTimeout(300000);
  await mkdir('docs/full-implementation', { recursive: true });
  const measurements: unknown[] = [];
  const failures: unknown[] = [];
  const widths = [360, 390, 480, 640, 768, 1024];
  for (const path of ['/?lesson=W-11', '/?view=settings', '/?view=teacher&mode=teacher', '/?view=compare']) {
    await page.goto(path);
    if (path.includes('lesson=') || path.includes('compare')) await expect(page.locator('.lesson-player').first()).toBeVisible();
    else await expect(page.locator('h1')).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const result = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        return {
          width, scrollWidth: document.documentElement.scrollWidth,
          outside: [...document.querySelectorAll('body *')].map(element => {
            const box = element.getBoundingClientRect();
            return { tag: element.tagName, classes: element.className, x: box.x, right: box.right, width: box.width };
          }).filter(box => box.width && (box.x < -1 || box.right > width + 1)),
        };
      });
      measurements.push({ path, text: '100%', ...result });
      if (result.scrollWidth > width + 1) failures.push({ path, text: '100%', ...result });
    }
    await page.setViewportSize({ width: 360, height: 900 });
    await page.evaluate(() => {
      // Double the measured font of every element, including captions, controls and ruby.
      // Collect before applying so nested text is scaled once, as with text-size enlargement.
      const fonts = [...document.querySelectorAll<HTMLElement>('body *')].map(element => [element, parseFloat(getComputedStyle(element).fontSize)] as const);
      for (const [element, size] of fonts) element.style.setProperty('font-size', `${size * 2}px`, 'important');
    });
    const enlarged = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
      outside: [...document.querySelectorAll('body *')].map(element => { const box = element.getBoundingClientRect(); return { tag: element.tagName, classes: element.className, x: box.x, right: box.right, width: box.width }; }).filter(box => box.width && (box.x < -1 || box.right > document.documentElement.clientWidth + 1)) }));
    measurements.push({ path, text: '200%', ...enlarged });
    if (enlarged.scrollWidth > enlarged.width + 1) failures.push({ path, text: '200%', ...enlarged });
    if (path.includes('lesson=')) await page.screenshot({ path: 'docs/full-implementation/mobile-360-text-200.png', fullPage: true });
  }
  await writeFile('docs/full-implementation/mobile-layout.json', JSON.stringify(measurements, null, 2));
  expect(failures).toEqual([]);
});
