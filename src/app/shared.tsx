import { parseCaption, plainCaption } from '../engine/ruby';
import type { Lesson } from '../content/types';

export const modules = [
  { id: 'pencil', code: 'P', title: 'えんぴつ', subtitle: '線から、はじめよう。', color: '#82947a', motif: 'lines' },
  { id: 'crayon', code: 'C', title: 'クレヨン・パス', subtitle: '重ねる、こする、見つける。', color: '#c59068', motif: 'crayon' },
  { id: 'paint', code: 'W', title: '絵の具', subtitle: '水と色の、ふしぎ。', color: '#7fa4ad', motif: 'paint' },
  { id: 'play', code: 'M', title: '技法あそび', subtitle: 'いつもの道具で、新しい跡。', color: '#bc8d8d', motif: 'play' },
  { id: 'color', code: 'K', title: '色のひみつ', subtitle: '色で、何を伝えよう。', color: '#baa65b', motif: 'color' },
  { id: 'composition', code: 'Z', title: '構図', subtitle: '大きさと、置く場所。', color: '#9395ac', motif: 'composition' },
  { id: 'observe', code: 'O', title: 'よく見てかく', subtitle: 'くらべて、気づいて、かく。', color: '#839f9a', motif: 'observe' },
] as const;
export const moduleInfo = (id: string) => modules.find(module => module.id === id) ?? modules[0];
export function Ruby({ text, ruby = true, left = false }: { text: string; ruby?: boolean; left?: boolean }) {
  return <>{parseCaption(text, left).map((part, index) => part.reading && ruby ? <ruby key={index}>{part.text}<rt>{part.reading}</rt></ruby> : <span key={index}>{part.text}</span>)}</>;
}
export function Leaf() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 29V13m0 6C4 20 5 7 5 7s12-1 11 12Zm0-6C15 3 28 3 28 3s1 11-12 10Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
export function Motif({ type, variant = 0 }: { type: string; variant?: number }) {
  const colors = ['#d98a72', '#e6bc68', '#7faaa2', '#9097ba'];
  return <svg className="motif" viewBox="0 0 240 150" aria-hidden="true">
    <rect x="1" y="1" width="238" height="148" rx="17" fill="#fffaf0" />
    {type === 'lines' ? <g fill="none" stroke="#67746a" strokeWidth="4" strokeLinecap="round"><path d="M28 37h183M28 76c25-39 36 39 63 0s38 39 70 0 31 8 49 0M28 119l26-18 27 18 28-18 27 18 28-18 27 18" /></g>
      : type === 'crayon' ? <g fill="none" strokeWidth="19" strokeLinecap="round" opacity=".82"><path d="m40 48 159 59" stroke={colors[variant % 4]} /><path d="m48 106 150-64" stroke="#e6bc68" /><path d="m37 77 167 2" stroke="#809b85" /></g>
      : type === 'paint' ? <><ellipse cx="91" cy="70" rx="53" ry="38" fill={colors[variant % 4]} opacity=".45" /><ellipse cx="150" cy="87" rx="51" ry="37" fill="#e6bc68" opacity=".52" /><ellipse cx="129" cy="62" rx="29" ry="26" fill="#7faaa2" opacity=".3" /></>
      : type === 'color' ? <>{colors.concat(['#b586a8', '#87a86b']).map((color, i) => <circle key={color} cx={120 + Math.cos(i * Math.PI / 3) * 45} cy={75 + Math.sin(i * Math.PI / 3) * 45} r="22" fill={color} />)}</>
      : type === 'composition' ? <><path d="M81 18v114m78-114v114M18 52h204M18 98h204" stroke="#c9cec0" strokeDasharray="4 4" /><circle cx={variant % 2 ? 95 : 162} cy="65" r="31" fill="#d98a72" /><path d="m47 124 27-57 27 57Z" fill="#819981" /><path d="m99 124 22-41 22 41Z" fill="#a6b59c" /></>
      : type === 'observe' ? <><path d="M65 105c-26-45 30-67 61-18-1-73 71-52 54-3-17 35-82 56-115 21Z" fill="#d4dfcc" stroke="#778f75" strokeWidth="3" /><path d="m69 111 90-48M117 86l-2-22m25 9 22 15" stroke="#778f75" strokeWidth="2" fill="none" /></>
      : <>{Array.from({ length: 13 }, (_, i) => <circle key={i} cx={35 + (i * 47) % 171} cy={29 + (i * 31) % 92} r={6 + (i % 4) * 4} fill={colors[(i + variant) % 4]} opacity=".75" />)}</>}
  </svg>;
}
export function LessonCard({ lesson, favorite, stamp, ruby, onOpen, onFavorite }: { lesson: Lesson; favorite: boolean; stamp?: string; ruby: boolean; onOpen: () => void; onFavorite: () => void }) {
  const module = moduleInfo(lesson.module);
  return <article className="lesson-tile">
    <button className="tile-open" onClick={onOpen}><Motif type={module.motif} variant={lesson.order} /><span className="tile-meta">{lesson.id} <span>{'★'.repeat(lesson.level)} <small>ためす目安</small></span></span><strong><Ruby text={lesson.title} ruby={ruby} /></strong><p><Ruby text={lesson.goal} ruby={ruby} /></p><span className="tile-bottom">実物で 約{lesson.activityMinutes}分 {stamp && <em>きろくあり 🌱</em>}</span></button>
    <button className={`favorite-button ${favorite ? 'is-favorite' : ''}`} aria-pressed={favorite} onClick={onFavorite} aria-label={`${plainCaption(lesson.title)}を${favorite ? 'お気に入りからはずす' : 'お気に入りにする'}`}>{favorite ? '♥' : '♡'}</button>
  </article>;
}
