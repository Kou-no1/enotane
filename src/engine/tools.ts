import type { Point, Tool } from './types';

/** Applied to the drawing coordinates, independently of the camera zoom. */
export const TOOL_SCALE = 0.8;
export const TOOL_ANGLE = -55;
export const TOOL_OUTLINE = '#4B5563';
export type ToolDisplayKind = Tool | 'bamboo' | 'sponge' | 'net-brush';
export interface ToolOverlayOptions {
  /** Paper contact, which stays at the local origin for every tool. */
  tip: Point;
  tool: ToolDisplayKind;
  color: string;
  /** Degrees; a laid crayon receives its fixed stroke-normal angle. */
  angle?: number;
  mode?: 'stand' | 'lay';
  /** 0 = touching the paper, 1 = raised. */
  lift?: number;
}

export function toolShadowOffset(lift = 0): Point {
  const amount = Math.max(0, Math.min(1, lift));
  return [6 + 6 * amount, 7 + 7 * amount];
}
export function toolPaintColor(color: string): string {
  return color === 'water' ? '#BFE3F2' : color;
}

/** The requested pencil drawing, with its graphite point at (0, 0). */
export function drawPencil(ctx: CanvasRenderingContext2D): void {
  ctx.lineWidth=3;ctx.strokeStyle="#4B5563";ctx.lineJoin="round";
  ctx.fillStyle="#F2B544";ctx.fillRect(34,-8,160,16);ctx.strokeRect(34,-8,160,16);
  ctx.fillStyle="#F7CD6E";ctx.fillRect(35,-6.5,158,4);
  ctx.fillStyle="#C9CDD4";ctx.fillRect(194,-8,14,16);ctx.strokeRect(194,-8,14,16);
  ctx.beginPath();ctx.moveTo(34,-8);ctx.lineTo(0,0);ctx.lineTo(34,8);ctx.closePath();
  ctx.fillStyle="#E9C9A0";ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(10,-2.4);ctx.lineTo(0,0);ctx.lineTo(10,2.4);ctx.closePath();
  ctx.fillStyle="#374151";ctx.fill();
}

/** The requested brush drawing; the colour is restricted to the bristle tip. */
export function drawBrush(ctx: CanvasRenderingContext2D, paint: string): void {
  ctx.lineWidth=3;ctx.strokeStyle="#4B5563";ctx.lineJoin="round";
  ctx.beginPath();ctx.moveTo(60,-6);ctx.lineTo(240,-4);ctx.quadraticCurveTo(248,0,240,4);ctx.lineTo(60,6);ctx.closePath();
  ctx.fillStyle="#E3B26A";ctx.fill();ctx.stroke();
  ctx.fillStyle="#F0CC8E";ctx.fillRect(62,-4.5,176,3);
  ctx.beginPath();ctx.rect(38,-7.5,24,15);ctx.fillStyle="#C9CDD4";ctx.fill();ctx.stroke();
  ctx.fillStyle="#E5E7EB";ctx.fillRect(40,-6,20,3);
  const tip=()=>{ctx.beginPath();ctx.moveTo(38,-7.5);ctx.bezierCurveTo(22,-8,8,-4,0,0);
    ctx.bezierCurveTo(8,4,22,8,38,7.5);ctx.closePath();};
  tip();ctx.fillStyle="#8A5A33";ctx.fill();
  ctx.save();tip();ctx.clip();ctx.fillStyle=toolPaintColor(paint);ctx.fillRect(-2,-10,22,20);ctx.restore();
  tip();ctx.stroke();
}

interface ToolShape { silhouette: Path2D; minX: number; minY: number; width: number; height: number; lineWidth: number }
const shapeCache = new Map<string, ToolShape>();
function brushPath(path: Path2D): void {
  path.moveTo(60,-6);path.lineTo(240,-4);path.quadraticCurveTo(248,0,240,4);path.lineTo(60,6);path.closePath();
  path.rect(38,-7.5,24,15);
  path.moveTo(38,-7.5);path.bezierCurveTo(22,-8,8,-4,0,0);
  path.bezierCurveTo(8,4,22,8,38,7.5);path.closePath();
}
function shapeFor(tool: ToolDisplayKind, mode: 'stand' | 'lay'): ToolShape {
  const key = `${tool}:${mode}`;
  const cached = shapeCache.get(key);
  if (cached) return cached;
  const silhouette = new Path2D();
  let minX=-4,minY=-14,width=258,height=28,lineWidth=3;
  if (tool === 'pencil') {
    silhouette.rect(34,-8,174,16);
    silhouette.moveTo(34,-8);silhouette.lineTo(0,0);silhouette.lineTo(34,8);silhouette.closePath();
    width=216;
  } else if (tool === 'brush-round' || tool === 'brush-flat') {
    brushPath(silhouette);
  } else if (tool === 'crayon' || tool === 'oil-pastel') {
    if (mode === 'lay') {
      // The belly's centre touches the painted point, not either end of the bar.
      silhouette.roundRect(-65,-9,130,18,9);minX=-70;width=140;lineWidth=3.24;
    } else {
      silhouette.roundRect(0,-9,138,18,9);width=146;lineWidth=3.24;
    }
  } else if (tool === 'waribashi' || tool === 'bamboo') {
    const length = tool === 'waribashi' ? 208 : 200;
    const halfWidth = tool === 'waribashi' ? 5.5 : 3.5;
    silhouette.moveTo(0,0);silhouette.lineTo(12,-halfWidth);silhouette.lineTo(length,-halfWidth+1);
    silhouette.lineTo(length,halfWidth-1);silhouette.lineTo(12,halfWidth);silhouette.closePath();
    width=length+8;lineWidth=halfWidth*2*.18;
  } else if (tool === 'cotton') {
    silhouette.ellipse(16,0,16,9,0,0,Math.PI*2);
    silhouette.rect(26,-3,134,6);
    silhouette.ellipse(160,0,16,9,0,0,Math.PI*2);width=184;lineWidth=3.24;
  } else if (tool === 'eraser') {
    silhouette.roundRect(0,-12,64,24,4);width=74;minY=-18;height=36;lineWidth=4.32;
  } else if (tool === 'tissue') {
    silhouette.roundRect(0,-13,66,26,13);width=74;minY=-18;height=36;lineWidth=4.68;
  } else if (tool === 'sponge') {
    silhouette.roundRect(0,-17,68,34,10);width=78;minY=-23;height=46;lineWidth=6.12;
  } else if (tool === 'net-brush') {
    brushPath(silhouette);
    silhouette.roundRect(42,16,82,54,4);minY=-14;height=90;lineWidth=3;
  } else {
    // A contact marker for smudging, with no anatomical illustration.
    silhouette.arc(0,0,12,0,Math.PI*2);minX=-16;minY=-16;width=32;height=32;lineWidth=4.32;
  }
  const shape = { silhouette, minX, minY, width, height, lineWidth };
  shapeCache.set(key, shape);
  return shape;
}

/** A single opaque silhouette is stamped once, so its shadow has no dark overlaps. */
const shadowCache = new Map<string, HTMLCanvasElement>();
function shadowFor(tool: ToolDisplayKind, mode: 'stand' | 'lay', shape: ToolShape): HTMLCanvasElement {
  const key = `${tool}:${mode}`;
  const cached = shadowCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');canvas.width=shape.width;canvas.height=shape.height;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('道具の影を描くCanvasを作れません。');
  ctx.translate(-shape.minX,-shape.minY);ctx.fillStyle='#000000';ctx.strokeStyle='#000000';ctx.lineJoin='round';ctx.lineWidth=shape.lineWidth;
  ctx.fill(shape.silhouette);ctx.stroke(shape.silhouette);
  shadowCache.set(key,canvas);
  return canvas;
}
function filledShape(ctx: CanvasRenderingContext2D, shape: ToolShape, color: string): void {
  ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=shape.lineWidth;ctx.strokeStyle=TOOL_OUTLINE;ctx.fillStyle=color;
  ctx.fill(shape.silhouette);ctx.stroke(shape.silhouette);
}
function drawOtherTool(ctx: CanvasRenderingContext2D, tool: ToolDisplayKind, mode: 'stand' | 'lay', color: string, shape: ToolShape): void {
  if(tool==='crayon'||tool==='oil-pastel'){
    filledShape(ctx,shape,color);
    ctx.save();ctx.clip(shape.silhouette);
    const start=mode==='lay'?-65:0;
    ctx.fillStyle='rgba(255,255,255,.24)';ctx.fillRect(start+8,-6,mode==='lay'?112:120,3);
    if(mode==='stand'){
      ctx.fillStyle='#F3E4CF';ctx.fillRect(36,-8,68,16);
      ctx.strokeStyle=TOOL_OUTLINE;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(36,-8);ctx.lineTo(36,8);ctx.moveTo(104,-8);ctx.lineTo(104,8);ctx.stroke();
      ctx.fillStyle=color;ctx.fillRect(47,-3,46,6);
    }
    ctx.restore();
  }else if(tool==='waribashi'||tool==='bamboo'){
    filledShape(ctx,shape,'#E3C28D');ctx.strokeStyle='#C29D63';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(tool==='waribashi'?199:192,0);ctx.stroke();
  }else if(tool==='cotton'){
    filledShape(ctx,shape,'#FFFFFF');ctx.fillStyle='#C9CDD4';ctx.fillRect(32,-2,112,4);
  }else if(tool==='eraser'){
    filledShape(ctx,shape,'#F4E4DA');ctx.save();ctx.clip(shape.silhouette);ctx.fillStyle='#D4E0EE';ctx.fillRect(27,-12,37,24);ctx.restore();
  }else if(tool==='tissue'){
    filledShape(ctx,shape,'#FFFFFF');ctx.strokeStyle='#D1D5DB';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(20,-10);ctx.lineTo(40,9);ctx.lineTo(58,-7);ctx.stroke();
  }else if(tool==='sponge'){
    filledShape(ctx,shape,'#F4D779');ctx.fillStyle='#D2AF50';
    for(const [x,y] of [[16,-8],[32,7],[49,-6],[58,9]]){ctx.beginPath();ctx.arc(x,y,2.1,0,Math.PI*2);ctx.fill();}
  }else if(tool==='net-brush'){
    drawBrush(ctx,color);ctx.beginPath();ctx.roundRect(42,16,82,54,4);ctx.fillStyle='#E5E7EB';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=TOOL_OUTLINE;ctx.stroke();
    ctx.save();ctx.beginPath();ctx.rect(45,19,76,48);ctx.clip();ctx.lineWidth=1;ctx.strokeStyle='#9CA3AF';ctx.beginPath();
    for(let x=47;x<=120;x+=10){ctx.moveTo(x,18);ctx.lineTo(x,69);}for(let y=22;y<=69;y+=10){ctx.moveTo(44,y);ctx.lineTo(123,y);}ctx.stroke();ctx.restore();
  }else{
    ctx.globalAlpha*=.6;filledShape(ctx,shape,'#FFFFFF');
  }
}

/** Draw only the tool, with the contact origin translated before the fixed rotation. */
export function drawToolOverlay(ctx: CanvasRenderingContext2D, options: ToolOverlayOptions): void {
  const mode=options.mode??'stand',shape=shapeFor(options.tool,mode);
  const radians=(options.angle??(mode==='lay'?90:TOOL_ANGLE))*Math.PI/180;
  const [dx,dy]=toolShadowOffset(options.lift);
  ctx.save();
  ctx.translate(options.tip[0]+dx,options.tip[1]+dy);ctx.rotate(radians);ctx.scale(TOOL_SCALE,TOOL_SCALE);
  ctx.globalAlpha*=.10;ctx.drawImage(shadowFor(options.tool,mode,shape),shape.minX,shape.minY);ctx.restore();
  ctx.save();ctx.translate(options.tip[0],options.tip[1]);ctx.rotate(radians);ctx.scale(TOOL_SCALE,TOOL_SCALE);
  if(options.tool==='pencil')drawPencil(ctx);
  else if(options.tool==='brush-round'||options.tool==='brush-flat')drawBrush(ctx,options.color);
  else drawOtherTool(ctx,options.tool,mode,toolPaintColor(options.color),shape);
  ctx.restore();
}
