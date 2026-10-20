import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { Player, type PlayerState, type Speed } from '../engine/player';
import { Renderer } from '../engine/stage';
import { parseScript } from '../engine/schema';
import { parseCaption, plainCaption } from '../engine/ruby';
import type { DevLesson, DevManifest, Script } from '../engine/types';
import { verifyGallery } from './verify';
import { ToolGallery } from './ToolGallery';
import { FullVerification } from './FullVerification';
import './style.css';

const initialState: PlayerState = { stepIndex: 0, stepTimeMs: 0, status: 'ready', speed: 1, motion: false, stepStop: false };
const url = new URL(location.href);
const dataURL = (path: string) => new URL(`data/${path}`, new URL(import.meta.env.BASE_URL, location.href)).href;
const titles: Record<string, string[]> = {
  'P-02': ['まっすぐ', 'くねくね', 'ぎざぎざ', 'ぐるぐる', 'てんてん'],
  'C-09': ['あかるい色', 'くろをぬる', '線をひっかく', '形をひっかく'],
  'W-11': ['水だけをぬる', 'あかをおく', 'もうひとつの色', 'かわくまで'],
};
const materials: Record<string, string> = { 'P-02': 'えんぴつ', 'C-09': 'クレヨン・パス', 'W-11': '水彩絵の具' };
const comments: Record<string, string> = {
  'P-02': '線の形が変わると、感じも変わる。どんなものに使えそう？',
  'C-09': '黒の下から、どんな色が出てくるかな。線も、形も、ためしてみよう。',
  'W-11': 'ぬれた紙に色をおくと、ふわっと広がる。重なったところも見てみよう。',
};

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    play: <path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
    pause: <><path d="M8 5v14M16 5v14" strokeWidth="4" /></>,
    back: <path d="m15 6-6 6 6 6" />,
    next: <path d="m9 6 6 6-6 6" />,
    home: <><path d="M6 5v14M18 6l-9 6 9 6Z" /></>,
    repeat: <><path d="M19 10a7 7 0 1 0 0 7M19 4v6h-6" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m3 17 6-6 5 5 3-3 4 4" /><circle cx="15" cy="8" r="1" /></>,
    expand: <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />,
    leaf: <><path d="M12 21V10M12 14C2 14 3 4 3 4c8 0 10 5 9 10ZM12 10c0-8 8-8 8-8s1 8-8 8Z" /></>,
  };
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.play}</svg>;
}

function Thumbnail({ id }: { id: string }) {
  return <svg viewBox="0 0 96 80" className="thumbnail" aria-hidden="true">
    <rect x="1" y="1" width="94" height="78" rx="14" fill={id === 'C-09' ? '#293c3d' : '#fff9e9'} />
    {id === 'P-02' ? <g stroke="#566459" fill="none" strokeWidth="2.5" strokeLinecap="round"><path d="M18 23h59M18 40c10-15 15 15 25 0s15 15 33 0M18 61l10-9 10 9 10-9 10 9 10-9 10 9" /></g>
      : id === 'C-09' ? <g strokeLinecap="round" strokeWidth="3"><path d="m48 40 0-22m0 22 16-16m-16 16 25 0m-25 0 16 17m-16-17 0 24m0-24-18 18m18-18-25 0m25 0L31 24" stroke="#f6c665" /><path d="M76 22l5-5m-5 5v-7m0 7-6-3M21 63l-5 5m5-5v7m0-7 6 3" stroke="#e88e91" /></g>
      : <><defs><radialGradient id="thumb-red"><stop stopColor="#e77a6c" stopOpacity=".9" /><stop offset="1" stopColor="#efb3a0" stopOpacity=".1" /></radialGradient><radialGradient id="thumb-yellow"><stop stopColor="#f9d575" stopOpacity=".95" /><stop offset="1" stopColor="#f9d575" stopOpacity=".1" /></radialGradient></defs><ellipse cx="37" cy="39" rx="25" ry="22" fill="url(#thumb-red)" /><ellipse cx="62" cy="44" rx="24" ry="23" fill="url(#thumb-yellow)" /></>}
  </svg>;
}

function App() {
  const [lessons, setLessons] = useState<DevLesson[]>([]);
  const [selected, setSelected] = useState(['P-02', 'C-09', 'W-11'].includes(url.searchParams.get('lesson') ?? '') ? url.searchParams.get('lesson')! : 'P-02');
  const [script, setScript] = useState<Script | null>(null);
  const [playState, setPlayState] = useState(initialState);
  const [left, setLeft] = useState(url.searchParams.get('kiki') === 'left');
  const [stepStop, setStepStop] = useState(url.searchParams.get('mode') === 'teacher');
  const [motion, setMotion] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [ruby, setRuby] = useState(true);
  const [layer, setLayer] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [theatre, setTheatre] = useState(false);
  const [stats, setStats] = useState({ snapshotBytes: 0, estimatedBytes: 0, cacheEntries: 0 });
  const [fps, setFps] = useState(0);
  const [tests, setTests] = useState<Array<{ name: string; ok: boolean; detail: string }>>([]);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<Player | null>(null);
  const renderer = useRef<Renderer | null>(null);
  const options = useRef({ left, layer, motion });
  const lastUI = useRef(0);
  const lastState = useRef(initialState);
  options.current = { left, layer, motion };

  function draw(state = player.current?.getState()) {
    if (!state || !renderer.current) return;
    renderer.current.render(state.stepIndex, state.stepTimeMs, {
      left: options.current.left,
      still: state.motion || state.status === 'step-ended' || state.status === 'lesson-ended',
      showGuides: state.motion || state.status === 'step-ended' || state.status === 'lesson-ended',
      layer: options.current.layer,
    });
  }

  useEffect(() => {
    let alive = true;
    fetch(dataURL('dev-manifest.json')).then(async response => {
      if (!response.ok) throw new Error('試作の一覧を読み込めませんでした。');
      const manifest = await response.json() as DevManifest;
      if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.lessons)) throw new Error('試作の一覧の形式が違います。');
      if (alive) setLessons(manifest.lessons);
    }).catch(e => { if (alive) { setError(String(e.message)); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!lessons.length) return;
    let alive = true;
    const abort = new AbortController();
    let nextRenderer: Renderer | null = null;
    let nextPlayer: Player | null = null;
    let frame = 0;
    let unsubscribe: (() => void) | undefined;
    const lesson = lessons.find(item => item.id === selected);
    setLoading(true); setError(''); setTests([]); setScript(null);
    if (!lesson) { setError('その試作は見つかりません。'); setLoading(false); return; }
    (async () => {
      const response = await fetch(dataURL(lesson.anim), { signal: abort.signal });
      if (!response.ok) throw new Error('台本を読み込めませんでした。');
      const nextScript = parseScript(await response.json());
      if (!alive || !canvas.current) return;
      nextRenderer = new Renderer(canvas.current, nextScript);
      await nextRenderer.ready;
      if (!alive) { nextRenderer.dispose(); return; }
      renderer.current = nextRenderer;
      nextPlayer = new Player(nextScript.steps.map(step => step.durationMs), { stepStop, motion: options.current.motion });
      player.current = nextPlayer;
      setScript(nextScript); setPlayState(nextPlayer.getState()); lastState.current = nextPlayer.getState();
      draw(); setStats(nextRenderer.getStats()); setLoading(false);
      const marks: number[] = [];
      unsubscribe = nextPlayer.subscribe(state => {
        draw(state);
        const now = performance.now();
        const was = lastState.current;
        if (now - lastUI.current > 120 || was.stepIndex !== state.stepIndex || was.status !== state.status || was.speed !== state.speed || was.motion !== state.motion || was.stepStop !== state.stepStop) {
          setPlayState(state); setStats(nextRenderer!.getStats()); lastUI.current = now;
        }
        lastState.current = state;
      });
      const animate = (now: number) => {
        if (!alive || !nextPlayer) return;
        const running = nextPlayer.getState().status === 'playing';
        nextPlayer.tick(now);
        if (running) {
          marks.push(now);
          while (marks.length && marks[0] < now - 1000) marks.shift();
          if (Math.floor(now / 500) !== Math.floor((marks.at(-2) ?? now) / 500)) setFps(marks.length);
        }
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    })().catch(e => { if (alive && e.name !== 'AbortError') { setError(String(e.message)); setLoading(false); } });
    return () => {
      alive = false; abort.abort(); cancelAnimationFrame(frame); unsubscribe?.(); nextPlayer?.dispose(); nextRenderer?.dispose();
      if (player.current === nextPlayer) player.current = null;
      if (renderer.current === nextRenderer) renderer.current = null;
    };
  }, [selected, lessons]);

  useEffect(() => { draw(); }, [left, layer]);
  useEffect(() => { player.current?.setStepStop(stepStop); }, [stepStop]);
  useEffect(() => { player.current?.setMotion(motion); }, [motion]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotion(media.matches);
    media.addEventListener('change', update);
    const visibility = () => player.current?.onVisibilityChange(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', update); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  function select(id: string) {
    setSelected(id); setLayer('all');
    const nextURL = new URL(location.href); nextURL.searchParams.set('lesson', id); history.replaceState(null, '', nextURL);
  }
  function cycleSpeed() {
    const current = player.current;
    if (!current) return;
    current.tick(performance.now());
    const values: Speed[] = [0.5, 1, 1.5];
    current.setSpeed(values[(values.indexOf(current.getState().speed) + 1) % values.length]);
  }
  function onKey(event: React.KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (event.nativeEvent.isComposing || target.closest('button,input,select,textarea,[contenteditable="true"]') || event.altKey || event.ctrlKey || event.metaKey) return;
    const current = player.current;
    if (!current) return;
    const actions: Record<string, () => void> = { ' ': () => current.playPause(), ArrowLeft: () => current.previous(), ArrowRight: () => current.next(), Home: () => current.home(), r: () => current.restartStep(), s: cycleSpeed };
    const action = actions[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (action) { event.preventDefault(); action(); }
  }
  async function verify() {
    if (testing) return;
    if (player.current?.getState().status === 'playing') player.current.playPause();
    setTesting(true); setTests([]); setTestMessage('確認をはじめます…');
    try { setTests(await verifyGallery(setTestMessage)); setTestMessage('確認が終わりました。'); }
    catch (e) { setTestMessage(`確認中に問題がありました：${(e as Error).message}`); }
    finally { setTesting(false); }
  }
  function savePNG(includeOverlay = false) {
    if (!renderer.current || !script) return;
    const link = document.createElement('a'); link.download = `${script.id}-step${playState.stepIndex + 1}${includeOverlay ? '-guide' : ''}.png`;
    const encoded = renderer.current.exportPNG(includeOverlay).split(',')[1];
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const downloadURL = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
    link.href = downloadURL; link.hidden = true;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadURL), 60_000);
  }

  const currentLesson = lessons.find(item => item.id === selected);
  const currentStep = script?.steps[playState.stepIndex];
  const ended = playState.status === 'step-ended' || playState.status === 'lesson-ended';
  const ready = !loading && !error && Boolean(script);
  const playLabel = motion ? '次をみる' : playState.status === 'playing' ? '一時停止' : playState.status === 'step-ended' ? '次を再生' : playState.status === 'paused' ? 'つづきを再生' : '再生する';

  return <div className={theatre ? 'app theatre' : 'app'}>
    <header className="header"><a className="brand" href="./dev.html"><span className="brand-icon"><Icon name="leaf" /></span><span>えのたね</span></a><span className="header-note">描くことの、はじまりに。</span><span className="prototype-tag"><i />アニメーションの試作</span></header>
    <main>
      <div className="intro"><div><p className="eyebrow">みて、ためして、見つけよう。</p><h1>描くところを、<span>ゆっくり見よう。</span></h1></div><p className="intro-note">線も、色も、いろいろ。<br />気になる動きを、とめたり、くり返したり。</p></div>
      <div className="workspace">
        <aside className="lesson-nav" aria-label="試作レッスン"><div className="section-label">3つの表し方 <span>01–03</span></div>
          {lessons.map((lesson, index) => <button key={lesson.id} className={`lesson-card ${selected === lesson.id ? 'selected' : ''}`} onClick={() => select(lesson.id)} aria-pressed={selected === lesson.id}><Thumbnail id={lesson.id} /><span><small>0{index + 1} · {materials[lesson.id]}</small><strong>{lesson.title}</strong><em>{lesson.description}</em></span><span className="card-arrow">↗</span></button>)}
          <div className="nav-note"><span>🌱</span><p>ひとつの正解より、<br />自分の表し方を。</p></div>
        </aside>
        <section className="player-panel" tabIndex={0} onKeyDown={onKey} aria-label="アニメーションプレイヤー。スペースで再生、矢印でステップ移動">
          <div className="player-heading"><div><span className="lesson-id">{selected}</span><h2>{currentLesson?.title ?? '読み込み中'}</h2></div><div className="heading-actions"><span className="material-tag">{materials[selected]}</span><button className="icon-button" onClick={() => setTheatre(!theatre)} aria-label={theatre ? 'ふつうの大きさに戻す' : '大きく見る'} title="大きく見る"><Icon name="expand" /></button></div></div>
          <div className="canvas-wrap"><canvas ref={canvas} width="1000" height="625" role="img" aria-label={currentStep?.description ?? '描画アニメーションの画用紙'} />{loading && <div className="canvas-message"><span className="loading-seed" />紙と道具を用意しています…</div>}{error && <div className="canvas-message error" role="alert"><p>{error}</p><button onClick={() => location.reload()}>もう一度ひらく</button></div>}
            {ready && playState.status === 'ready' && !motion && <span className="canvas-hint">下の「再生する」から見てみよう</span>}
            {ready && <span className="stage-corner">{playState.stepIndex + 1} / {script!.steps.length}</span>}
          </div>
          <div className="caption-row"><span className="caption-number">{String(playState.stepIndex + 1).padStart(2, '0')}</span><p className="caption" aria-live={playState.status === 'playing' ? 'off' : 'polite'}>{currentStep ? parseCaption(currentStep.caption, left).map((part, i) => part.reading && ruby ? <ruby key={i}>{part.text}<rt>{part.reading}</rt></ruby> : <span key={i}>{part.text}</span>) : '見たいアニメーションをえらんでね'}</p>{ended && <span className="paused-tag">{playState.status === 'lesson-ended' ? 'おしまい' : 'ひとやすみ'}</span>}</div>
          <div className="transport"><div className="transport-main"><button className="icon-button" disabled={!ready} onClick={() => player.current?.home()} aria-label="最初へ" title="最初へ / Home"><Icon name="home" /></button><button className="icon-button" disabled={!ready || playState.stepIndex === 0} onClick={() => player.current?.previous()} aria-label="前のステップ" title="前のステップ / ←"><Icon name="back" /></button><button className="play-button" disabled={!ready || playState.status === 'lesson-ended'} onClick={() => player.current?.playPause()}><Icon name={playState.status === 'playing' ? 'pause' : 'play'} />{playLabel}</button><button className="icon-button" disabled={!ready || playState.stepIndex === (script?.steps.length ?? 1) - 1} onClick={() => player.current?.next()} aria-label="次のステップ" title="次のステップ / →"><Icon name="next" /></button><button className="repeat-button" disabled={!ready} onClick={() => player.current?.restartStep()} title="もう一回 / R"><Icon name="repeat" /><span>もう一回</span></button></div><button className="speed-button" disabled={!ready || motion} onClick={cycleSpeed} title="速さ / S"><span>速さ</span><strong>{playState.speed}×</strong></button></div>
          <div className="step-strip" aria-label="ステップを選ぶ">{script?.steps.map((step, index) => <button key={step.id} className={`step-button ${index === playState.stepIndex ? 'current' : ''} ${index < playState.stepIndex ? 'seen' : ''}`} aria-current={index === playState.stepIndex ? 'step' : undefined} onClick={() => player.current?.seekStep(index)}><span>{index + 1}</span><strong>{titles[selected]?.[index] ?? plainCaption(step.caption, left)}</strong>{index === playState.stepIndex && <i style={{ width: `${100 * playState.stepTimeMs / step.durationMs}%` }} />}</button>)}</div>
        </section>
        <aside className="settings-panel"><div className="watch-note"><span className="tiny-sun">✳</span><h3>見るところ</h3><p>{comments[selected]}</p></div><div className="settings"><div className="section-label">見やすくする</div><label className="toggle-row"><span>1ステップで止める<small>先生といっしょに見るときに</small></span><input type="checkbox" checked={stepStop} onChange={event => setStepStop(event.target.checked)} /><span className="toggle" aria-hidden="true" /></label><div className="handedness"><span>利き手</span><div className="segmented"><button className={!left ? 'active' : ''} aria-pressed={!left} onClick={() => setLeft(false)}>右きき</button><button className={left ? 'active' : ''} aria-pressed={left} onClick={() => setLeft(true)}>左きき</button></div></div><label className="simple-check"><input type="checkbox" checked={ruby} onChange={event => setRuby(event.target.checked)} />ふりがなを表示</label><label className="simple-check"><input type="checkbox" checked={motion} onChange={event => setMotion(event.target.checked)} />動きを減らす<small>1枚ずつ、止まった絵で見る</small></label></div><details className="description"><summary>このステップの説明</summary><p>{currentStep?.description ?? '読み込み中です。'}</p></details><p className="duration-note">{script?.steps.length ?? '–'} ステップ · 約 {Math.round((script?.steps.reduce((sum, step) => sum + step.durationMs, 0) ?? 0) / 1000)} 秒</p></aside>
      </div>
      <details className="diagnostics"><summary><span>試作の確認</span><small>画像の保存・動作と描画の検証</small></summary><div className="diagnostic-content"><div className="diagnostic-tools"><button onClick={() => savePNG()} disabled={!ready}><Icon name="image" />今の絵をPNGで保存</button><button onClick={() => savePNG(true)} disabled={!ready}>道具・説明も含めて保存</button><label>層を確認<select value={layer} onChange={event => setLayer(event.target.value)}><option value="all">すべて</option>{['paper', 'under', 'paint', 'wet', 'top', 'overlay', 'wetMask'].map(item => <option key={item} value={item}>{item}</option>)}</select></label><button disabled={!ready || testing} onClick={verify}>{testing ? '確認中…' : '動き・描画を検証'}</button></div><div className="metrics"><span>時刻 <strong>{(playState.stepTimeMs / 1000).toFixed(2)} s</strong></span><span>表示 <strong>{fps ? `${fps} fps` : '停止中'}</strong></span><span>保存画像 <strong>{(stats.snapshotBytes / 1048576).toFixed(1)} MiB</strong></span><span>推定画素量 <strong>{(stats.estimatedBytes / 1048576).toFixed(1)} MiB</strong></span><span>チェックポイント <strong>{stats.cacheEntries}</strong></span></div>{script && <div className="action-timeline" aria-label="このステップのアクション境界">{currentStep?.actions.map(action => <div key={action.id}><code>{action.type}</code><span className="timeline-track"><i style={{ left: `${action.t / currentStep.durationMs * 100}%`, width: `${Math.max(0.8, action.dur / currentStep.durationMs * 100)}%` }} /></span><small>{action.t}–{action.t + action.dur} ms</small></div>)}</div>}<p role="status">{testMessage}</p>{tests.length > 0 && <ul className="test-results">{tests.map((result, index) => <li key={index} className={result.ok ? 'pass' : 'fail'}><strong>{result.ok ? '確認済み' : '要確認'} · {result.name}</strong><span>{result.detail}</span></li>)}</ul>}<p className="diagnostic-note">この画面は試作の確認用です。画材の結果は、使う紙や道具で変わります。実機の性能・実物の画材との比較は別途確認します。</p></div></details>
      <FullVerification />
      <ToolGallery />
      <footer><span>えのたね</span><p>本物の紙と画材で、ためしてみよう。</p><small>Phase 0 · 3つのアニメーション</small></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
