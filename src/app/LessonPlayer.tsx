import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Player, type PlayerState, type Speed } from '../engine/player';
import { Renderer } from '../engine/stage';
import { parseScript } from '../engine/schema';
import { plainCaption } from '../engine/ruby';
import type { Script } from '../engine/types';
import type { Lesson } from '../content/types';
import type { Settings } from '../store/progress';
import { LessonExports } from './features';
import { Ruby } from './shared';
import { applyPlayerCommand, needsRestore, type PlayerCommand, type PlayerSnapshot } from './transport';

export type { PlayerCommand } from './transport';
export interface LessonPlayerHandle { command: (command: PlayerCommand) => void; seek: (index: number) => void; getSnapshot:()=>PlayerSnapshot }
const initial: PlayerState = { stepIndex: 0, stepTimeMs: 0, status: 'ready', speed: 1, motion: false, stepStop: false };
export const LessonPlayer = forwardRef<LessonPlayerHandle, { lesson: Lesson; settings: Settings; teacher: boolean; compact?: boolean; hideTransport?: boolean; onSpeed?: (speed: Speed) => void; onStatus?:(snapshot:PlayerSnapshot)=>void }>(function LessonPlayer({ lesson, settings, teacher, compact = false, hideTransport = false, onSpeed, onStatus }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<Player | null>(null);
  const renderer = useRef<Renderer | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [state, setState] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [stepStop, setStepStop] = useState(teacher);
  const [theatre, setTheatre] = useState(false);
  const [systemReduced, setSystemReduced] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const motion = settings.motion === 'reduced' || settings.motion === 'system' && systemReduced;
  const options = useRef({ left: settings.kiki === 'left', motion, stepStop, speed: settings.speed });
  options.current = { left: settings.kiki === 'left', motion, stepStop, speed: settings.speed };
  const latestState = useRef(initial);
  const latestUI = useRef(0);
  const restoreRequest = useRef(0);
  const root = useRef<HTMLElement>(null);
  const lastUtterance = useRef('');
  const available=useRef(false),loadedId=useRef(''),lessonId=useRef(lesson.id),currentError=useRef('');
  lessonId.current=lesson.id;currentError.current=error;
  function getSnapshot():PlayerSnapshot {return {ready:available.current&&loadedId.current===lessonId.current&&!currentError.current,state:player.current?.getState()??initial};}
  function cancelSpeech() { if ('speechSynthesis' in window) speechSynthesis.cancel(); lastUtterance.current = ''; }
  function render(next = player.current?.getState()) {
    if (!next || !renderer.current) return;
    try { renderer.current.render(next.stepIndex, next.stepTimeMs, { left: options.current.left, still: next.motion || next.status === 'step-ended' || next.status === 'lesson-ended', showGuides: next.motion || next.status === 'step-ended' || next.status === 'lesson-ended' }); }
    catch (cause) { available.current=false;currentError.current=(cause as Error).message;setError(currentError.current); player.current?.onVisibilityChange(true); }
  }
  function restore(action: () => void) {
    const request = ++restoreRequest.current;
    available.current=false;
    setLoading(true);
    const current = player.current;
    if (current?.getState().status === 'playing') current.playPause();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (request !== restoreRequest.current || current !== player.current) return;
      try { action(); } finally { available.current=!currentError.current&&loadedId.current===lessonId.current;setLoading(false); }
    }));
  }
  function seek(index: number) { if(!getSnapshot().ready)return;cancelSpeech(); restore(() => player.current?.seekStep(index)); }
  function command(value: PlayerCommand) {
    const current = player.current;
    if (!current||!getSnapshot().ready) return;
    cancelSpeech();current.tick(performance.now());
    if(needsRestore(value,current.getState()))restore(()=>applyPlayerCommand(current,value,true));
    else applyPlayerCommand(current,value,true);
  }
  useImperativeHandle(ref, () => ({ command, seek, getSnapshot }));
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    let nextRenderer: Renderer | null = null;
    let nextPlayer: Player | null = null;
    let frame = 0;
    let unsubscribe: (() => void) | undefined;
    available.current=false;loadedId.current='';currentError.current='';setScript(null); setLoading(true); setError(''); setState(initial); cancelSpeech();
    (async () => {
      const source = new URL(`data/${lesson.anim}`, new URL(import.meta.env.BASE_URL, location.href));
      const response = await fetch(source, { signal: abort.signal });
      if (!response.ok) throw new Error('アニメーションを読み込めませんでした。通信を確かめて、もう一度ためしてね。');
      const loaded = parseScript(await response.json());
      if (loaded.id !== lesson.id) throw new Error('教材とアニメーションの番号が一致しません。');
      if (!active || !canvas.current) return;
      nextRenderer = new Renderer(canvas.current, loaded);
      await nextRenderer.ready;
      if (!active) { nextRenderer.dispose(); return; }
      renderer.current = nextRenderer;
      nextPlayer = new Player(loaded.steps.map(step => step.durationMs), { stepStop: options.current.stepStop, motion: options.current.motion });
      nextPlayer.setSpeed(options.current.speed);
      player.current = nextPlayer;
      setScript(loaded); setState(nextPlayer.getState()); latestState.current = nextPlayer.getState();
      loadedId.current=loaded.id;render();available.current=!currentError.current;setLoading(false);
      unsubscribe = nextPlayer.subscribe(next => {
        render(next);
        const now = performance.now(), previous = latestState.current;
        if (now - latestUI.current > 100 || previous.stepIndex !== next.stepIndex || previous.status !== next.status || previous.speed !== next.speed || previous.motion !== next.motion || previous.stepStop !== next.stepStop) {
          setState(next); latestUI.current = now;
        }
        latestState.current = next;
      });
      function animate(now: number) { if (!active || !nextPlayer) return; nextPlayer.tick(now); frame = requestAnimationFrame(animate); }
      frame = requestAnimationFrame(animate);
    })().catch(cause => { if (active && cause.name !== 'AbortError') { available.current=false;currentError.current=cause.message;setError(cause.message); setLoading(false); } });
    return () => { active = false;available.current=false;restoreRequest.current++; abort.abort(); cancelAnimationFrame(frame); unsubscribe?.(); nextPlayer?.dispose(); nextRenderer?.dispose(); cancelSpeech(); if (renderer.current === nextRenderer) renderer.current = null; if (player.current === nextPlayer) player.current = null; };
  }, [lesson.id, lesson.anim, retry]);
  useEffect(()=>{onStatus?.(getSnapshot());},[onStatus,loading,error,state,script?.id]);
  useEffect(() => { setStepStop(teacher); }, [teacher]);
  useEffect(() => { player.current?.setStepStop(stepStop); }, [stepStop]);
  useEffect(() => { player.current?.setMotion(motion); }, [motion]);
  useEffect(() => { const current = player.current; if (current) { current.tick(performance.now()); current.setSpeed(settings.speed); } }, [settings.speed]);
  useEffect(() => { render(); }, [settings.kiki]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(media.matches);
    const hidden = () => { if (document.hidden) cancelSpeech(); player.current?.onVisibilityChange(document.hidden); };
    const resize = () => render();
    const observer = typeof ResizeObserver !== 'undefined' && canvas.current ? new ResizeObserver(resize) : null;
    if (canvas.current) observer?.observe(canvas.current);
    media.addEventListener('change', update); document.addEventListener('visibilitychange', hidden);
    return () => { media.removeEventListener('change', update); document.removeEventListener('visibilitychange', hidden); observer?.disconnect(); };
  }, []);
  const current = script?.steps[state.stepIndex];
  useEffect(() => {
    cancelSpeech();
    if (!settings.voice || !current || state.status !== 'playing' || compact || !('speechSynthesis' in window)) return;
    const voice = speechSynthesis.getVoices().find(value => value.localService && /^ja(?:-|$)/i.test(value.lang));
    if (!voice) return;
    const utterance = new SpeechSynthesisUtterance(plainCaption(current.caption, options.current.left, true));
    utterance.lang = 'ja-JP'; utterance.voice = voice; speechSynthesis.speak(utterance); lastUtterance.current = current.id;
    return cancelSpeech;
  }, [current?.id, settings.voice, settings.kiki, state.status, compact]);
  function cycleSpeed() {
    const current = player.current;
    if (!current||!getSnapshot().ready) return;
    current.tick(performance.now());
    const values: Speed[] = [0.5, 1, 1.5];
    const speed = values[(values.indexOf(current.getState().speed) + 1) % 3];
    current.setSpeed(speed); onSpeed?.(speed);
  }
  function onKey(event: React.KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (!getSnapshot().ready||event.nativeEvent.isComposing || target.closest('button,input,select,textarea,[contenteditable="true"]') || event.altKey || event.ctrlKey || event.metaKey) return;
    const actions: Record<string, () => void> = { ' ': () => command('play'), ArrowLeft: () => command('previous'), ArrowRight: () => command('next'), Home: () => command('home'), r: () => command('restart'), s: cycleSpeed, Escape: () => setTheatre(false) };
    const action = actions[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (action) { event.preventDefault(); action(); }
  }
  async function expand() {
    const next = !theatre; setTheatre(next);
    if (next && root.current?.requestFullscreen) { try { await root.current.requestFullscreen(); } catch { /* The expanded layout remains available. */ } }
    else if (!next && document.fullscreenElement) { try { await document.exitFullscreen(); } catch { /* Inline layout already restored. */ } }
  }
  useEffect(() => { const change = () => { if (!document.fullscreenElement) setTheatre(false); }; document.addEventListener('fullscreenchange', change); return () => document.removeEventListener('fullscreenchange', change); }, []);
  const ready = !loading && !error && Boolean(script);
  const ended = state.status === 'step-ended' || state.status === 'lesson-ended';
  const playLabel = motion ? '次をみる' : state.status === 'playing' ? '一時停止' : state.status === 'step-ended' ? '次を再生' : state.status === 'paused' ? 'つづきを再生' : '再生する';
  return <section ref={root} className={`lesson-player ${theatre ? 'expanded-player' : ''} ${teacher ? 'teacher-player' : ''} ${compact ? 'compact-player' : ''}`} data-player-status={state.status} data-player-ready={ready} data-step-index={state.stepIndex} data-step-time={Math.round(state.stepTimeMs)} tabIndex={0} onKeyDown={onKey} aria-label={`${lesson.title}のプレイヤー。スペースで再生、矢印でステップ移動`}>
    <div className="player-head"><span>{lesson.id} · {script?.steps.length ?? '–'}ステップ</span>{!compact && <button onClick={expand}>{theatre ? '小さく戻す' : '大きく見る'} ⛶</button>}</div>
    <div className="paper-stage"><canvas ref={canvas} width="1000" height="625" role="img" aria-label={current?.description ?? `${lesson.title}の図`} />{loading && <div className="stage-message" role="status"><span className="loading-seed" />紙と道具を用意しています…</div>}{error && <div className="stage-message" role="alert"><p>{error}</p><button onClick={() => setRetry(value => value + 1)}>もう一度読み込む</button></div>}{ready && state.status === 'ready' && <span className="stage-prompt">「再生する」から見てみよう</span>}</div>
    <div className="player-caption"><span className="caption-index">{state.stepIndex + 1}</span><p aria-live={state.status === 'playing' ? 'off' : 'polite'}><Ruby text={current?.caption ?? '見たいところから、みてみよう。'} ruby={settings.ruby} left={settings.kiki === 'left'} /></p>{ended && <small>{state.status === 'lesson-ended' ? 'おしまい' : 'ひとやすみ'}</small>}</div>
    {!hideTransport && <><div className="player-transport"><button disabled={!ready} onClick={() => command('home')} title="Home">最初へ</button><button disabled={!ready || state.stepIndex === 0} onClick={() => command('previous')} title="←">前へ</button><button className="primary-button" disabled={!ready || state.status === 'lesson-ended'} onClick={() => command('play')} title="Space">{state.status === 'playing' ? 'Ⅱ' : '▶'} {playLabel}</button><button disabled={!ready || state.stepIndex === (script?.steps.length ?? 1) - 1} onClick={() => command('next')} title="→">次へ</button><button disabled={!ready} onClick={() => command('restart')} title="R">もう一回</button><button disabled={!ready || motion} onClick={cycleSpeed} title="S">速さ {state.speed}×</button></div><div className="step-list" aria-label="ステップを選ぶ">{script?.steps.map((step, index) => <button key={step.id} className={index === state.stepIndex ? 'current' : ''} aria-current={index === state.stepIndex ? 'step' : undefined} disabled={!ready} onClick={() => seek(index)}><span>{index + 1}</span><Ruby text={step.caption} ruby={settings.ruby} left={settings.kiki === 'left'} /></button>)}</div></>}
    <div className="player-options"><label><input type="checkbox" checked={stepStop} onChange={event => setStepStop(event.target.checked)} />1ステップで止める</label><span>{motion ? '止まった絵で見ています' : 'プレイヤーにフォーカスすると、キーボードでも操作できます'}</span></div>
    <details className="figure-description"><summary>この図の説明</summary><p><Ruby text={current?.description ?? '読み込み中です。'} ruby={settings.ruby} left={settings.kiki === 'left'} /></p></details>
    {!compact && <LessonExports renderer={renderer.current} script={script} player={player.current} left={settings.kiki === 'left'} ruby={settings.ruby} caption={current?.caption ?? ''} />}
  </section>;
});
