import { useEffect, useRef, useState } from 'react';
import type { Tool } from '../engine/types';
import { drawToolOverlay } from '../engine/tools';
import './tool-gallery.css';

const CELL_WIDTH = 320;
const CELL_HEIGHT = 280;
const LABEL_HEIGHT = 58;

interface ToolExample {
  id: string;
  title: string;
  tool: Tool;
  color: string;
  mode?: 'stand' | 'lay';
}

const examples: ToolExample[] = [
  { id: 'pencil', title: '鉛筆', tool: 'pencil', color: '#4B5563' },
  { id: 'brush-red', title: '筆（赤）', tool: 'brush-round', color: '#E24A3B' },
  { id: 'brush-blue', title: '筆（青）', tool: 'brush-round', color: '#3978C5' },
  { id: 'brush-water', title: '筆（水）', tool: 'brush-round', color: 'water' },
  { id: 'crayon-stand', title: 'クレヨン（立てる）', tool: 'crayon', color: '#E24A3B', mode: 'stand' },
  { id: 'crayon-lay', title: 'クレヨン（ねかせる）', tool: 'crayon', color: '#3978C5', mode: 'lay' },
  { id: 'waribashi', title: '割りばし', tool: 'waribashi', color: '#4B5563' },
  { id: 'finger', title: '指でこする位置', tool: 'finger', color: '#4B5563' },
];

interface ToolCell {
  example: ToolExample;
  lifted: boolean;
}

function galleryCells(): ToolCell[] {
  return examples.flatMap(example => [false, true].map(lifted => ({ example, lifted })));
}

function stateLabel(lifted: boolean): string {
  return lifted ? '持ち上げた' : '描いている';
}

function drawCell(canvas: HTMLCanvasElement, { example, lifted }: ToolCell) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, CELL_WIDTH, CELL_HEIGHT);
  ctx.fillStyle = '#FFFDF7';
  ctx.fillRect(0, 0, CELL_WIDTH, CELL_HEIGHT);

  const x = example.mode === 'lay' ? CELL_WIDTH / 2 : 85;
  const y = example.mode === 'lay' ? CELL_HEIGHT / 2 : 230;
  ctx.strokeStyle = '#B7BDB2';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y);
  ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6);
  ctx.stroke();
  if (!lifted) {
    ctx.strokeStyle = example.color === 'water' ? '#BFE3F2' : example.color;
    ctx.lineWidth = example.tool === 'pencil' || example.tool === 'waribashi' ? 2 : 5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 38, y); ctx.lineTo(x, y); ctx.stroke();
  }
  drawToolOverlay(ctx, {
    tip: [x, y],
    tool: example.tool,
    color: example.color,
    mode: example.mode,
    angle: example.mode === 'lay' ? 90 : undefined,
    lift: lifted ? 1 : 0,
  });
}

function ToolCanvas({ cell }: { cell: ToolCell }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) drawCell(ref.current, cell); }, [cell.example.id, cell.lifted]);
  return <canvas ref={ref} width={CELL_WIDTH} height={CELL_HEIGHT} role="img" aria-label={`${cell.example.title}、${stateLabel(cell.lifted)}`} />;
}

export function ToolGallery() {
  const [status, setStatus] = useState('');
  async function saveAtlas() {
    const columns = 4, titleHeight = 72;
    const cells = galleryCells();
    const atlas = document.createElement('canvas');
    atlas.width = CELL_WIDTH * columns;
    atlas.height = titleHeight + (CELL_HEIGHT + LABEL_HEIGHT) * Math.ceil(cells.length / columns);
    const ctx = atlas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#F5F1E9'; ctx.fillRect(0, 0, atlas.width, atlas.height);
    ctx.fillStyle = '#334A3D'; ctx.font = '600 26px "Yu Gothic", sans-serif';
    ctx.fillText('えのたね · 道具の確認ページ', 24, 44);
    const single = document.createElement('canvas');
    single.width = CELL_WIDTH; single.height = CELL_HEIGHT;
    cells.forEach((cell, index) => {
      const x = index % columns * CELL_WIDTH;
      const y = titleHeight + Math.floor(index / columns) * (CELL_HEIGHT + LABEL_HEIGHT);
      drawCell(single, cell); ctx.drawImage(single, x, y);
      ctx.fillStyle = '#FFFDF7'; ctx.fillRect(x, y + CELL_HEIGHT, CELL_WIDTH, LABEL_HEIGHT);
      ctx.fillStyle = '#334A3D'; ctx.font = '600 18px "Yu Gothic", sans-serif';
      ctx.fillText(cell.example.title, x + 16, y + CELL_HEIGHT + 24);
      ctx.fillStyle = '#74816E'; ctx.font = '16px "Yu Gothic", sans-serif';
      ctx.fillText(stateLabel(cell.lifted), x + 16, y + CELL_HEIGHT + 47);
      ctx.strokeStyle = '#E6E6DA'; ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, CELL_WIDTH - 2, CELL_HEIGHT + LABEL_HEIGHT - 2);
    });
    const blob = await new Promise<Blob | null>(resolve => atlas.toBlob(resolve, 'image/png'));
    if (!blob) { setStatus('PNGを作れませんでした。'); return; }
    const downloadURL = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = downloadURL; link.download = 'enotane-tools.png'; link.hidden = true;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadURL), 60_000);
    setStatus('16枚の道具の確認画像を1枚のPNGにまとめました。');
  }
  return <section id="tool-gallery" className="tool-gallery" aria-labelledby="tool-gallery-title">
    <div className="tool-gallery-heading"><div><h2 id="tool-gallery-title">道具の確認ページ</h2><p>各道具を、描いている状態と持ち上げた状態で並べています。十字は描く位置です。</p></div><button onClick={saveAtlas}>道具一覧をPNGで保存</button></div>
    <div className="tool-gallery-grid">{galleryCells().map(cell => <figure key={`${cell.example.id}-${cell.lifted}`}><ToolCanvas cell={cell} /><figcaption><strong>{cell.example.title}</strong><span>{stateLabel(cell.lifted)}</span></figcaption></figure>)}</div>
    <p className="tool-gallery-note">ねかせたクレヨンは、横にぬる方向に対して直角に表示しています。指でこする所には半透明の丸を表示します。</p>
    <p className="tool-gallery-status" role="status">{status}</p>
  </section>;
}
