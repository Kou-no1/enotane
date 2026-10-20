import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Settings } from '../store/progress';
import type { Lesson } from '../content/types';
import type { PaintColor, Script } from '../engine/types';
import type { Player } from '../engine/player';
import { Renderer } from '../engine/stage';
import { COLORS } from '../engine/textures';
import { plainCaption } from '../engine/ruby';
import { mixPaint } from '../engine/mixing';
import './features.css';

const palette: { id: PaintColor; name: string }[] = [
  { id: 'shiro', name: 'しろ' }, { id: 'kiiro', name: 'きいろ' }, { id: 'daidai', name: 'だいだい' },
  { id: 'aka', name: 'あか' }, { id: 'momo', name: 'ももいろ' }, { id: 'kimidori', name: 'きみどり' },
  { id: 'midori', name: 'みどり' }, { id: 'mizu', name: 'みずいろ' }, { id: 'ao', name: 'あお' },
  { id: 'murasaki', name: 'むらさき' }, { id: 'chairo', name: 'ちゃいろ' }, { id: 'kuro', name: 'くろ' },
];
const nameOf = (id: PaintColor) => palette.find(color => color.id === id)!.name;
const clean = (text: string) => plainCaption(text);
function ColorSelect({ value, onChange, label }: { value: PaintColor; onChange: (value: PaintColor) => void; label: string }) {
  return <label>{label}<select value={value} onChange={event => onChange(event.target.value as PaintColor)}>{palette.map(color => <option value={color.id} key={color.id}>{color.name}</option>)}</select></label>;
}
export function Labs({ settings }: { settings: Settings }) {
  const [tab, setTab] = useState('mix');
  const [colors, setColors] = useState<PaintColor[]>(['aka', 'kiiro', 'ao']);
  const [amounts, setAmounts] = useState([1, 1, 0]);
  const [water, setWater] = useState(.5);
  const [white, setWhite] = useState(.25);
  const [position, setPosition] = useState({ x: 50, y: 55, size: 36, grid: true, portrait: false, overlap: 'front' });
  const canvas = useRef<HTMLCanvasElement>(null);
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  const mixed = total ? mixPaint(colors, amounts) : null;
  const withWhite = total ? mixPaint([...colors, 'shiro'], [...amounts, total * white]) : null;
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  function place(event: React.PointerEvent<HTMLCanvasElement>) {
    if (tab !== 'composition') return;
    const box = event.currentTarget.getBoundingClientRect();
    const paper = position.portrait ? { x: 220, y: 16, w: 200, h: 304 } : { x: 100, y: 38, w: 440, h: 260 };
    setPosition(previous => ({ ...previous, x: clamp(((event.clientX - box.left) * 640 / box.width - paper.x) / paper.w * 100), y: clamp(((event.clientY - box.top) * 336 / box.height - paper.y) / paper.h * 100) }));
  }
  useEffect(() => {
    const target = canvas.current, ctx = target?.getContext('2d'); if (!target || !ctx) return;
    const w = target.width, h = target.height; ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#FBF8F1'; ctx.fillRect(0, 0, w, h);
    if (tab === 'mix') {
      const swatches = [mixed, withWhite, mixed]; const labels = ['まぜた色', 'しろを足す', '水でうすめる'];
      swatches.forEach((color, index) => { const x = 110 + index * 190; ctx.save(); if (index === 2) ctx.globalAlpha = 1 - water * .82; ctx.fillStyle = color ?? '#E5E7EB'; ctx.fillRect(x - 65, 70, 130, 170); ctx.restore(); ctx.strokeStyle = '#4B5563'; ctx.lineWidth = 2; ctx.strokeRect(x - 65, 70, 130, 170); ctx.font = '18px sans-serif'; ctx.fillStyle = '#334A3D'; ctx.textAlign = 'center'; ctx.fillText(labels[index], x, 280); });
    } else if (tab === 'water') {
      for (let i = 0; i < 3; i++) { ctx.save(); ctx.globalAlpha = 1 - water * .7; ctx.fillStyle = COLORS.ao; ctx.beginPath(); ctx.roundRect(80 + i * 190, 65, 95 + water * 45, 125 + water * 20, 8); ctx.fill(); ctx.restore(); ctx.fillStyle = '#334A3D'; ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(['線', '面', 'ぬれた所'][i], 130 + i * 190, 240); if (i === 0) { ctx.save(); ctx.globalAlpha = 1 - water * .7; ctx.strokeStyle = COLORS.ao; ctx.lineWidth = 4 + water * 12; ctx.beginPath(); ctx.moveTo(80, 290); ctx.lineTo(210, 290); ctx.stroke(); ctx.restore(); } if (i === 2) { ctx.setLineDash([6, 6]); ctx.strokeStyle = '#608896'; ctx.lineWidth = 2; ctx.strokeRect(452, 48, 155, 162); ctx.setLineDash([]); } }
    } else {
      const paper = position.portrait ? { x: 220, y: 16, w: 200, h: 304 } : { x: 100, y: 38, w: 440, h: 260 };
      ctx.strokeStyle = '#4B5563'; ctx.lineWidth = 2; ctx.strokeRect(paper.x, paper.y, paper.w, paper.h);
      ctx.save(); ctx.beginPath(); ctx.rect(paper.x, paper.y, paper.w, paper.h); ctx.clip();
      if (position.grid) { ctx.setLineDash([5, 5]); ctx.strokeStyle = '#8C9C93'; ctx.lineWidth = 1; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(paper.x + paper.w * i / 3, paper.y); ctx.lineTo(paper.x + paper.w * i / 3, paper.y + paper.h); ctx.moveTo(paper.x, paper.y + paper.h * i / 3); ctx.lineTo(paper.x + paper.w, paper.y + paper.h * i / 3); ctx.stroke(); } ctx.setLineDash([]); }
      const circle = () => { ctx.fillStyle = '#E99B7F'; ctx.beginPath(); ctx.arc(paper.x + paper.w * position.x / 100, paper.y + paper.h * position.y / 100, paper.w * position.size / 250, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#734F46'; ctx.stroke(); };
      const hill = () => { ctx.fillStyle = '#A7BD9C'; ctx.beginPath(); ctx.ellipse(paper.x + paper.w * .68, paper.y + paper.h * .84, paper.w * .43, paper.h * .34, 0, 0, Math.PI * 2); ctx.fill(); };
      if (position.overlap === 'front') { hill(); circle(); } else { circle(); hill(); } ctx.restore();
    }
  }, [tab, mixed, withWhite, water, position]);
  return <section className="feature-panel"><h1>ためすラボ</h1><p>変わり方を見つけたら、本物の紙と画材でもためしてみよう。点数はつけません。</p><div role="tablist" aria-label="ラボをえらぶ" className="feature-tabs">{[['mix', '色まぜ'], ['water', '水の量'], ['composition', '構図']].map(([id, label], index) => <button role="tab" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} aria-controls={`lab-${id}`} id={`tab-${id}`} key={id} onClick={() => setTab(id)} onKeyDown={event => { const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1; if (next >= 0) { event.preventDefault(); setTab(['mix', 'water', 'composition'][next]); (event.currentTarget.parentElement?.children[next] as HTMLButtonElement).focus(); } }}>{label}</button>)}</div><div role="tabpanel" id={`lab-${tab}`} aria-labelledby={`tab-${tab}`}>
    {tab === 'mix' && <><div className="lab-controls">{colors.map((color, index) => <div key={index}><ColorSelect value={color} label={`${index + 1}つめの色`} onChange={value => setColors(colors.map((item, i) => i === index ? value : item))} /><label>{nameOf(color)}の量 {amounts[index]}<input type="range" min="0" max="5" step="1" value={amounts[index]} onChange={event => setAmounts(amounts.map((item, i) => i === index ? Number(event.target.value) : item))} /></label></div>)}</div><label>しろを足す量 {Math.round(white * 100)}%<input type="range" min="0" max="1" step="0.05" value={white} onChange={event => setWhite(Number(event.target.value))} /></label><label>水でうすめる量 {Math.round(water * 100)}%<input type="range" min="0" max="1" step="0.05" value={water} onChange={event => setWater(Number(event.target.value))} /></label><p role="status">{total ? `${colors.filter((_, i) => amounts[i] > 0).map(nameOf).join(' と ')}をまぜた色。` : 'どれかの色の量を1以上にしてみよう。'}</p><p>色の変化のめやすです。白は色材を足す操作、水は白い紙が透ける操作です。実物の絵の具・紙では変わり方がちがいます。</p></>}
    {tab === 'water' && <><label>水の量 {Math.round(water * 100)}%<input type="range" min="0" max="1" step="0.05" value={water} onChange={event => setWater(Number(event.target.value))} /></label><p>{water < .3 ? 'ヨーグルト' : water < .6 ? '牛乳' : water < .9 ? 'ジュース' : '水'}のような濃さのイメージ。食べ物を使ったり、飲んだりはしません。</p><p>線・面・ぬれた所をくらべよう。線の広がりや透け方は、絵の具・紙・筆でも変わります。</p></>}
    {tab === 'composition' && <div className="lab-controls">{[['x', '横の位置'], ['y', 'たての位置'], ['size', '大きさ']].map(([key, label]) => <label key={key}>{label}<input type="range" min={key === 'size' ? 10 : 0} max={key === 'size' ? 80 : 100} value={position[key as 'x' | 'y' | 'size']} onChange={event => setPosition({ ...position, [key]: Number(event.target.value) })} /></label>)}<label>重なり<select value={position.overlap} onChange={event => setPosition({ ...position, overlap: event.target.value })}><option value="front">丸を前に</option><option value="back">丸を後ろに</option></select></label><label><input type="checkbox" checked={position.portrait} onChange={event => setPosition({ ...position, portrait: event.target.checked })} />たての紙</label><label><input type="checkbox" checked={position.grid} onChange={event => setPosition({ ...position, grid: event.target.checked })} />三分割の線</label><p>どこを見てほしい？ 位置や大きさをえらんでみよう。</p></div>}
    {tab === 'composition' && <div className="feature-actions" aria-label="丸の位置をボタンで変える">{[['左へ', -5, 0], ['右へ', 5, 0], ['上へ', 0, -5], ['下へ', 0, 5]].map(([label, x, y]) => <button key={label} onClick={() => setPosition(previous => ({ ...previous, x: clamp(previous.x + Number(x)), y: clamp(previous.y + Number(y)) }))}>{label}</button>)}<button onClick={() => setPosition(previous => ({ ...previous, x: 50, y: 50 }))}>中央へ</button><button onClick={() => setPosition(previous => ({ ...previous, x: 100 / 3, y: 100 / 3 }))}>三分割の交点へ</button></div>}
    <canvas ref={canvas} width="640" height="336" role="img" style={{ touchAction: tab === 'composition' ? 'none' : 'auto' }} onPointerDown={event => { if (tab === 'composition') { event.currentTarget.setPointerCapture(event.pointerId); place(event); } }} onPointerMove={event => { if (event.buttons && event.currentTarget.hasPointerCapture(event.pointerId)) place(event); }} aria-label={tab === 'mix' ? 'まぜた色、白を足した色、水でうすめた色を左から並べる' : tab === 'water' ? '同じ青で、線・面・ぬれた所をくらべる' : '丸と丘の位置・大きさ・重なりをくらべる構図。丸はドラッグ、ボタン、スライダーで動かせます'} /><p className="feature-muted">{settings.ruby ? '操作はキーボードでも使えます。' : 'スライダーは矢印キーでも動かせます。'}</p>
  </div>{['mix', 'water', 'composition'].filter(id => id !== tab).map(id => <div key={id} id={`lab-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden />)}</section>;
}

function PrintPreview({ lessons, onClose }: { lessons: Lesson[]; onClose: () => void }) {
  const [kind, setKind] = useState<'cards' | 'sheet'>('cards');
  const [compactIds, setCompactIds] = useState<string[]>([]);
  const [layoutReady, setLayoutReady] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null, previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, []);
  useLayoutEffect(() => {
    if (!dialog.current) return;
    let doesOverflow = false;
    if (kind === 'cards') {
      const compact = new Set(compactIds), newlyCompact: string[] = [];
      for (const card of dialog.current.querySelectorAll<HTMLElement>('.print-card[data-lesson-id]')) {
        for (const font of [10, 9.5, 9, 8.5]) {
          card.style.setProperty('--card-font', `${font}pt`); card.dataset.fontSize = String(font);
          if (card.scrollHeight <= card.clientHeight + 1 && card.scrollWidth <= card.clientWidth + 1) break;
        }
        if (card.scrollHeight > card.clientHeight + 1 || card.scrollWidth > card.clientWidth + 1) {
          const id = card.dataset.lessonId!;
          if (!compact.has(id)) newlyCompact.push(id); else doesOverflow = true;
        }
      }
      if (newlyCompact.length) { setCompactIds([...compactIds, ...newlyCompact]); setLayoutReady(false); return; }
    } else {
      for (const page of dialog.current.querySelectorAll<HTMLElement>('.worksheet')) if (page.scrollHeight > page.clientHeight + 1) doesOverflow = true;
    }
    setOverflow(doesOverflow); setLayoutReady(true);
  }, [lessons, kind, compactIds]);
  const groups = Array.from({ length: Math.ceil(lessons.length / 4) }, (_, i) => lessons.slice(i * 4, i * 4 + 4));
  return createPortal(<div ref={dialog} id="enotane-print" className="print-preview" role="dialog" aria-modal="true" aria-label="A4印刷プレビュー" data-layout-ready={layoutReady} onKeyDown={event => {
    if (event.key === 'Escape') onClose();
    if (event.key === 'Tab') {
      const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select,summary') ?? [])];
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}><div className="print-toolbar"><button onClick={onClose}>とじる</button><label>用紙<select value={kind} onChange={event => { setLayoutReady(false); setKind(event.target.value as typeof kind); }}><option value="cards">技法カード・A4に4枚</option><option value="sheet">ためし描きシート・A4</option></select></label><button disabled={!layoutReady || overflow} onClick={() => window.print()}>印刷する</button><p>実寸・倍率100%で印刷。文字は8.5pt以上。白黒でも色名と見出しが読めます。</p>{overflow && <p role="alert">用紙に収まらない部分があります。印刷を止めています。用紙の種類を変えて確認してください。</p>}</div>
    {kind === 'cards' ? groups.map((group, index) => <section className="print-page" key={index}><header>えのたね · 技法カード <small>{index + 1} / {groups.length}</small></header><div className="print-card-grid">{Array.from({ length: 4 }, (_, i) => {
      const lesson = group[i], compact = lesson && compactIds.includes(lesson.id);
      return <article className="print-card" key={i} data-lesson-id={lesson?.id} data-card-content={compact ? 'compact' : 'full'}>{lesson ? <><small>{lesson.id} · {'★'.repeat(lesson.level)}</small><h2>{clean(lesson.title)}</h2>{!compact && <p>{clean(lesson.goal)}</p>}<h3>よういするもの</h3><p>{lesson.materials.map(clean).join('、')}</p><h3>ためしてみよう</h3>{compact ? <p>{lesson.try.map(clean).join(' → ')}</p> : <ol>{lesson.try.map((step, n) => <li key={n}>{clean(step)}</li>)}</ol>}<h3>気づいたかな</h3><p>{lesson.notice.map(clean).join('　')}</p><p className="print-safety">{lesson.safety.map(clean).join('　')}</p>{compact && <p className="print-continued">つづきは {lesson.id} のレッスンへ。全文はプレビューの下でも見られます。</p>}</> : <><h2>ためしたこと</h2><p>自由にメモしてみよう。</p></>}</article>;
    })}</div></section>) : lessons.map(lesson => <section className="print-page worksheet" key={lesson.id}><header>えのたね · ためし描き</header><h2>{lesson.id} {clean(lesson.title)}</h2><p>{clean(lesson.goal)}</p><p>ようい：{lesson.materials.map(clean).join('、')}</p>{['ためす', '変えてためす', '気づいたことを、絵やことばで'].map(label => <div className="worksheet-box" key={label}><h3>{label}</h3></div>)}<p>{lesson.notice.map(clean).join('　')}</p></section>)}
    <section className="print-source"><h2>教材の全文</h2><p>カードで省略した目標文も、ここで確認できます。手順・問い・準備物・安全の文は、カードにもすべて載せています。</p>{lessons.map(lesson => <details key={lesson.id}><summary>{lesson.id} {clean(lesson.title)}</summary><p>{clean(lesson.goal)}</p><h3>ようい</h3><p>{lesson.materials.map(clean).join('、')}</p><h3>ためす</h3><ol>{lesson.try.map((text, index) => <li key={index}>{clean(text)}</li>)}</ol><h3>気づいたかな</h3><ul>{lesson.notice.map((text, index) => <li key={index}>{clean(text)}</li>)}</ul><h3>安全</h3><p>{lesson.safety.map(clean).join('　')}</p></details>)}</section>
  </div>, document.body);
}
export function TeacherTools({ lessons, selectedIds, onLesson }: { lessons: Lesson[]; selectedIds: string[]; onLesson: (id: string) => void }) {
  const [ids, setIds] = useState<string[]>(selectedIds.filter(id => lessons.some(lesson => lesson.id === id)));
  const [link, setLink] = useState(''); const [print, setPrint] = useState(false); const [message, setMessage] = useState('');
  const selectionKey = selectedIds.join(',');
  useEffect(() => { setIds(selectedIds.filter(id => lessons.some(lesson => lesson.id === id))); setLink(''); }, [selectionKey]);
  const selected = ids.map(id => lessons.find(lesson => lesson.id === id)!).filter(Boolean);
  const reorder = (index: number, offset: number) => { const next = [...ids], target = index + offset; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setIds(next); setLink(''); };
  function createURL() { const url = new URL(window.location.href); url.hash = ''; url.search = ''; url.searchParams.set('mode', 'teacher'); url.searchParams.set('set', ids.join(',')); url.searchParams.set('lesson', ids[0]); setLink(url.href); }
  return <section className="feature-panel"><h2>授業セットと印刷</h2><p>レッスンをえらび、順番を変えてURLを作れます。名前やきろくはURLに入りません。</p><label>レッスンを追加<select value="" onChange={event => { if (event.target.value && !ids.includes(event.target.value)) setIds([...ids, event.target.value]); setLink(''); }}><option value="">えらんでください</option>{lessons.filter(lesson => !ids.includes(lesson.id)).map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.id} {clean(lesson.title)}</option>)}</select></label><ol className="teacher-set">{selected.map((lesson, index) => <li key={lesson.id}><button onClick={() => onLesson(lesson.id)}>{lesson.id} {clean(lesson.title)}</button><button disabled={index === 0} aria-label={`${lesson.id}を前へ`} onClick={() => reorder(index, -1)}>↑ 前へ</button><button disabled={index === ids.length - 1} aria-label={`${lesson.id}を後へ`} onClick={() => reorder(index, 1)}>↓ 後へ</button><button onClick={() => { setIds(ids.filter(id => id !== lesson.id)); setLink(''); }}>はずす</button></li>)}</ol><div className="feature-actions"><button disabled={!ids.length} onClick={createURL}>授業セットのURLを作る</button><button disabled={!ids.length} onClick={() => setPrint(true)}>印刷プレビュー</button></div>{link && <><label>授業セットのURL<input readOnly value={link} onFocus={event => event.target.select()} /></label><button onClick={async () => { try { await navigator.clipboard.writeText(link); setMessage('URLをコピーしました。'); } catch { setMessage('URLの欄を選んでコピーしてください。'); } }}>URLをコピー</button><a href={link}>この授業セットを開く</a></>}<p role="status">{message}</p>{print && <PrintPreview lessons={selected} onClose={() => setPrint(false)} />}</section>;
}

export function supportedVideoMime(): string | null {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null;
  return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(mime => MediaRecorder.isTypeSupported(mime)) ?? null;
}
function saveBlob(blob: Blob, name: string) { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
export async function recordLesson(script: Script, options: { left: boolean; includeTools: boolean; captions: boolean }, signal: AbortSignal, onProgress: (percent: number) => void): Promise<Blob> {
  const mime = supportedVideoMime();
  if (!mime) throw new Error('このブラウザでは動画保存を使えません。PNG保存を使ってください。');
  const art = document.createElement('canvas'); art.width = 1000; art.height = 625;
  const video = document.createElement('canvas'); video.width = 1000; video.height = options.captions ? 715 : 625;
  const ctx = video.getContext('2d');
  if (!ctx) throw new Error('動画の画像を作れません。');
  let renderer: Renderer | null = null;
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let raf = 0, frame = 0, settled = false;
  const chunks: Blob[] = [];
  const total = script.steps.reduce((sum, step) => sum + step.durationMs, 0);
  const abortError = () => new Error('動画保存を中止しました。');
  const asError = (error: unknown) => error instanceof Error ? error : new Error(String(error));
  let abort = () => {};
  let visibility = () => {};
  function cleanup() {
    cancelAnimationFrame(raf);
    signal.removeEventListener('abort', abort);
    document.removeEventListener('visibilitychange', visibility);
    stream?.getTracks().forEach(track => track.stop());
    renderer?.dispose();
    stream = null; renderer = null;
    art.width = art.height = video.width = video.height = 1;
  }
  function draw(time: number) {
    let index = 0, local = time;
    while (index < script.steps.length - 1 && local >= script.steps[index].durationMs) local -= script.steps[index++].durationMs;
    renderer!.render(index, local, { left: options.left, still: false });
    renderer!.renderTo(art, options.includeTools);
    ctx!.fillStyle = '#FBF8F1'; ctx!.fillRect(0, 0, video.width, video.height); ctx!.drawImage(art, 0, 0, 1000, 625);
    if (options.captions) { ctx!.fillStyle = '#334A3D'; ctx!.font = '28px sans-serif'; ctx!.textAlign = 'center'; ctx!.fillText(plainCaption(script.steps[index].caption, options.left), 500, 680, 950); }
  }
  try {
    renderer = new Renderer(art, script);
    await renderer.ready;
    if (signal.aborted) throw abortError();
    stream = video.captureStream(30);
    recorder = new MediaRecorder(stream, { mimeType: mime });
    draw(0);
  } catch (error) { cleanup(); throw asError(error); }
  const recording = recorder;
  return new Promise<Blob>((resolve, reject) => {
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      try { if (recording.state !== 'inactive') recording.stop(); } catch { /* Cleanup also stops every source track. */ }
      cleanup(); reject(error);
    };
    abort = () => fail(abortError());
    visibility = () => { if (document.hidden) fail(new Error('画面が切り替わったため、動画保存を中止しました。')); };
    signal.addEventListener('abort', abort, { once: true });
    document.addEventListener('visibilitychange', visibility);
    recording.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recording.onerror = () => fail(new Error('動画を保存できませんでした。PNG保存を使えます。'));
    recording.onstop = () => {
      if (settled) return;
      settled = true; cleanup();
      const blob = new Blob(chunks, { type: mime });
      if (blob.size) resolve(blob); else reject(new Error('動画のデータを作れませんでした。'));
    };
    if (signal.aborted) { abort(); return; }
    try { recording.start(1000); } catch (error) { fail(asError(error)); return; }
    const start = performance.now();
    let lastFrameAt: number | null = null;
    const tick = (timestamp: number) => {
      if (settled) return;
      const elapsed = Math.min(total, timestamp - start);
      try {
        if (elapsed >= frame * 1000 / 30) {
          draw(elapsed); frame = Math.floor(elapsed * 30 / 1000) + 1;
          onProgress(Math.floor(elapsed / total * 100));
        }
        if (elapsed >= total) {
          lastFrameAt ??= timestamp;
          // Allow captureStream to receive the finished image before stopping the encoder.
          if (timestamp - lastFrameAt >= 80) { recording.stop(); return; }
        }
        raf = requestAnimationFrame(tick);
      } catch (error) { fail(asError(error)); }
    };
    raf = requestAnimationFrame(tick);
  });
}
export function LessonExports({ renderer, script, player, left, caption }: { renderer: Renderer | null; script: Script | null; player: Player | null; left: boolean; ruby: boolean; caption: string }) {
  const [tools, setTools] = useState(false), [captions, setCaptions] = useState(true), [busy, setBusy] = useState(false), [message, setMessage] = useState(''); const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  async function video() { if (!script || busy) return; if (player?.getState().status === 'playing') player.playPause(); setBusy(true); setMessage('動画を作っています。画面を開いたままお待ちください。'); abort.current = new AbortController(); try { const blob = await recordLesson(script, { left, includeTools: tools, captions }, abort.current.signal, progress => setMessage(`動画を作っています ${progress}%`)); saveBlob(blob, `${script.id}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`); setMessage('動画を作りました。音声は含みません。'); } catch (error) { setMessage(error instanceof Error ? error.message : '動画を作れませんでした。'); } finally { setBusy(false); } }
  return <details className="feature-panel"><summary>画像・動画を保存</summary><p>保存はこの端末だけで行います。音声は含みません。</p><label><input type="checkbox" checked={tools} onChange={event => setTools(event.target.checked)} disabled={busy} />道具と図の説明を含める</label><button disabled={!renderer || busy} onClick={() => { if (renderer) { const data = renderer.exportPNG(tools); const link = document.createElement('a'); link.href = data; link.download = `${script?.id ?? 'enotane'}.png`; link.click(); setMessage('今の絵のPNGを作りました。'); } }}>今の絵をPNGで保存</button><label><input type="checkbox" checked={captions} onChange={event => setCaptions(event.target.checked)} disabled={busy} />動画に字幕を含める</label><p>動画は標準の速さで全ステップを保存します。形式：{supportedVideoMime()?.includes('mp4') ? 'MP4' : 'WebM'}。字幕は正しい向きで合成します。</p><button disabled={!script || busy || !supportedVideoMime()} onClick={video}>レッスンを動画で保存</button>{busy && <button onClick={() => abort.current?.abort()}>動画保存を中止</button>}{!supportedVideoMime() && <p>このブラウザでは動画保存を使えません。PCのChromeなどでおためしください。PNGは使えます。</p>}<p role="status">{message}</p><p className="feature-muted">今の字幕：{plainCaption(caption, left)}</p></details>;
}

let registration: Promise<ServiceWorkerRegistration | null> | undefined;
function worker() {
  return registration ??= (!import.meta.env.DEV && 'serviceWorker' in navigator ? (async () => {
    try {
      const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
      if (!reg.active) await new Promise<void>((resolve, reject) => {
        const installing = reg.installing ?? reg.waiting;
        const finish = () => { if (reg.active) { cleanup(); resolve(); } else if (installing?.state === 'redundant') { cleanup(); reject(new Error('Offline installation failed')); } };
        const cleanup = () => { clearTimeout(timer); installing?.removeEventListener('statechange', finish); };
        const timer = setTimeout(() => { cleanup(); reject(new Error('Offline installation timeout')); }, 30000);
        installing?.addEventListener('statechange', finish); finish();
      });
      return reg;
    } catch { registration = undefined; return null; }
  })() : Promise.resolve(null));
}
function workerMessage(reg: ServiceWorkerRegistration, message: object): Promise<{ ok: boolean; count?: number; error?: string }> { return new Promise(resolve => { const channel = new MessageChannel(), finish = (value: { ok: boolean; count?: number; error?: string }) => { clearTimeout(timer); channel.port1.close(); channel.port2.close(); resolve(value); }, timer = setTimeout(() => finish({ ok: false, error: '保存の応答を確認できませんでした。' }), 30000); channel.port1.onmessage = event => finish(event.data); const target = reg.active; if (target) target.postMessage(message, [channel.port2]); else finish({ ok: false, error: 'オフライン機能を準備しています。もう一度おためしください。' }); }); }
export function OfflinePanel({ lessonId }: { lessonId?: string }) {
  const [message, setMessage] = useState(''), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [remove, setRemove] = useState(false), [update, setUpdate] = useState(false);
  useEffect(() => { let live = true; worker().then(reg => { if (live) { setReady(Boolean(reg)); if (!reg) setMessage(import.meta.env.DEV ? 'オフライン保存はビルドした製品版で使えます。' : 'この環境ではオフライン保存を使えません。'); if (reg?.waiting) setUpdate(true); reg?.addEventListener('updatefound', () => { reg.installing?.addEventListener('statechange', () => { if (live && reg.waiting) setUpdate(true); }); }); } }); return () => { live = false; }; }, []);
  async function operation(kind: string) { if (busy) return; setBusy(true); const reg = await worker(); if (!reg) { setMessage('オフライン機能を使えません。接続を確認して、もう一度開いてください。'); setBusy(false); return; } const result = await workerMessage(reg, { type: kind, lessonId }); setMessage(result.ok ? kind === 'SAVE_LESSON' ? 'この教材をオフライン用に保存しました。' : 'このアプリのオフライン教材を削除しました。' : result.error ?? '保存できませんでした。接続を確認してください。'); setBusy(false); setRemove(false); }
  return <details className="feature-panel"><summary>オフラインで使う</summary><p>アプリ本体と保存した教材を、このブラウザで使えます。未保存の教材は、ネットにつないで開いてください。画像・動画・作品の外部送信はしません。</p>{lessonId && <button disabled={!ready || busy} onClick={() => operation('SAVE_LESSON')}>この教材をオフライン用に保存</button>}<button disabled={!ready || busy} onClick={() => setRemove(true)}>オフライン教材を削除</button>{remove && <div role="alert"><p>このアプリの教材キャッシュだけを削除します。スタンプと設定は残ります。</p><button onClick={() => operation('CLEAR_LESSONS')}>教材キャッシュを削除する</button><button onClick={() => setRemove(false)}>やめる</button></div>}{update && <><p>新しい版があります。保存中の作業を終えてから更新してください。</p><button onClick={async () => { const reg = await worker(); reg?.waiting?.postMessage({ type: 'ACTIVATE_UPDATE' }); navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true }); }}>新しい版へ更新</button></>}<p role="status">{message}</p></details>;
}
