import type { CompiledAction } from '../compiler';
import type { Sample } from '../shapes';
import { pressureAt, regionPath, regionBounds } from '../shapes';
import { rng, randomAt } from '../rng';
import { canvas2d, context, COLORS, createCrayonTip } from '../textures';

function drawStamps(ctx:CanvasRenderingContext2D,ca:CompiledAction,p:number):void {
  const a=ca.action;if(!('path'in a)&&a.type!=='pencil.hatch')return;
  const pencil=a.type.startsWith('pencil'),crayon=a.type==='crayon.stroke',scratch=a.type==='scratch.stroke';
  const color='color'in a?COLORS[a.color]:'#464b52';
  const tip=crayon?createCrayonTip(color,a.kind==='oil-pastel',ca.seed):undefined;
  const hardness=a.type==='pencil.stroke'?a.hardness??'HB':'HB';
  const density={H:.10,HB:.17,B:.22,'2B':.28,'4B':.35}[hardness];
  for(let i=0;i<ca.samples.length;i++){
    const s:Sample=ca.samples[i];if(s.p>p)break;const pressure=pressureAt('pressure'in a?a.pressure:undefined,s.p),j=(randomAt(ca.seed,i)-.5),width='width'in a?a.width??(pencil?2:12):2;
    if(pencil){const lay=a.type==='pencil.stroke'&&a.mode==='lay',w=lay?Math.max(width,8):width;ctx.fillStyle=color;ctx.globalAlpha=density*(.3+pressure)*(.75+randomAt(ca.seed,i+200000)*.4);ctx.beginPath();ctx.ellipse(s.x+j*.6,s.y-j*.5,Math.max(.35,w*(.25+pressure*.55)),Math.max(.35,w*(.25+pressure*.55))*(lay?.5:1),s.angle,0,Math.PI*2);ctx.fill();}
    else if(crayon&&tip){const lay=a.mode==='lay',w=width*(lay?2.5:1)*(.45+pressure*.65);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle+j*.09);ctx.globalAlpha=(a.kind==='oil-pastel'?.65:.40)*(.45+pressure*.55);ctx.drawImage(tip,-w/2,-w/2,w,w);ctx.restore();}
    else if(scratch){ctx.fillStyle='#000';ctx.globalAlpha=1;const w=width*(.87+randomAt(ca.seed,i+10000)*.22);ctx.beginPath();ctx.arc(s.x+j*.6,s.y+j*.4,w/2,0,Math.PI*2);ctx.fill();}
    else if(a.type==='paint.stroke'){const water=a.water??.5,w=width*(a.part==='belly'?1.6:1)*(a.brush==='flat'?1.35:1);ctx.fillStyle=color;ctx.globalAlpha=a.mode==='opaque'?.40:.075*(1-water*.65);ctx.beginPath();ctx.ellipse(s.x+j*.9,s.y-j*.6,w/2,w/2*(a.brush==='flat'?.64:1),s.angle,0,Math.PI*2);ctx.fill();if(i%3===0){ctx.globalAlpha=a.mode==='opaque'?.1:.018;ctx.lineWidth=.8;ctx.strokeStyle=color;ctx.stroke();}}
  }
  ctx.globalAlpha=1;if(tip){tip.width=1;tip.height=1;}
}
function fillMaterial(ctx:CanvasRenderingContext2D,ca:CompiledAction):void {
  const a=ca.action;if(!ca.region)return;const b=regionBounds(ca.region),random=rng(ca.seed);ctx.save();ctx.clip(regionPath(ca.region));
  if(a.type==='scratch.cover'){ctx.fillStyle=COLORS[a.color??'kuro'];ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='rgba(255,255,255,.025)';for(let i=0;i<1800;i++)ctx.fillRect(b.x+random()*b.w,b.y+random()*b.h,1+random()*2,.6);}
  else if(a.type==='crayon.fill'){
    const colors=a.colors??[a.color!];const pastel=a.kind==='oil-pastel';ctx.globalAlpha=pastel?.95:.83;
    if(a.pattern==='dots'){for(let y=b.y+7;y<b.y+b.h;y+=14)for(let x=b.x+7;x<b.x+b.w;x+=14){ctx.fillStyle=COLORS[colors[Math.floor((x-b.x)/14+(y-b.y)/14)%colors.length]];ctx.beginPath();ctx.arc(x,y,5+random()*1.5,0,Math.PI*2);ctx.fill();}}
    else {for(let i=0;i<colors.length;i++){ctx.fillStyle=COLORS[colors[i]];ctx.fillRect(b.x+i*b.w/colors.length,b.y,b.w/colors.length+1,b.h);}}
    ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-out';for(let i=0;i<b.w*b.h/(pastel?34:17);i++){ctx.globalAlpha=.35+random()*.5;ctx.fillRect(b.x+random()*b.w,b.y+random()*b.h,.4+random()*1.5,.4+random()*1.5);}
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.055;ctx.strokeStyle='#fff';ctx.lineWidth=1.1;
    if(a.pattern==='round'){for(let i=0;i<250;i++){ctx.beginPath();ctx.arc(b.x+random()*b.w,b.y+random()*b.h,10+random()*17,0,Math.PI*1.6);ctx.stroke();}}
    else for(let y=b.y;y<b.y+b.h;y+=5){ctx.beginPath();ctx.moveTo(b.x,y);ctx.lineTo(b.x+b.w,y+random()*1.2);ctx.stroke();}
  }
  else if(a.type==='paint.wash'){
    if(a.color==='water'){ctx.globalAlpha=a.water??.5;ctx.fillStyle='#ffffff';ctx.fillRect(b.x,b.y,b.w,b.h);}
    else {const opacity=a.mode==='opaque'?.91:.62-(a.water??.5)*.34;let fill: string|CanvasGradient=COLORS[a.color];
      if(a.pattern==='grad'&&a.gradTo){const gradient=ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h);gradient.addColorStop(0,COLORS[a.color]);gradient.addColorStop(1,COLORS[a.gradTo]);fill=gradient;}
      ctx.fillStyle=fill;ctx.globalAlpha=opacity*.67;ctx.fillRect(b.x,b.y,b.w,b.h);
      for(let i=0;i<22;i++){ctx.globalAlpha=opacity*.024;ctx.fillStyle=fill;ctx.beginPath();const cx=b.x+b.w/2+(random()-.5)*9,cy=b.y+b.h/2+(random()-.5)*7;const count=64;
        for(let k=0;k<=count;k++){const angle=k/count*Math.PI*2,noise=.93+random()*.075,x=cx+Math.cos(angle)*b.w*.5*noise,y=cy+Math.sin(angle)*b.h*.5*noise;k?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();}
      ctx.globalAlpha=.10;ctx.strokeStyle=COLORS[a.color];ctx.lineWidth=2.8;ctx.stroke(regionPath(ca.region));ctx.globalAlpha=.04;ctx.fillStyle=COLORS[a.color];for(let i=0;i<1800;i++){const x=b.x+random()*b.w,y=b.y+random()*b.h;ctx.fillRect(x,y,.7+random(),.7+random());}
    }
  }ctx.restore();
}
/** Cropped deterministic pigment template, independent of displayed frame count. */
export function material(ca:CompiledAction,p:number):HTMLCanvasElement {
  const b=ca.bounds,c=canvas2d(b.w,b.h),ctx=context(c);if(p<=0)return c;ctx.translate(-b.x,-b.y);if(ca.region)ctx.clip(regionPath(ca.region));
  const a=ca.action;if(a.type==='crayon.fill'||a.type==='paint.wash'||a.type==='scratch.cover')fillMaterial(ctx,ca);else drawStamps(ctx,ca,p);return c;
}
export function reveal(template:HTMLCanvasElement,ca:CompiledAction,p:number):HTMLCanvasElement {
  const b=ca.bounds,c=canvas2d(b.w,b.h),ctx=context(c);ctx.drawImage(template,0,0);if(p>=1)return c;
  const mask=canvas2d(b.w,b.h),m=context(mask);m.translate(-b.x,-b.y);m.lineWidth=49;m.lineCap='round';m.lineJoin='round';m.strokeStyle='#fff';
  if(p>0){m.beginPath();let lastMove=true;for(const s of ca.samples){if(s.p>p)break;if(s.move){if(!lastMove)m.stroke();m.beginPath();m.moveTo(s.x,s.y);lastMove=true;}else{m.lineTo(s.x,s.y);lastMove=false;}}m.stroke();}
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);mask.width=1;mask.height=1;return c;
}
