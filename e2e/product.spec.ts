import { test, expect } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
const output = resolve('docs/full-implementation');
test.use({ trace: 'off' });
const browserEvents = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const events: string[] = []; browserEvents.set(page, events);
  page.on('pageerror', error => events.push(`script: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') events.push(`console: ${message.text()} ${message.location().url}`); });
  page.on('requestfailed', request => events.push(`request: ${request.url()} ${request.failure()?.errorText}`));
});
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) await writeFile(resolve(output, `failure-${info.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 65)}.json`), JSON.stringify({ url: page.url(), events: browserEvents.get(page), body: await page.locator('body').innerText().catch(() => '') }, null, 2));
});
function webmTrackTypes(bytes: Buffer): number[] {
  const tracks: number[] = [];
  function vint(offset: number, id: boolean) {
    const first = bytes[offset]; let length = 1; while (length <= 8 && !(first & (0x80 >> (length - 1)))) length++;
    if (length > 8 || offset + length > bytes.length) throw new Error('Invalid WebM element');
    let value = id ? first : first & (0xff >> length); for (let i = 1; i < length; i++) value = value * 256 + bytes[offset + i];
    return { value, length };
  }
  function walk(start: number, end: number, track = false) {
    for (let offset = start; offset < end;) {
      const id = vint(offset, true), size = vint(offset + id.length, false), body = offset + id.length + size.length, stop = Math.min(end, body + size.value);
      if (track && id.value === 0x83) { let type = 0; for (let i = body; i < stop; i++) type = type * 256 + bytes[i]; tracks.push(type); }
      if ([0x18538067, 0x1654ae6b, 0xae].includes(id.value)) walk(body, stop, id.value === 0xae);
      if (stop <= offset) throw new Error('Invalid WebM size'); offset = stop;
    }
  }
  walk(0, bytes.length); return tracks;
}
test.beforeAll(async () => { await mkdir(output, { recursive: true }); });

test('69 lessons, search, stamps, learning tabs, URL settings and browser history', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/'); await expect(page.locator('.module-card')).toHaveCount(7); await expect(page.locator('.lesson-tile')).toHaveCount(69);
  await page.screenshot({ path: resolve(output, 'home.png') });
  await page.locator('input[type=search]').fill('W-11'); await expect(page.locator('.lesson-tile')).toHaveCount(1); await page.locator('.lesson-tile .tile-open').click();
  await expect(page.locator('.lesson-player canvas')).toBeVisible(); await expect(page.getByRole('button', { name: '▶ 再生する', exact: true })).toBeEnabled();
  await page.getByRole('tab', { name: /ためしてみよう/ }).click(); await expect(page.locator('.safety-note')).toBeVisible();
  await page.locator('.try-list input').first().check(); await page.getByRole('tab', { name: /気づいたかな/ }).click(); await expect(page.locator('.notice-list')).toBeVisible();
  await page.getByRole('button', { name: /やってみた/ }).click(); await expect(page.getByRole('button', { name: /やってみた/ })).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(page.getByRole('button', { name: /やってみた/ })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/?set=W-05,W-11,W-05,bad&lesson=W-11&mode=teacher&kiki=left');
  await expect(page.locator('.set-playlist')).toContainText('2 / 2'); await expect(page.locator('.teacher-memo')).toBeVisible(); await expect(page.locator('.lesson-player')).toHaveClass(/teacher-player/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('enotane_v1')!)); expect(saved.settings.kiki).toBe('right'); expect(saved.stamps['W-11'].stamp).toBe('tried');
  await page.goto('/?lesson=invalid'); await expect(page.locator('.module-card')).toHaveCount(7); await expect(page.getByText('この教材は見つかりませんでした。ホームからえらんでね。')).toBeVisible();
  await page.goBack(); await expect(page.locator('.teacher-memo')).toBeVisible();
  expect(errors).toEqual([]); await writeFile(resolve(output, 'ui-errors.json'), JSON.stringify(errors));
});

test('labs, teacher set order and A4 cards plus worksheet', async ({ page }) => {
  await page.goto('/?view=labs'); await expect(page.getByRole('tab', { name: '色まぜ', exact: true })).toBeVisible();
  await page.locator('.lab-controls input[type=range]').nth(0).press('Home'); await page.locator('.lab-controls input[type=range]').nth(1).press('Home'); await expect(page.getByText('どれかの色の量を1以上にしてみよう。')).toBeVisible();
  await page.getByRole('tab', { name: '色まぜ', exact: true }).press('ArrowRight'); await expect(page.getByRole('tab', { name: '水の量', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: '構図', exact: true }).click(); await page.screenshot({ path: resolve(output, 'composition-lab.png'), fullPage: true });
  await page.goto('/?view=teacher&mode=teacher'); await page.locator('.feature-panel').getByRole('combobox').first().selectOption('P-02'); await page.locator('.feature-panel').getByRole('combobox').first().selectOption('W-11'); await page.locator('.feature-panel').getByRole('combobox').first().selectOption('C-09'); await page.locator('.feature-panel').getByRole('combobox').first().selectOption('P-03');
  await page.getByRole('button', { name: 'W-11を前へ', exact: true }).click(); await page.getByRole('button', { name: '授業セットのURLを作る', exact: true }).click();
  await expect(page.getByLabel('授業セットのURL', { exact: true })).toHaveValue(/set=W-11%2CP-02%2CC-09%2CP-03/);
  await page.getByRole('button', { name: '印刷プレビュー', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'A4印刷プレビュー' })).toBeVisible(); await expect(page.locator('.print-card')).toHaveCount(4);
  const pageSize = await page.locator('.print-page').evaluate(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, scroll: element.scrollHeight, client: element.clientHeight }));
  expect(pageSize.width).toBeCloseTo(793.7, 0); expect(pageSize.height).toBeCloseTo(1122.5, 0); expect(pageSize.scroll).toBeLessThanOrEqual(pageSize.client);
  await page.setViewportSize({ width: 1440, height: 1600 }); await page.locator('.print-page').screenshot({ path: resolve(output, 'a4-cards.png') }); await page.getByLabel('用紙').selectOption('sheet'); await expect(page.locator('.worksheet-box')).toHaveCount(12); await page.locator('.print-page').first().screenshot({ path: resolve(output, 'a4-worksheet.png') });
  await page.getByRole('button', { name: 'とじる', exact: true }).click(); await expect(page.locator('#enotane-print')).toHaveCount(0);
});

test('all 69 actual Canvas animations and original 3 regression checks', async ({ page }) => {
  test.setTimeout(1200000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/dev.html'); await page.locator('.full-verification > summary').click(); await page.getByRole('button', { name: '全69レッスンを検証', exact: true }).click();
  await expect(page.locator('.all-results li')).toHaveCount(69, { timeout: 1140000 }); await expect(page.locator('.all-results li[data-ok=false]')).toHaveCount(0);
  await writeFile(resolve(output, 'all-69-canvas.txt'), (await page.locator('.all-results li').allTextContents()).join('\n'));
  await page.locator('.diagnostics:not(.full-verification) > summary').click(); await page.getByRole('button', { name: '動き・描画を検証', exact: true }).click(); await expect(page.getByText('確認が終わりました。', { exact: true })).toBeVisible({ timeout: 120000 });
  await expect(page.locator('.test-results li')).toHaveCount(10); await expect(page.locator('.test-results')).not.toContainText('要確認'); await writeFile(resolve(output, 'original-3-regression.txt'), await page.locator('.test-results').innerText());
  expect(errors).toEqual([]); await writeFile(resolve(output, 'canvas-errors.json'), JSON.stringify(errors));
  await page.locator('#tool-gallery').screenshot({ path: resolve(output, 'tools.png') });
});

test('lesson mid-frame, left-handed mirror and 360px responsive layout', async ({ page }) => {
  for (const [id, step, time] of [['P-02', 1, 1700], ['W-11', 1, 2000]] as const) {
    await page.goto(`/?lesson=${id}`); await expect(page.getByRole('button', { name: '▶ 再生する', exact: true })).toBeEnabled(); await page.locator('.step-list button').nth(step).click(); await page.getByRole('button', { name: 'もう一回', exact: true }).click(); await page.waitForTimeout(time); await page.getByRole('button', { name: 'Ⅱ 一時停止', exact: true }).click(); await page.screenshot({ path: resolve(output, `${id}-mid.png`), fullPage: true });
  }
  await page.goto('/?lesson=P-03'); await expect(page.getByRole('button', { name: '▶ 再生する', exact: true })).toBeEnabled(); await page.getByRole('button', { name: '▶ 再生する', exact: true }).click(); await page.waitForTimeout(1500); await page.getByRole('button', { name: 'Ⅱ 一時停止', exact: true }).click(); await page.screenshot({ path: resolve(output, 'P-03-mid.png'), fullPage: true });
  await page.goto('/?lesson=C-10'); await expect(page.getByRole('button', { name: '▶ 再生する', exact: true })).toBeEnabled(); await page.getByRole('button', { name: 'もう一回', exact: true }).click(); await page.waitForTimeout(3500); await page.getByRole('button', { name: 'Ⅱ 一時停止', exact: true }).click(); await page.screenshot({ path: resolve(output, 'C-10-mid.png'), fullPage: true });
  await page.goto('/?lesson=W-07&kiki=left'); await expect(page.getByRole('button', { name: '▶ 再生する', exact: true })).toBeEnabled(); await page.screenshot({ path: resolve(output, 'W-07-left.png'), fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 }); await page.goto('/?lesson=W-11'); await expect(page.locator('.lesson-player')).toBeVisible();
  const size = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth })); expect(size.scrollWidth).toBeLessThanOrEqual(size.width + 1); await page.screenshot({ path: resolve(output, 'mobile-360.png'), fullPage: true });
});

test('PNG and playable silent video exports', async ({ page }) => {
  test.setTimeout(120000); await page.goto('/?lesson=P-02'); await expect(page.getByRole('button', { name: '▶ 再生する', exact: true })).toBeEnabled(); await page.getByText('画像・動画を保存', { exact: true }).click();
  const pngEvent = page.waitForEvent('download'); await page.getByRole('button', { name: '今の絵をPNGで保存', exact: true }).click(); const png = await pngEvent; await png.saveAs(resolve(output, 'export-P-02.png'));
  const downloadEvent = page.waitForEvent('download', { timeout: 90000 }); await page.getByRole('button', { name: 'レッスンを動画で保存', exact: true }).click(); const video = await downloadEvent; const path = resolve(output, video.suggestedFilename()); await video.saveAs(path); expect((await readFile(path)).byteLength).toBeGreaterThan(1000);
  await expect(page.getByText('動画を作りました。音声は含みません。', { exact: true })).toBeVisible();
  const videoURL = `data:video/webm;base64,${(await readFile(path)).toString('base64')}`;
  const playback = await page.evaluate(async source => {
    const video = document.createElement('video'); video.src = source; video.muted = true; document.body.append(video);
    await new Promise<void>((resolve, reject) => { video.onloadeddata = () => resolve(); video.onerror = () => reject(new Error('Saved video cannot play')); });
    await video.play(); await new Promise(resolve => setTimeout(resolve, 500)); video.pause();
    const result = { width: video.videoWidth, height: video.videoHeight, time: video.currentTime, audioTracks: (video as HTMLVideoElement & { audioTracks?: { length: number } }).audioTracks?.length ?? 0 }; video.remove(); return result;
  }, videoURL);
  expect(playback.width).toBe(1000); expect(playback.height).toBe(715); expect(playback.time).toBeGreaterThan(0); expect(playback.audioTracks).toBe(0);
  await writeFile(resolve(output, 'video-playback.json'), JSON.stringify(playback));
  expect(webmTrackTypes(await readFile(path))).toEqual([1]);
});

test('production offline saved lesson, missing lesson, challenges and explicit removal', async ({ page, context }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5187/?lesson=W-11'); await expect(page.getByRole('button', { name: '▶ 再生する', exact: true })).toBeEnabled();
  await page.getByText('オフラインで使う', { exact: true }).click();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.getByRole('button', { name: 'この教材をオフライン用に保存', exact: true }).click();
  await expect(page.getByText('この教材をオフライン用に保存しました。', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole('button', { name: '▶ 再生する', exact: true })).toBeEnabled();
  await context.setOffline(true); await page.reload(); await expect(page.getByRole('button', { name: '▶ 再生する', exact: true })).toBeEnabled(); await page.screenshot({ path: resolve(output, 'offline-W-11.png') });
  await page.goto('http://127.0.0.1:5187/?view=challenges'); await expect(page.locator('.challenge-card')).toHaveCount(6);
  expect(await page.locator('.challenge-card img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.goto('http://127.0.0.1:5187/?lesson=P-02'); await expect(page.getByText('アニメーションを読み込めませんでした。通信を確かめて、もう一度ためしてね。', { exact: true })).toBeVisible();
  await context.setOffline(false); await page.goto('http://127.0.0.1:5187/?lesson=W-11'); await expect(page.getByRole('button', { name: '▶ 再生する', exact: true })).toBeEnabled();
  await page.getByText('オフラインで使う', { exact: true }).click(); await page.getByRole('button', { name: 'オフライン教材を削除', exact: true }).click(); await page.getByRole('button', { name: '教材キャッシュを削除する', exact: true }).click();
  await expect(page.getByText('このアプリのオフライン教材を削除しました。', { exact: true })).toBeVisible();
  await context.setOffline(true); await page.reload(); await expect(page.locator('.stage-message[role=alert]')).toBeVisible(); await context.setOffline(false);
  expect(errors).toEqual([]); await writeFile(resolve(output, 'offline-errors.json'), JSON.stringify(errors));
});
