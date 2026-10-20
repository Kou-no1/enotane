import type { CompiledAction } from './compiler';
import { canvas2d, context, COLORS } from './textures';
import { regionPath, regionBounds } from './shapes';
import { rng } from './rng';
import { mixPaint } from './mixing';
import type { Bounds } from './shapes';

/** Fixed neighbourhood blur of premultiplied pigment, without Canvas filters. */
export function softenedPigment(source:Uint8ClampedArray,width:number,height:number,bounds:Bounds,radius:number,strength:number):Uint8ClampedArray {
  const result=new Uint8ClampedArray(bounds.w*bounds.h*4),offsets=[-radius,-radius/2,0,radius/2,radius],s=Math.max(0,Math.min(1,strength));
  for(let y=0;y<bounds.h;y++)for(let x=0;x<bounds.w;x++){const gx=x+bounds.x,gy=y+bounds.y,from=(gy*width+gx)*4,to=(y*bounds.w+x)*4;let alpha=0,r=0,g=0,b=0;
    for(const dy of offsets)for(const dx of offsets){const xx=Math.max(0,Math.min(width-1,Math.round(gx+dx))),yy=Math.max(0,Math.min(height-1,Math.round(gy+dy))),i=(yy*width+xx)*4,a=source[i+3]/255;alpha+=a;r+=source[i]*a;g+=source[i+1]*a;b+=source[i+2]*a;}
    const oldAlpha=source[from+3]/255,newAlpha=oldAlpha*(1-s)+alpha/25*s;result[to+3]=Math.round(newAlpha*255);
    if(newAlpha>0){result[to]=Math.round((source[from]*oldAlpha*(1-s)+r/25*s)/newAlpha);result[to+1]=Math.round((source[from+1]*oldAlpha*(1-s)+g/25*s)/newAlpha);result[to+2]=Math.round((source[from+2]*oldAlpha*(1-s)+b/25*s)/newAlpha);}
  }return result;
}

export const techniqueTypes=new Set(['frottage.rub','paint.mix','paint.dab','eraser.stroke','stencil','splatter','drip','blow','marble.swirl','stamp.press']);

/** Fixed, nonvisible relief. Leaf veins live below the paper, never on under. */
export function frottageMask(ca:CompiledAction):HTMLCanvasElement {
  const c=canvas2d(),ctx=context(c),a=ca.action;if(a.type!=='frottage.setup'||!ca.region)return c;
  const b=regionBounds(ca.region);ctx.save();ctx.clip(regionPath(ca.region));ctx.strokeStyle='#fff';ctx.lineWidth=4;
  if(a.pattern==='mesh'){for(let x=b.x;x<b.x+b.w;x+=22){ctx.beginPath();ctx.moveTo(x,b.y);ctx.lineTo(x,b.y+b.h);ctx.stroke();}for(let y=b.y;y<b.y+b.h;y+=22){ctx.beginPath();ctx.moveTo(b.x,y);ctx.lineTo(b.x+b.w,y);ctx.stroke();}}
  else if(a.pattern==='wood'){for(let i=0;i<20;i++){ctx.beginPath();for(let y=0;y<=b.h;y+=5){const x=b.x+b.w*i/20+Math.sin(y/38+i*.7)*13;y?ctx.lineTo(x,b.y+y):ctx.moveTo(x,b.y);}ctx.stroke();}}
  else {const cx=b.x+b.w/2;ctx.beginPath();ctx.moveTo(cx,b.y+b.h);ctx.lineTo(cx,b.y);ctx.stroke();for(let i=1;i<=9;i++){const y=b.y+b.h*i/10,w=Math.sin(i/10*Math.PI)*b.w*.46;ctx.beginPath();ctx.moveTo(cx,y+18);ctx.lineTo(cx-w,y-25);ctx.moveTo(cx,y+18);ctx.lineTo(cx+w,y-25);ctx.stroke();}}
  ctx.restore();return c;
}

/** New techniques remain separate from the three original material renderers. */
export function technique(ca:CompiledAction,p:number,relief?:HTMLCanvasElement):HTMLCanvasElement {
  const b=ca.bounds,c=canvas2d(b.w,b.h),ctx=context(c),a=ca.action,random=rng(ca.seed);if(p<=0)return c;
  ctx.translate(-b.x,-b.y);ctx.lineCap='round';ctx.lineJoin='round';ctx.fillStyle='color'in a&&a.color&&a.color!=='water'?COLORS[a.color]:'#888';ctx.strokeStyle=ctx.fillStyle;
  if(ca.region&&a.type!=='stencil')ctx.clip(regionPath(ca.region));
  if(a.type==='paint.mix'&&ca.region){const area=regionBounds(ca.region),mixed=mixPaint(a.colors,a.amounts);ctx.fillStyle=mixed;ctx.globalAlpha=.9*p;ctx.fill(regionPath(ca.region));ctx.globalAlpha=.18*(1-p);a.colors.forEach((color,i)=>{ctx.fillStyle=COLORS[color];ctx.beginPath();ctx.arc(area.x+area.w*(i+.5)/a.colors.length,area.y+area.h/2,Math.min(area.w/a.colors.length,area.h)*.35,0,Math.PI*2);ctx.fill();});}
  else if(a.type==='paint.dab') {for(const s of ca.samples){if(s.p>p)break;ctx.globalAlpha=.65;if(a.tool==='sponge'){ctx.beginPath();ctx.roundRect(s.x-23,s.y-20,46,40,10);ctx.fill();ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=.3;for(let k=0;k<20;k++)ctx.fillRect(s.x-23+random()*46,s.y-20+random()*40,2,2);ctx.globalCompositeOperation='source-over';}else{ctx.beginPath();ctx.ellipse(s.x,s.y,9+random()*5,13+random()*5,random(),0,Math.PI*2);ctx.fill();}}}
  else if(a.type==='splatter'&&ca.region) {const area=regionBounds(ca.region),count=a.count??180;for(let i=0;i<count;i++){const x=area.x+random()*area.w,y=area.y+random()*area.h,r=(a.size??4)*(.15+random()*.6),alpha=.35+random()*.55;if((i+1)/count>p)continue;ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}}
  else if(a.type==='marble.swirl'&&ca.region) {const area=regionBounds(ca.region),cx=area.x+area.w/2,cy=area.y+area.h/2;ctx.fillStyle=COLORS[a.colors[0]];ctx.globalAlpha=.5;ctx.fill(regionPath(ca.region));ctx.globalAlpha=.85;for(let i=0;i<a.colors.length*6;i++){ctx.strokeStyle=COLORS[a.colors[i%a.colors.length]];ctx.lineWidth=Math.max(4,area.w/34);ctx.beginPath();const points=Math.ceil(360*p);for(let k=0;k<=points;k++){const q=k/360,angle=q*Math.PI*2*(a.turns??3)+i*.18,r=q*Math.max(area.w,area.h)*.66,x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r*.72;k?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}}
  else if(a.type==='stamp.press'){const size=a.size??70;for(const s of ca.samples){if(s.p>p)break;ctx.save();ctx.translate(s.x,s.y);ctx.globalAlpha=.8;ctx.beginPath();if(a.shape==='square'||a.shape==='cardboard')ctx.rect(-size/2,-size/2,size,size);else if(a.shape==='leaf'){ctx.ellipse(0,0,size*.32,size*.55,.5,0,Math.PI*2);}else ctx.arc(0,0,size/2,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=.8;if(a.shape==='vegetable'){for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(Math.cos(i*1.256)*size*.25,Math.sin(i*1.256)*size*.25,size*.1,0,Math.PI*2);ctx.fill();}}else if(a.shape==='cardboard'){for(let x=-size*.45;x<size*.5;x+=10)ctx.fillRect(x,-size/2,4,size);}else for(let k=0;k<50;k++)ctx.fillRect((random()-.5)*size,(random()-.5)*size,2,2);ctx.restore();}}
  else if(a.type==='eraser.stroke'||a.type==='frottage.rub'||a.type==='stencil'||a.type==='drip'||a.type==='blow') {
    const width='width'in a?a.width??(a.type==='frottage.rub'?48:24):16;
    ctx.fillStyle=a.type==='eraser.stroke'?'#fff':COLORS['color'in a?a.color:'kuro'];ctx.globalAlpha=a.type==='frottage.rub'?.55:a.type==='drip'?.76:a.type==='stencil'?.55:1;
    if(a.type==='stencil'&&ca.region&&a.side==='inside')ctx.clip(regionPath(ca.region));
    for(let i=0;i<ca.samples.length;i++){const s=ca.samples[i];if(s.p>p)break;const r=a.type==='blow'?Math.max(1,7*(1-s.p)):width/2;ctx.beginPath();ctx.arc(s.x,s.y,r,0,Math.PI*2);ctx.fill();}
    if(a.type==='frottage.rub'&&relief){ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-in';ctx.drawImage(relief,0,0);}
    if(a.type==='stencil'&&ca.region&&a.side!=='inside'){ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-out';ctx.fill(regionPath(ca.region));}
  }
  return c;
}
