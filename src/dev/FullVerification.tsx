import { useState } from 'react';
import { parseScript } from '../engine/schema';
import { Renderer } from '../engine/stage';

interface Result { id: string; ok: boolean; message: string }
function hash(canvas: HTMLCanvasElement): string {
  const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  let value = 2166136261; for (let i = 0; i < pixels.length; i++) value = Math.imul(value ^ pixels[i], 16777619);
  return (value >>> 0).toString(16).padStart(8, '0');
}
export function FullVerification() {
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(''), [results, setResults] = useState<Result[]>([]);
  async function verify() {
    setBusy(true); setResults([]);
    const all: Result[] = [];
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/lessons.json`); if (!response.ok) throw new Error('教材一覧を読み込めません。');
      const catalog = await response.json() as { lessons: { id: string; anim: string }[] };
      if (catalog.lessons.length !== 69) throw new Error('教材一覧が69件ではありません。');
      for (let index = 0; index < catalog.lessons.length; index++) {
        const lesson = catalog.lessons[index]; setProgress(`${index + 1} / 69 · ${lesson.id}を確認中`);
        let renderer: Renderer | undefined;
        const target = document.createElement('canvas'); target.width = 1000; target.height = 625;
        try {
          const source = await fetch(`${import.meta.env.BASE_URL}data/${lesson.anim}`); if (!source.ok) throw new Error('台本を読み込めません。');
          const script = parseScript(await source.json()); if (script.id !== lesson.id) throw new Error('教材IDと台本IDが違います。');
          renderer = new Renderer(target, script); await renderer.ready;
          for (let step = 0; step < script.steps.length; step++) for (const time of [0, script.steps[step].durationMs / 2, script.steps[step].durationMs]) renderer.render(step, time, { left: false, still: false });
          const last = script.steps.length - 1, duration = script.steps[last].durationMs;
          renderer.renderTo(target, false); const first = hash(target);
          renderer.render(0, 0, { left: false, still: false }); renderer.render(last, duration, { left: false, still: false }); renderer.renderTo(target, false);
          const second = hash(target); if (first !== second) throw new Error(`戻る前後の画像が違います：${first} / ${second}`);
          const stats = renderer.getStats(); if (stats.snapshotBytes > 48 * 1024 * 1024 || stats.estimatedBytes > 128 * 1024 * 1024) throw new Error('画像キャッシュの予算を超えています。');
          renderer.render(last, duration, { left: true, still: true, showGuides: true });
          all.push({ id: lesson.id, ok: true, message: `${script.steps.length}ステップの開始・途中・終端、復元hash ${first}、左きき静止画。推定${(stats.estimatedBytes / 1024 / 1024).toFixed(1)}MiB` });
        } catch (error) { all.push({ id: lesson.id, ok: false, message: error instanceof Error ? error.message : String(error) }); }
        finally { renderer?.dispose(); target.width = 1; target.height = 1; }
        setResults([...all]); await new Promise(resolve => setTimeout(resolve, 0));
      }
      setProgress(`${all.filter(result => result.ok).length} / 69 合格`);
    } catch (error) { setProgress(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  return <details className="diagnostics full-verification"><summary>全69レッスンの描画確認</summary><p>開始・途中・終端を実際のCanvasで描き、戻った後の最終画像とメモリ予算を確認します。実物の画材や端末の実測とは別の検証です。</p><button disabled={busy} onClick={verify}>{busy ? '全教材を確認中…' : '全69レッスンを検証'}</button><p role="status">{progress}</p><ul className="all-results">{results.map(result => <li key={result.id} data-ok={result.ok}>{result.ok ? '合格' : '不合格'} · {result.id} · {result.message}</li>)}</ul></details>;
}
