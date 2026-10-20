import type { Script, Point, RegionShape } from './types';
import { compileScript } from './compiler';
import type { CompiledAction, CompiledScript } from './compiler';
import { canvas2d, context, createPaper, copyCanvas, COLORS, softColorTip } from './textures';
import { material, reveal } from './brushes/materials';
import { regionPath, sampleAt, regionBounds } from './shapes';
import { rng, hashSeed } from './rng';
import { SnapshotCache, initialState, cloneState, followingTool, enteringTool, movingTool, offscreenToolPoint, createToolMotion, advanceToolMotion } from './snapshots';
import type { LayerName, LogicalState, CameraState, ToolMotion } from './snapshots';
import { drawTool, applyWorldTransform, drawNotes, drawWetLabel } from './overlay';
import { technique, techniqueTypes, frottageMask, softenedPigment } from './techniques';
import { drawScene, drawGrid } from './scene';

export interface RenderOptions { left:boolean; still:boolean; showGuides?:boolean; layer?:string }
interface DropSource { at:Point; color:string; size:number; before:HTMLCanvasElement }
interface Template { canvas:HTMLCanvasElement; bytes:number }
const names:LayerName[]=['under','paint','wet','top','wetMask','resistMask','frottageMask','pencilMask'];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const progress=(t:number,start:number,dur:number)=>dur===0?1:clamp((t-start)/dur);
const release=(c:HTMLCanvasElement)=>{c.width=1;c.height=1;};
const toolDrawingTypes=new Set(['pencil.stroke','pencil.hatch','crayon.stroke','crayon.fill','paint.stroke','paint.wash','paint.drop','paint.soften','scratch.stroke','scratch.cover','smudge',...techniqueTypes]);
const ownsTool=(ca:CompiledAction)=>toolDrawingTypes.has(ca.action.type)||ca.action.type==='hand.enter'||ca.action.type==='hand.exit'||ca.action.type==='hand.move';
function fittedCamera(rect:[number,number,number,number]):CameraState {let [x,y,w,h]=rect;const ratio=1000/625;if(w/h<ratio){const next=h*ratio;x-=(next-w)/2;w=next;}else{const next=w/ratio;y-=(next-h)/2;h=next;}return {x,y,w,h};}
function lerpCamera(a:CameraState,b:CameraState,p:number):CameraState {return {x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p,w:a.w+(b.w-a.w)*p,h:a.h+(b.h-a.h)*p};}
function cameraAtToolEvent(actions:CompiledAction[],time:number,start:CameraState):CameraState {
  let camera={...start};
  for(const ca of actions){const a=ca.action;if(a.t>time)break;const p=progress(time,a.t,a.dur),ease=p*p*(3-2*p);
    if(a.type==='zoom.to')camera=lerpCamera(camera,fittedCamera(a.rect),ease);
    else if(a.type==='zoom.reset')camera=lerpCamera(camera,{x:0,y:0,w:1000,h:625},ease);
  }
  return camera;
}
function regionKey(region:RegionShape):string {
  if(region.shape==='rect')return `rect:${region.x},${region.y},${region.w},${region.h}`;
  if(region.shape==='ellipse')return `ellipse:${region.cx},${region.cy},${region.rx},${region.ry}`;
  if(region.shape==='circle')return `circle:${region.cx},${region.cy},${region.r}`;
  return `polygon:${JSON.stringify(region.points)}`;
}

/** Absolute-time renderer. No picture state depends on requestAnimationFrame frequency. */
export class Renderer {
  readonly ready:Promise<void>;
  private readonly compiled:CompiledScript;
  private readonly layers:Record<LayerName,HTMLCanvasElement>;
  private readonly emptyLayer=canvas2d();
  private readonly paper:HTMLCanvasElement;
  private readonly snapshots=new SnapshotCache();
  private readonly templates=new Map<CompiledAction,Template>();
  private templateBytes=0;
  private state:LogicalState=initialState();
  private currentStep=0;
  private currentTime=0;
  private options:RenderOptions={left:false,still:false};
  private disposed=false;
  private currentStart=-1;
  // The cache omits empty rasters; retain their logical active flags for an
  // explicitly visited end frame without retaining any extra image references.
  private readonly completedActive=new Map<number,LayerName[]>();
  private workBytes=0;
  private comparison?:{action:CompiledAction;canvases:HTMLCanvasElement[];renderers:Renderer[]};
  private readonly hasEraser:boolean;
  constructor(private readonly canvas:HTMLCanvasElement,private readonly script:Script){
    this.compiled=compileScript(script);this.paper=createPaper(hashSeed(script.seed,'paper-v1'));
    this.layers={under:this.emptyLayer,paint:this.emptyLayer,wet:this.emptyLayer,top:this.emptyLayer,wetMask:this.emptyLayer,resistMask:this.emptyLayer,frottageMask:this.emptyLayer,pencilMask:this.emptyLayer};
    this.hasEraser=script.steps.some(s=>s.actions.some(a=>a.type==='eraser.stroke'&&(a.layer??'paint')==='paint'));
    this.ready=Promise.resolve();
  }
  render(stepIndex:number,timeMs:number,options:RenderOptions):void {
    if(this.disposed)throw new Error('解放済みの描画エンジンです');
    if(!Number.isInteger(stepIndex)||stepIndex<0||stepIndex>=this.script.steps.length)throw new Error('ステップ番号が範囲外です');
    if(!Number.isFinite(timeMs))throw new Error('再生時刻が不正です');
    this.currentStep=stepIndex;this.currentTime=Math.max(0,Math.min(timeMs,this.script.steps[stepIndex].durationMs));this.options={...options};
    const complete=this.currentTime===this.script.steps[stepIndex].durationMs,active=this.completedActive.get(stepIndex);
    if(complete&&active&&this.restoreCheckpoint(stepIndex+1)){
      this.state.active=[...active];this.currentStart=stepIndex+1;
    }else{
      this.restoreStart(stepIndex);this.executeStep(stepIndex,this.currentTime);
      if(complete){this.completedActive.set(stepIndex,[...this.state.active]);this.snapshots.save(stepIndex+1,this.layers,this.state);}
    }
    this.display(this.canvas,options,true);
  }
  private reset():void {
    for(const image of new Set(Object.values(this.layers)))if(image!==this.emptyLayer&&!this.snapshots.isShared(image))release(image);
    for(const name of names)this.layers[name]=this.emptyLayer;this.state=initialState();
  }
  /** Saved layers stay immutable; only an action that writes a layer receives a copy. */
  private writable(name:LayerName):HTMLCanvasElement {
    const image=this.layers[name];
    if(image===this.emptyLayer){this.layers[name]=canvas2d();if(name==='under')this.layers[name].getContext('2d',{willReadFrequently:true});}
    else if(this.snapshots.isShared(image))this.layers[name]=copyCanvas(image,name==='under');
    return this.layers[name];
  }
  private restoreCheckpoint(index:number):boolean {
    const cp=this.snapshots.get(index);if(!cp)return false;this.reset();for(const name of names){const image=cp.images[name];if(image)this.layers[name]=image;}this.state=cloneState(cp.state);return true;
  }
  private restoreStart(index:number):void {
    if(this.currentStart===index&&this.restoreCheckpoint(index))return;
    const nearest=this.snapshots.nearest(index);let start=0;
    if(nearest){start=nearest[0];this.restoreCheckpoint(start);}else{this.reset();this.snapshots.save(0,this.layers,this.state);}
    for(let i=start;i<index;i++){this.executeStep(i,this.script.steps[i].durationMs);this.snapshots.save(i+1,this.layers,this.state);}
    this.snapshots.save(index,this.layers,this.state);this.currentStart=index;
  }
  private mark(name:LayerName):void {if(!this.state.active.includes(name))this.state.active.push(name);}
  private template(ca:CompiledAction,create=()=>material(ca,1)):HTMLCanvasElement {
    const cached=this.templates.get(ca);if(cached){this.templates.delete(ca);this.templates.set(ca,cached);return cached.canvas;}
    const c=create(),bytes=c.width*c.height*4;
    while(this.templateBytes+bytes>24*1024*1024&&this.templates.size){const key=this.templates.keys().next().value!,old=this.templates.get(key)!;release(old.canvas);this.templateBytes-=old.bytes;this.templates.delete(key);}
    this.templates.set(ca,{canvas:c,bytes});this.templateBytes+=bytes;return c;
  }
  private applyMaterial(ca:CompiledAction,p:number,target:LayerName,composite:GlobalCompositeOperation='source-over'):void {
    if(p<=0)return;const a=ca.action,filled=a.type==='crayon.fill'||a.type==='paint.wash'||a.type==='scratch.cover';
    let source:HTMLCanvasElement,temporary=false;
    if(filled&&p<1){source=reveal(this.template(ca),ca,p);temporary=true;}else if(p>=1)source=this.template(ca);else{source=material(ca,p);temporary=true;}
    if((a.type==='paint.stroke'||a.type==='paint.wash')&&this.state.active.includes('resistMask')){
      const masked=copyCanvas(source),m=context(masked);m.globalCompositeOperation='destination-out';m.drawImage(this.layers.resistMask,-ca.bounds.x,-ca.bounds.y);if(temporary)release(source);source=masked;temporary=true;
    }
    const ctx=context(this.writable(target));ctx.save();ctx.globalCompositeOperation=composite;ctx.drawImage(source,ca.bounds.x,ca.bounds.y);ctx.restore();this.mark(target);
    if(temporary)release(source);
  }
  private updateWetMask(ca:CompiledAction,p:number,amount:number):void {
    if(p<=0)return;const b=ca.bounds,stamp=canvas2d(b.w,b.h),m=context(stamp);m.translate(-b.x,-b.y);m.fillStyle='#fff';
    if(ca.region){const key=regionKey(ca.region);if(!this.state.wetRegions.includes(key))this.state.wetRegions.push(key);}
    if(ca.region){m.clip(regionPath(ca.region));if(p>=1)m.fillRect(0,0,1000,625);else for(const s of ca.samples){if(s.p>p)break;m.beginPath();m.arc(s.x,s.y,24.5,0,Math.PI*2);m.fill();}}
    else {const a=ca.action;const width='width'in a?a.width??12:12;for(const s of ca.samples){if(s.p>p)break;m.beginPath();m.arc(s.x,s.y,width/2,0,Math.PI*2);m.fill();}}
    if(this.state.active.includes('resistMask')){m.globalCompositeOperation='destination-out';m.drawImage(this.layers.resistMask,0,0);}
    const ctx=context(this.writable('wetMask'));ctx.save();ctx.globalAlpha=Math.max(.01,amount);ctx.drawImage(stamp,b.x,b.y);ctx.restore();release(stamp);this.mark('wetMask');this.state.drySheen=1;
  }
  private follow(ca:CompiledAction,p:number,elapsedMs:number):void {
    this.state.toolMotion=undefined;
    this.state.tool=followingTool(this.state.tool,ca.action,ca.samples,p,elapsedMs);
  }
  private slide(motion:ToolMotion|undefined,deltaMs:number):void {
    const next=advanceToolMotion(this.state.tool,motion,deltaMs);this.state.tool=next.tool;this.state.toolMotion=next.motion;
  }
  private executeStep(index:number,time:number):void {
    const actions=this.compiled.steps[index].actions,drops=new Map<string,DropSource>(),startingCamera={...this.state.camera};this.workBytes=0;
    // Checkpoint motion keeps its original endpoints. Advance only to the next
    // ownership event, so a later move starts where the old slide was then.
    const firstOwner=actions.find(ca=>ownsTool(ca)&&ca.action.t<=time);
    this.slide(this.state.toolMotion,firstOwner?.action.t??time);
    for(let actionIndex=0;actionIndex<actions.length;actionIndex++){const ca=actions[actionIndex],a=ca.action;if(time<a.t)continue;const p=progress(time,a.t,a.dur),end=p===1;
      if(toolDrawingTypes.has(a.type)||a.type==='scene.object'||a.type==='tool.place')this.state.comparison=undefined;
      const nextOwner=actions.slice(actionIndex+1).find(ownsTool),motionTime=Math.min(time,nextOwner?.action.t??time)-a.t;
      switch(a.type){
        case 'hand.enter': {
          const following=actions.find(other=>other.action.t>=a.t+a.dur&&toolDrawingTypes.has(other.action.type));
          const target=following?sampleAt(following.samples,0):[650,360] as Point;
          this.state.tool=enteringTool(this.state.tool,a.tool,target,cameraAtToolEvent(actions,a.t,startingCamera),0,following?.action,following?.samples);
          this.slide(createToolMotion('enter',[this.state.tool.x,this.state.tool.y],target),motionTime);break;
        }
        case 'hand.exit':this.slide(createToolMotion('exit',[this.state.tool.x,this.state.tool.y],offscreenToolPoint(cameraAtToolEvent(actions,a.t,startingCamera))),motionTime);break;
        case 'hand.move':this.state.toolMotion=undefined;this.state.tool=movingTool(this.state.tool,a.to,p);break;
        case 'zoom.to':this.state.camera=lerpCamera(this.state.camera,fittedCamera(a.rect),p*p*(3-2*p));break;
        case 'zoom.reset':this.state.camera=lerpCamera(this.state.camera,{x:0,y:0,w:1000,h:625},p*p*(3-2*p));break;
        case 'pencil.stroke':case 'pencil.hatch':case 'crayon.stroke':
          this.applyMaterial(ca,p,'paint');
          if(p>0&&((this.hasEraser&&(a.type==='pencil.stroke'||a.type==='pencil.hatch'))||(a.type==='crayon.stroke'&&a.resist))){const name=a.type==='crayon.stroke'?'resistMask':'pencilMask',stamp=material(ca,p),s=context(stamp);if(name==='pencilMask'){const pixels=s.getImageData(0,0,stamp.width,stamp.height);for(let i=0;i<pixels.data.length;i+=4)if(pixels.data[i+3]){pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=pixels.data[i+3]=255;}s.putImageData(pixels,0,0);}context(this.writable(name)).drawImage(stamp,ca.bounds.x,ca.bounds.y);release(stamp);this.mark(name);}
          this.follow(ca,p,time-a.t);break;
        case 'crayon.fill':this.applyMaterial(ca,p,a.layer??'paint');this.follow(ca,p,time-a.t);break;
        case 'scratch.cover':this.applyMaterial(ca,p,'top');this.follow(ca,p,time-a.t);break;
        case 'scratch.stroke':this.applyMaterial(ca,p,'top','destination-out');this.follow(ca,p,time-a.t);break;
        case 'paint.stroke': {
          const target=a.layer??'paint';this.applyMaterial(ca,p,target,a.mode==='opaque'?'source-over':'multiply');if(target==='wet')this.updateWetMask(ca,p,a.water??.5);this.follow(ca,p,time-a.t);break;
        }
        case 'paint.wash': {
          if(a.color==='water')this.updateWetMask(ca,p,a.water??.5);else{const target=a.layer??'paint';this.applyMaterial(ca,p,target,a.mode==='opaque'?'source-over':'multiply');if(target==='wet')this.updateWetMask(ca,p,a.water??.5);}this.follow(ca,p,time-a.t);break;
        }
        case 'paint.drop': {
          const before=copyCanvas(this.layers.wet);drops.set(a.id,{at:a.at,color:COLORS[a.color],size:a.size,before});this.workBytes+=2500000;
          if(p>0){const ctx=context(this.writable('wet')),r=a.size/2*(.35+.65*p),tip=softColorTip(COLORS[a.color]);ctx.save();ctx.globalCompositeOperation='multiply';
            if(this.state.active.includes('resistMask')){const stamp=canvas2d(),s=context(stamp);s.drawImage(tip,a.at[0]-r,a.at[1]-r,r*2,r*2);s.globalCompositeOperation='destination-out';s.drawImage(this.layers.resistMask,0,0);ctx.drawImage(stamp,0,0);release(stamp);}else ctx.drawImage(tip,a.at[0]-r,a.at[1]-r,r*2,r*2);
            ctx.restore();release(tip);const mask=context(this.writable('wetMask'));mask.save();mask.fillStyle='#fff';mask.globalAlpha=a.water??.6;mask.beginPath();mask.arc(a.at[0],a.at[1],r,0,Math.PI*2);mask.fill();if(this.state.active.includes('resistMask')){mask.globalAlpha=1;mask.globalCompositeOperation='destination-out';mask.drawImage(this.layers.resistMask,0,0);}mask.restore();const key=regionKey({shape:'circle',cx:a.at[0],cy:a.at[1],r:a.size/2});if(!this.state.wetRegions.includes(key))this.state.wetRegions.push(key);this.mark('wet');this.mark('wetMask');this.state.drySheen=1;}this.follow(ca,p,time-a.t);break;
        }
        case 'paint.bleed': {
          const source=drops.get(a.source);if(!source)throw new Error(`にじみ元がありません: ${a.source}`);if(p<=0)break;
          const wet=context(this.writable('wet'));wet.clearRect(0,0,1000,625);wet.drawImage(source.before,0,0);
          const radius=source.size/2+(a.radius-source.size/2)*Math.pow(p,.55),b={x:Math.floor(source.at[0]-a.radius-6),y:Math.floor(source.at[1]-a.radius-6),w:Math.ceil(a.radius*2+12),h:Math.ceil(a.radius*2+12)},c=canvas2d(b.w,b.h),ctx=context(c),random=rng(ca.seed),tip=softColorTip(source.color);
          ctx.translate(-b.x,-b.y);ctx.globalAlpha=.74;ctx.drawImage(tip,source.at[0]-radius,source.at[1]-radius,radius*2,radius*2);
          for(let k=0;k<16;k++){const angle=k/16*Math.PI*2,offset=radius*(.42+random()*.27),r=radius*(.26+random()*.25);ctx.globalAlpha=.11;ctx.drawImage(tip,source.at[0]+Math.cos(angle)*offset-r,source.at[1]+Math.sin(angle)*offset-r,r*2,r*2);}ctx.globalAlpha=1;
          ctx.globalCompositeOperation='destination-in';ctx.drawImage(this.layers.wetMask,0,0);ctx.fillStyle='#fff';if(ca.region){ctx.globalCompositeOperation='destination-in';const clip=canvas2d(b.w,b.h),cl=context(clip);cl.translate(-b.x,-b.y);cl.fill(regionPath(ca.region));ctx.resetTransform();ctx.drawImage(clip,0,0);release(clip);}
          wet.save();wet.globalCompositeOperation='multiply';wet.drawImage(c,b.x,b.y);wet.restore();release(c);release(tip);this.mark('wet');break;
        }
        case 'paint.dry': {
          this.state.drySheen=1-p;if(end&&ca.region){
            // A second antialiased clip would attenuate the boundary instead of
            // removing it. Raster coverage defines the addressed pixels once.
            const fullRegion=this.state.wetRegions.includes(regionKey(ca.region));
            const coverage=canvas2d(),coverageCtx=context(coverage);coverageCtx.fillStyle='#fff';coverageCtx.save();coverageCtx.clip(regionPath(ca.region));coverageCtx.fillRect(0,0,1000,625);coverageCtx.restore();const addressed=coverageCtx.getImageData(0,0,1000,625).data;
            const wetCtx=context(this.writable('wet')),maskCtx=context(this.writable('wetMask')),wet=wetCtx.getImageData(0,0,1000,625),mask=maskCtx.getImageData(0,0,1000,625),transfer=coverageCtx.createImageData(1000,625);
            for(let y=0;y<625;y++)for(let x=0;x<1000;x++){
              const i=(y*1000+x)*4;let covered=addressed[i+3]>0;
              // Resolve the AA footprint only when drying the original whole
              // wet region. Partial-region drying never expands its boundary.
              if(fullRegion&&!covered&&(wet.data[i+3]>0||mask.data[i+3]>0))for(let dy=-1;dy<=1&&!covered;dy++)for(let dx=-1;dx<=1;dx++){const px=x+dx,py=y+dy;if(px>=0&&px<1000&&py>=0&&py<625&&addressed[(py*1000+px)*4+3]>0){covered=true;break;}}
              if(covered)for(let channel=0;channel<4;channel++){transfer.data[i+channel]=wet.data[i+channel];wet.data[i+channel]=0;mask.data[i+channel]=0;}
            }
            coverageCtx.putImageData(transfer,0,0);context(this.writable('paint')).drawImage(coverage,0,0);wetCtx.putImageData(wet,0,0);maskCtx.putImageData(mask,0,0);release(coverage);this.mark('paint');
          }break;
        }
        case 'smudge':this.smudge(ca,p);this.follow(ca,p,time-a.t);break;
        case 'paint.soften':this.soften(ca,p);this.follow(ca,p,time-a.t);break;
        case 'frottage.setup':{if(p>0||a.dur===0){const mask=frottageMask(ca);context(this.writable('frottageMask')).drawImage(mask,0,0);release(mask);this.mark('frottageMask');}break;}
        case 'frottage.rub':case 'paint.mix':case 'paint.dab':case 'eraser.stroke':case 'stencil':case 'splatter':case 'drip':case 'blow':case 'marble.swirl':case 'stamp.press':{
          if(p>0){const source=technique(ca,p,this.layers.frottageMask),target=a.type==='eraser.stroke'?(a.layer??'paint'):'paint';
            if(a.type==='eraser.stroke'&&target==='paint'){const m=context(source);m.globalCompositeOperation='destination-in';m.drawImage(this.layers.pencilMask,-ca.bounds.x,-ca.bounds.y);}
            const ctx=context(this.writable(target));ctx.save();ctx.globalCompositeOperation=a.type==='eraser.stroke'?'destination-out':'source-over';ctx.drawImage(source,ca.bounds.x,ca.bounds.y);ctx.restore();release(source);this.mark(target);
          }this.follow(ca,p,time-a.t);break;
        }
        case 'decal.fold':{
          if(p>0&&ca.region){const b=regionBounds(ca.region),fold=canvas2d(),ctx=context(fold);ctx.save();ctx.clip(regionPath(ca.region));ctx.globalAlpha=.85*p;
            if(a.axis==='horizontal'){ctx.translate(0,b.y*2+b.h);ctx.scale(1,-1);ctx.beginPath();ctx.rect(b.x,b.y,b.w,b.h/2);ctx.clip();}else{ctx.translate(b.x*2+b.w,0);ctx.scale(-1,1);ctx.beginPath();ctx.rect(b.x,b.y,b.w/2,b.h);ctx.clip();}
            ctx.drawImage(this.layers.paint,0,0);ctx.restore();context(this.writable('paint')).drawImage(fold,0,0);release(fold);this.mark('paint');}break;
        }
        case 'marble.transfer':{
          if(p>0&&ca.region){const b=regionBounds(ca.region),sheet=this.template(ca,()=>{const c=canvas2d(b.w+12,b.h+12),ctx=context(c);ctx.fillStyle='#FBF8F1';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#4B5563';ctx.lineWidth=2;ctx.strokeRect(1,1,c.width-2,c.height-2);ctx.translate(6-b.x,6-b.y);ctx.clip(regionPath(ca.region!));ctx.drawImage(this.layers.paint,0,0);ctx.drawImage(this.layers.wet,0,0);return c;}),q=p*p*(3-2*p),x=b.x+b.w/2+(a.to[0]-(b.x+b.w/2))*q,y=b.y+b.h/2+(a.to[1]-(b.y+b.h/2))*q,scale=1+((a.scale??.5)-1)*q,ctx=context(this.writable('paint'));
            ctx.save();ctx.globalAlpha=Math.min(1,p*3);ctx.fillStyle='rgba(0,0,0,.10)';ctx.fillRect(x-sheet.width*scale/2+6,y-sheet.height*scale/2+7,sheet.width*scale,sheet.height*scale);ctx.drawImage(sheet,x-sheet.width*scale/2,y-sheet.height*scale/2,sheet.width*scale,sheet.height*scale);ctx.restore();this.mark('paint');}break;
        }
        case 'tool.place':{
          const id=`item:${a.item}`,old=this.state.objects.find(o=>o.id===id),to=a.to,from=old?.at??[to[0],-150],q=p*p*(3-2*p);
          const object={id,sprite:a.item,at:[from[0]+(to[0]-from[0])*q,from[1]+(to[1]-from[1])*q] as Point,scale:a.scale??1,z:a.item==='paper'?-20:-10,rotation:0,opacity:1,color:a.color};this.state.objects=this.state.objects.filter(o=>o.id!==id).concat(object);break;
        }
        case 'scene.object':{
          const old=this.state.objects.find(o=>o.id===a.objectId),q=p*p*(3-2*p),from=old?.at??a.at;
          const object={id:a.objectId,sprite:a.sprite,at:[from[0]+(a.at[0]-from[0])*q,from[1]+(a.at[1]-from[1])*q] as Point,scale:(old?.scale??a.scale??1)+((a.scale??1)-(old?.scale??a.scale??1))*q,z:a.z??0,rotation:(old?.rotation??a.rotation??0)+((a.rotation??0)-(old?.rotation??a.rotation??0))*q,opacity:a.opacity??1,color:a.color,light:a.light};this.state.objects=this.state.objects.filter(o=>o.id!==a.objectId).concat(object);break;
        }
        case 'compare':this.state.comparison={step:index,actionId:a.id,p};break;
        case 'grid.show':this.state.grid={kind:a.kind??'thirds',vanishing:a.vanishing};break;
        case 'grid.hide':this.state.grid=undefined;break;
        case 'fx.sheen':case 'note.arrow':case 'note.circle':case 'note.label':case 'note.meter':case 'wait':break;
        default: {const unknown=a as {type:string};throw new Error(`未対応のアクション: ${unknown.type}`);}
      }
    }
    for(const source of drops.values())release(source.before);this.workBytes=0;
  }
  private smudge(ca:CompiledAction,p:number):void {
    const a=ca.action;if(a.type!=='smudge'||p<=0)return;const ctx=context(this.writable('paint')),image=ctx.getImageData(0,0,1000,625),strength=a.strength??.5,width=a.width??24;
    ctx.save();for(const s of ca.samples){if(s.p>p)break;const x=Math.round(s.x),y=Math.round(s.y);let r=0,g=0,b=0,weight=0;
      for(let dy=-8;dy<=8;dy+=4)for(let dx=-8;dx<=8;dx+=4){const px=Math.max(0,Math.min(999,x+dx)),py=Math.max(0,Math.min(624,y+dy)),i=(py*1000+px)*4,w=image.data[i+3]/255;r+=image.data[i]*w;g+=image.data[i+1]*w;b+=image.data[i+2]*w;weight+=w;}
      if(weight>0){ctx.fillStyle=`rgb(${Math.round(r/weight)} ${Math.round(g/weight)} ${Math.round(b/weight)})`;ctx.globalAlpha=.035*strength;ctx.beginPath();ctx.arc(s.x,s.y,width/2,0,Math.PI*2);ctx.fill();}}
    ctx.restore();this.mark('paint');
  }
  private observation(ctx:CanvasRenderingContext2D,camera:CameraState,mirror:boolean):void {
    if(!this.state.active.includes('wetMask'))return;const mask=this.layers.wetMask,data=context(mask).getImageData(0,0,1000,625).data;let minX=1000,minY=625,maxX=0,maxY=0;
    for(let y=0;y<625;y+=3)for(let x=0;x<1000;x+=3)if(data[(y*1000+x)*4+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    if(minX>maxX)return;const tint=copyCanvas(mask),t=context(tint);t.globalCompositeOperation='source-in';t.fillStyle='rgba(72,128,149,.07)';t.fillRect(0,0,1000,625);
    ctx.save();applyWorldTransform(ctx,camera,mirror);ctx.drawImage(tint,0,0);ctx.strokeStyle='#668e9c';ctx.lineWidth=1.8;ctx.setLineDash([7,6]);
    // Raster outline of the actual remaining mask, including partial drying.
    ctx.beginPath();for(let y=minY;y<=maxY;y+=5){let first=-1,last=-1;for(let x=minX;x<=maxX;x+=3)if(data[(y*1000+x)*4+3]>8){if(first<0)first=x;last=x;}if(first>=0){ctx.moveTo(first,y);ctx.lineTo(first,y+4);ctx.moveTo(last,y);ctx.lineTo(last,y+4);}}ctx.stroke();ctx.restore();release(tint);
    drawWetLabel(ctx,[(minX+maxX)/2,Math.min(570,maxY+44)],camera,mirror);
  }
  private display(target:HTMLCanvasElement,options:RenderOptions,includeOverlay:boolean,exporting=false):void {
    if(!exporting){const rect=target.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,Math.round((rect.width||1000)*dpr)),h=Math.max(1,Math.round((rect.height||625)*dpr));if(target.width!==w)target.width=w;if(target.height!==h)target.height=h;}
    const ctx=context(target);ctx.resetTransform();ctx.clearRect(0,0,target.width,target.height);ctx.scale(target.width/1000,target.height/625);
    const layer=options.layer??'all',diagnostic=layer!=='all',camera=diagnostic?{x:0,y:0,w:1000,h:625}:this.state.camera,mirror=options.left&&this.script.stage.mirror==='handedness';
    ctx.save();applyWorldTransform(ctx,camera,mirror);
    if(layer==='all'||layer==='paper')ctx.drawImage(this.paper,0,0);
    if(layer==='all')drawScene(ctx,this.state.objects,false);
    for(const name of ['under','paint','wet','top'] as const)if(layer==='all'||layer===name)ctx.drawImage(this.layers[name],0,0);
    if(['wetMask','resistMask','frottageMask','pencilMask'].includes(layer))ctx.drawImage(this.layers[layer as LayerName],0,0);
    if(layer==='all'){drawScene(ctx,this.state.objects,true);if(includeOverlay)drawGrid(ctx,this.state.grid);}
    if(includeOverlay&&(layer==='all'||layer==='overlay')&&!options.still)drawTool(ctx,this.state.tool,options.left&&this.script.stage.mirror==='none');ctx.restore();
    if(includeOverlay&&(layer==='all'||layer==='overlay')){drawNotes(ctx,this.compiled.steps[this.currentStep].actions,this.currentTime,camera,mirror,this.script,this.state.drySheen,this.layers.wetMask,options.left);if(options.showGuides)this.observation(ctx,camera,mirror);}
    if(layer==='all'&&this.state.comparison)this.displayComparison(ctx,options,includeOverlay);
  }
  private soften(ca:CompiledAction,p:number):void {
    const a=ca.action;if(a.type!=='paint.soften'||p<=0)return;const b=ca.bounds,wet=context(this.writable('wet')),before=wet.getImageData(b.x,b.y,b.w,b.h),mask=context(this.layers.wetMask).getImageData(b.x,b.y,b.w,b.h);
    const complete=this.template(ca,()=>{const full=wet.getImageData(0,0,1000,625),c=canvas2d(b.w,b.h),ctx=context(c),image=ctx.createImageData(b.w,b.h);image.data.set(softenedPigment(full.data,1000,625,b,(a.width??24)/3,a.strength??.5));ctx.putImageData(image,0,0);return c;}),soft=context(complete).getImageData(0,0,b.w,b.h),coverage=canvas2d(b.w,b.h),ctx=context(coverage);ctx.translate(-b.x,-b.y);ctx.fillStyle='#fff';
    for(const sample of ca.samples){if(sample.p>p)break;ctx.beginPath();ctx.arc(sample.x,sample.y,(a.width??24)/2,0,Math.PI*2);ctx.fill();}const addressed=ctx.getImageData(0,0,b.w,b.h).data;
    for(let i=0;i<before.data.length;i+=4){const amount=addressed[i+3]/255*(mask.data[i+3]>0?1:0);if(amount>0){const oldAlpha=before.data[i+3]/255,newAlpha=soft.data[i+3]/255,alpha=oldAlpha*(1-amount)+newAlpha*amount;for(let channel=0;channel<3;channel++)before.data[i+channel]=alpha>0?Math.round((before.data[i+channel]*oldAlpha*(1-amount)+soft.data[i+channel]*newAlpha*amount)/alpha):0;before.data[i+3]=Math.round(alpha*255);}}
    wet.putImageData(before,b.x,b.y);release(coverage);this.mark('wet');
  }
  private displayComparison(ctx:CanvasRenderingContext2D,options:RenderOptions,includeOverlay:boolean):void {
    const selection=this.state.comparison!,ca=this.compiled.steps[selection.step].actions.find(v=>v.action.id===selection.actionId);if(!ca||ca.action.type!=='compare')return;const action=ca.action;
    if(this.comparison?.action!==ca){if(this.comparison){this.comparison.renderers.forEach(r=>r.dispose());this.comparison.canvases.forEach(release);}const canvases=[canvas2d(),canvas2d()],renderers=[new Renderer(canvases[0],action.left),new Renderer(canvases[1],action.right)];this.comparison={action:ca,canvases,renderers};}
    ctx.save();ctx.fillStyle='#FBF8F1';ctx.fillRect(0,0,1000,625);ctx.font='600 25px "Yu Gothic",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    [action.left,action.right].forEach((script,i)=>{const total=script.steps.reduce((n,s)=>n+s.durationMs,0);let at=selection.p*total,index=0;while(index<script.steps.length-1&&at>=script.steps[index].durationMs){at-=script.steps[index].durationMs;index++;}this.comparison!.renderers[i].render(index,at,options);this.comparison!.renderers[i].renderTo(this.comparison!.canvases[i],includeOverlay);const x=10+i*500;ctx.drawImage(this.comparison!.canvases[i],x,154,480,300);ctx.fillStyle='#4B5563';ctx.fillText(action.labels[i],x+240,115);ctx.strokeStyle='#C5CBBE';ctx.lineWidth=2;ctx.strokeRect(x,154,480,300);});ctx.restore();
  }
  /** Direct composition for video capture; preserves fixed logical export coordinates. */
  renderTo(target:HTMLCanvasElement,includeOverlay=false):void {if(this.disposed)throw new Error('解放済みの描画エンジンです');this.display(target,{...this.options,layer:'all'},includeOverlay,true);}
  exportPNG(includeOverlay=false):string {const c=canvas2d();this.display(c,{...this.options,layer:'all'},includeOverlay,true);const url=c.toDataURL('image/png');release(c);return url;}
  /** Read the actual logical layer, without camera, DPR, scaling or presentation compositing. */
  getLayerImageData(name:LayerName|'paper'):ImageData {
    if(this.disposed)throw new Error('解放済みの描画エンジンです');
    const image=name==='paper'?this.paper:this.layers[name];if(!image)throw new Error(`未知の層: ${name}`);
    return context(image).getImageData(0,0,1000,625);
  }
  getStats():{snapshotBytes:number;estimatedBytes:number;cacheEntries:number} {return {snapshotBytes:this.snapshots.bytes,estimatedBytes:this.snapshots.bytes+this.templateBytes+this.paper.width*this.paper.height*4+new Set(Object.values(this.layers)).size*2500000+this.canvas.width*this.canvas.height*4+this.workBytes+this.compiled.points*40+(this.comparison?.renderers.reduce((n,r)=>n+r.getStats().estimatedBytes,0)??0),cacheEntries:this.snapshots.size};}
  dispose():void {if(this.disposed)return;this.disposed=true;this.snapshots.clear();this.completedActive.clear();for(const template of this.templates.values())release(template.canvas);this.templates.clear();this.templateBytes=0;this.comparison?.renderers.forEach(r=>r.dispose());this.comparison?.canvases.forEach(release);for(const image of new Set(Object.values(this.layers)))release(image);release(this.emptyLayer);release(this.paper);}
}
