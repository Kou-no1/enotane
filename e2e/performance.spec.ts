import { test, expect } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
test.use({ trace: 'off', screenshot: 'off' });

test('records desktop frame intervals without substituting for a physical iPad check', async ({ page }) => {
  await page.goto('/?lesson=P-02');
  await expect(page.getByRole('button', { name: '▶ 再生する', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '▶ 再生する', exact: true }).click();
  const sample = await page.evaluate(async () => {
    const times: number[] = []; let previous = 0;
    await new Promise<void>(resolve => {
      const tick = (now: number) => { if (previous) times.push(now - previous); previous = now; if (times.length < 120) requestAnimationFrame(tick); else resolve(); };
      requestAnimationFrame(tick);
    });
    const sorted = [...times].sort((a, b) => a - b), mean = times.reduce((sum, value) => sum + value, 0) / times.length;
    return { browser: navigator.userAgent, viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, samples: times.length, averageFps: 1000 / mean, p95FrameMs: sorted[Math.floor(sorted.length * .95)], diagnosticTracing: false, physicalDeviceVerified: false };
  });
  await mkdir(resolve('docs/full-implementation'), { recursive: true });
  await writeFile(resolve('docs/full-implementation/desktop-performance.json'), JSON.stringify(sample, null, 2));
  expect(Number.isFinite(sample.averageFps)).toBe(true);
});

test('records CPU 4x timing as a supplemental desktop measurement', async ({ page, context }) => {
  const session = await context.newCDPSession(page);
  try {
    await page.goto('/?lesson=P-02');
    await expect(page.getByRole('button', { name: '▶ 再生する', exact: true })).toBeEnabled();
    // Measure animation frames separately from throttled application startup.
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.getByRole('button', { name: '▶ 再生する', exact: true }).click();
    const sample = await page.evaluate(async () => {
      const times: number[] = []; let previous = 0;
      await new Promise<void>(resolve => {
        const tick = (now: number) => { if (previous) times.push(now - previous); previous = now; if (times.length < 120) requestAnimationFrame(tick); else resolve(); };
        requestAnimationFrame(tick);
      });
      const sorted = [...times].sort((a, b) => a - b);
      return { browser: navigator.userAgent, viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, samples: times.length, cpuThrottleRate: 4, averageFps: 1000 / (times.reduce((a, b) => a + b) / times.length), p95FrameMs: sorted[Math.floor(sorted.length * .95)], diagnosticTracing: false, physicalDeviceVerified: false };
    });
    await writeFile(resolve('docs/full-implementation/cpu-4x-performance.json'), JSON.stringify(sample, null, 2));
    expect(Number.isFinite(sample.averageFps)).toBe(true);
  } finally { await session.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await session.detach(); }
});

test('records original lesson checkpoint restore time and pixel memory budgets', async ({ page }) => {
  await page.goto('/dev.html');
  const measurements = await page.evaluate(async () => {
    const { Renderer } = await import(`${location.origin}/src/engine/stage.ts`);
    const { parseScript } = await import(`${location.origin}/src/engine/schema.ts`);
    const results = [];
    for (const id of ['P-02', 'C-09', 'W-11']) {
      const script = parseScript(await fetch(`/data/anim/${id}.json`).then(response => response.json()));
      const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 625;
      const renderer = new Renderer(canvas, script); await renderer.ready;
      try {
        const last = script.steps.length - 1, duration = script.steps[last].durationMs, start = performance.now();
        renderer.render(last, duration, { left: false, still: false });
        const firstFinishMs = performance.now() - start, samples = [];
        for (let i = 0; i < 10; i++) {
          renderer.render(0, 0, { left: false, still: false });
          const begin = performance.now(); renderer.render(last, duration, { left: false, still: false }); samples.push(performance.now() - begin);
        }
        const sorted = [...samples].sort((a, b) => a - b);
        results.push({ id, logicalResolution: [1000, 625], firstFinishMs, restoreSamplesMs: samples, restoreP95Ms: sorted[9], ...renderer.getStats() });
      } finally { renderer.dispose(); canvas.width = canvas.height = 1; }
    }
    return results;
  });
  await writeFile(resolve('docs/full-implementation/restore-performance.json'), JSON.stringify(measurements, null, 2));
  for (const result of measurements) { expect(result.snapshotBytes).toBeLessThanOrEqual(48 * 1024 * 1024); expect(result.estimatedBytes).toBeLessThanOrEqual(128 * 1024 * 1024); }
});
