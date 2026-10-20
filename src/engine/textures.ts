import { rng } from './rng';
import type { PaintColor } from './types';
export const COLORS:Record<PaintColor,string>={shiro:'#FFFFFF',kiiro:'#FFD93B',daidai:'#FF9A2E',aka:'#E8382F',momo:'#F58BB0',kimidori:'#A6D84A',midori:'#2E9E4F',mizu:'#5EC3EA',ao:'#1F5FBF',murasaki:'#7B4BA8',chairo:'#8A5A33',kuro:'#2B2B2B'};
export function canvas2d(w=1000,h=625):HTMLCanvasElement { const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c; }
export function context(c:HTMLCanvasElement):CanvasRenderingContext2D {const ctx=c.getContext('2d');if(!ctx)throw new Error('Canvas 2Dを利用できません');return ctx;}
export function copyCanvas(c:HTMLCanvasElement,readFrequently=false):HTMLCanvasElement {const copy=canvas2d(c.width,c.height);if(readFrequently)copy.getContext('2d',{willReadFrequently:true});context(copy).drawImage(c,0,0);return copy;}
export function createPaper(seed:number):HTMLCanvasElement {
  const c=canvas2d(),ctx=context(c),random=rng(seed);ctx.fillStyle='#FBF8F1';ctx.fillRect(0,0,1000,625);
  for(let i=0;i<28000;i++){const x=random()*1000,y=random()*625;ctx.fillStyle=random()>.45?'rgba(89,73,47,0.045)':'rgba(255,255,255,0.42)';ctx.fillRect(x,y,.35+random()*1.2,.35+random()*1.2);}
  ctx.strokeStyle='rgba(125,112,85,0.028)';ctx.lineWidth=.5;for(let i=0;i<1500;i++){const x=random()*1000,y=random()*625;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3+random()*10,y+random()*2);ctx.stroke();}return c;
}
export function createCrayonTip(color:string,pastel:boolean,seed:number):HTMLCanvasElement {
  const c=canvas2d(64,64),ctx=context(c),random=rng(seed);ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(32,32,30,20,0,0,Math.PI*2);ctx.fill();
  ctx.globalCompositeOperation='destination-out';for(let i=0;i<(pastel?170:460);i++){ctx.globalAlpha=.4+random()*.55;const x=random()*64,y=random()*64;ctx.fillRect(x,y,.6+random()*2,.6+random()*2);}ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';return c;
}
export function softColorTip(color:string,size=128):HTMLCanvasElement {
  const c=canvas2d(size,size),ctx=context(c),r=size/2,g=ctx.createRadialGradient(r,r,r*.06,r,r,r);
  g.addColorStop(0,color+'e0');g.addColorStop(.42,color+'8a');g.addColorStop(.78,color+'35');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(0,0,size,size);return c;
}
