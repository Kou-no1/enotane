import type { Action, Point, Script } from './types';
import type { CameraState, ToolState } from './snapshots';
import type { CompiledAction } from './compiler';
import { regionPath, pressureAt } from './shapes';
import { canvas2d, context } from './textures';
import { drawToolOverlay } from './tools';
export function screenPoint(point:Point,camera:CameraState,left:boolean):Point {const x=(point[0]-camera.x)/camera.w*1000,y=(point[1]-camera.y)/camera.h*625;return [left?1000-x:x,y];}
export function applyWorldTransform(ctx:CanvasRenderingContext2D,camera:CameraState,left:boolean):void {if(left){ctx.translate(1000,0);ctx.scale(-1,1);}ctx.scale(1000/camera.w,625/camera.h);ctx.translate(-camera.x,-camera.y);}
export function drawTool(ctx:CanvasRenderingContext2D,tool:ToolState,leftPose=false):void {
  if(!tool.visible)return;
  ctx.save();
  // mirror:none keeps the picture still and mirrors only the tool about its contact.
  // Usual lessons continue to mirror the whole stage.
  if(leftPose){ctx.translate(tool.x*2,0);ctx.scale(-1,1);}
  drawToolOverlay(ctx,{tip:[tool.x,tool.y],tool:tool.kind,mode:tool.mode,angle:tool.angle,color:tool.color,lift:tool.lift});
  ctx.restore();
}
function label(ctx:CanvasRenderingContext2D,text:string,x:number,y:number):void {
  ctx.save();ctx.font='600 22px "Noto Sans JP", "Yu Gothic", sans-serif';const w=Math.min(720,ctx.measureText(text).width+36),h=46;x=Math.max(w/2+12,Math.min(988-w/2,x));y=Math.max(32,Math.min(588,y));
  ctx.fillStyle='rgba(255,255,255,.96)';ctx.strokeStyle='#a0ada5';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,14);ctx.fill();ctx.stroke();ctx.fillStyle='#35463c';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y+1);ctx.restore();
}
export function drawNotes(ctx:CanvasRenderingContext2D,actions:CompiledAction[],timeMs:number,camera:CameraState,left:boolean,script:Script,drySheen:number,wetMask:HTMLCanvasElement,settingLeft=left):void {
  const plain=(text:string)=>text.replace(/\{([^|{}]+)\|([^{}]+)\}/g,'$1').replaceAll('%KIKI%',settingLeft?'左':'右').replaceAll('%HANTAI%',settingLeft?'右':'左');
  for(const ca of actions){const a:Action=ca.action;if(timeMs<a.t||timeMs>=a.t+a.dur)continue;const p=(timeMs-a.t)/Math.max(1,a.dur);
    if(a.type==='fx.sheen'&&ca.region){const c=canvas2d(),f=context(c),b=ca.bounds,g=f.createLinearGradient(b.x,b.y,b.x+b.w,b.y+b.h);g.addColorStop(0,'#ffffff00');g.addColorStop(.35,'#ffffff00');g.addColorStop(.48,'#ffffff');g.addColorStop(.62,'#ffffff00');g.addColorStop(1,'#ffffff00');f.save();f.clip(regionPath(ca.region));f.fillStyle=g;f.fillRect(b.x,b.y,b.w,b.h);f.restore();f.globalCompositeOperation='destination-in';f.drawImage(wetMask,0,0);ctx.save();applyWorldTransform(ctx,camera,left);ctx.globalAlpha=Math.sin(p*Math.PI)*drySheen*.3;ctx.drawImage(c,0,0);ctx.restore();c.width=1;c.height=1;}
    if(a.type==='note.circle'){ctx.save();applyWorldTransform(ctx,camera,left);ctx.strokeStyle='#526c58';ctx.lineWidth=3;ctx.setLineDash([7,6]);ctx.beginPath();ctx.arc(a.at[0],a.at[1],a.r,0,Math.PI*2);ctx.stroke();ctx.restore();if(a.text){const [x,y]=screenPoint([a.at[0],a.at[1]+a.r+40],camera,left);label(ctx,plain(a.text),x,y);}}
    if(a.type==='note.arrow'){const [x,y]=screenPoint(a.at,camera,left),[tx,ty]=screenPoint(a.to,camera,left),angle=Math.atan2(ty-y,tx-x);ctx.save();ctx.strokeStyle='#526c58';ctx.fillStyle='#526c58';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.stroke();ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx-15*Math.cos(angle-.5),ty-15*Math.sin(angle-.5));ctx.lineTo(tx-15*Math.cos(angle+.5),ty-15*Math.sin(angle+.5));ctx.closePath();ctx.fill();ctx.restore();if(a.text)label(ctx,plain(a.text),x,y-32);}
    if(a.type==='note.label'){const [x,y]=screenPoint(a.at,camera,left);label(ctx,plain(a.text),x,y);}
    if(a.type==='note.meter'){const [x,y]=screenPoint(a.at??[790,535],camera,left),value=pressureAt(a.value,p);label(ctx,plain(a.label),x,y-24);ctx.save();ctx.fillStyle='#E5E7EB';ctx.strokeStyle='#4B5563';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-90,y+12,180,20,10);ctx.fill();ctx.stroke();ctx.fillStyle='#679A6B';ctx.beginPath();ctx.roundRect(x-88,y+14,176*Math.max(0,Math.min(1,value)),16,8);ctx.fill();ctx.restore();}
  }
  // script is accepted to keep mirror:none text semantics independent of handedness.
  void script;
}
export function drawWetLabel(ctx:CanvasRenderingContext2D,anchor:Point,camera:CameraState,left:boolean):void {const [x,y]=screenPoint(anchor,camera,left);label(ctx,'ぬれているところ',x,y);}
