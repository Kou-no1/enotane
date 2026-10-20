import { context, COLORS } from './textures';
import type { Action, Point, Tool, SceneItem, PaintColor } from './types';
import type { Sample } from './shapes';
export type LayerName='under'|'paint'|'wet'|'top'|'wetMask'|'resistMask'|'frottageMask'|'pencilMask';
export interface SceneObject { id:string; sprite:SceneItem; at:Point; scale:number; z:number; rotation:number; opacity:number; color?:PaintColor; light?:Point }
export interface GridState {kind:'thirds'|'perspective'|'center';vanishing?:Point}
/** x/y are the paper contact point, shared by the drawing sample and tool tip. */
export interface ToolState { visible:boolean; kind:Tool; x:number; y:number; color:string; mode:'stand'|'lay'; angle:number; lift:number }
/** A slide can outlive an authored action or cross a step checkpoint. */
export interface ToolMotion { kind:'enter'|'exit'; from:Point; to:Point; elapsedMs:number }
export interface CameraState { x:number; y:number; w:number; h:number }
export const TOOL_SLIDE_MS=400;
export const TOOL_LOWER_MS=150;
export const TOOL_FIXED_ANGLE=-55;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(p:number)=>{const q=clamp(p);return q*q*(3-2*q);};
export function toolForAction(action:Action,previous:Tool):Tool {
  if(action.type==='pencil.stroke'||action.type==='pencil.hatch')return 'pencil';
  if(action.type==='crayon.stroke'||action.type==='crayon.fill')return action.kind==='oil-pastel'?'oil-pastel':'crayon';
  if(action.type==='scratch.stroke')return 'waribashi';
  if(action.type==='scratch.cover')return previous==='crayon'||previous==='oil-pastel'?previous:'crayon';
  if(action.type==='paint.stroke')return action.brush==='flat'?'brush-flat':'brush-round';
  if(action.type==='paint.wash'||action.type==='paint.drop')return previous==='brush-flat'?'brush-flat':'brush-round';
  if(action.type==='paint.soften')return 'brush-round';
  if(action.type==='smudge')return action.tool??'finger';
  if(action.type==='frottage.rub')return 'crayon';
  if(action.type==='eraser.stroke')return 'eraser';
  if(action.type==='stencil')return 'finger';
  if(action.type==='paint.mix'||action.type==='drip'||action.type==='blow'||action.type==='marble.swirl')return 'brush-round';
  if(action.type==='paint.dab')return action.tool==='sponge'?'sponge':'brush-round';
  if(action.type==='splatter')return 'net-brush';
  if(action.type==='stamp.press')return 'sponge';
  return previous;
}
export function toolModeForAction(kind:Tool,action?:Action):ToolState['mode'] {
  return (kind==='crayon'||kind==='oil-pastel')&&action?.type==='crayon.stroke'&&action.mode==='lay'?'lay':'stand';
}
/** A laid crayon uses the first connected drawing segment; later curves cannot rotate it. */
export function toolAngleForAction(mode:ToolState['mode'],samples:Sample[]):number {
  if(mode!=='lay')return TOOL_FIXED_ANGLE;
  for(let i=1;i<samples.length;i++){
    const a=samples[i-1],b=samples[i];
    if(!b.move&&(a.x!==b.x||a.y!==b.y))return Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI+90;
  }
  return TOOL_FIXED_ANGLE;
}
export function toolColorForAction(action:Action|undefined,previous:string,at?:Sample,samples:Sample[]=[]):string {
  if(!action)return previous;
  if(action.type==='paint.soften')return '#BFE3F2';
  if(action.type==='pencil.stroke'||action.type==='pencil.hatch')return '#41444b';
  if(action.type==='crayon.fill'&&action.colors?.length){
    let stripe=0;
    if(at&&samples.length){const left=Math.min(...samples.map(s=>s.x)),right=Math.max(...samples.map(s=>s.x));stripe=Math.min(action.colors.length-1,Math.floor(clamp((at.x-left)/Math.max(1,right-left))*action.colors.length));}
    return COLORS[action.colors[stripe]];
  }
  if('color'in action&&action.color)return action.color==='water'?'#BFE3F2':COLORS[action.color];
  if(action.type==='scratch.cover')return COLORS.kuro;
  return previous;
}
export function followingTool(tool:ToolState,action:Action,samples:Sample[],p:number,elapsedMs=Math.max(0,p*action.dur)):ToolState {
  if(!tool.visible||!samples.length)return tool;
  const kind=toolForAction(action,tool.kind),mode=toolModeForAction(kind,action);
  let lo=0,hi=samples.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(samples[mid].p<=p)lo=mid;else hi=mid-1;}
  // Material renderers stamp only samples at or before p. The tip therefore
  // stays on that exact sample, rather than leading it by interpolation.
  const at=samples[lo];
  return {...tool,kind,mode,x:at.x,y:at.y,color:toolColorForAction(action,tool.color,at,samples),angle:toolAngleForAction(mode,samples),lift:tool.lift*(1-smooth(elapsedMs/TOOL_LOWER_MS))};
}
/** The entire silhouette remains above/right of the current camera bounds. */
export function offscreenToolPoint(camera:CameraState):Point {return [camera.x+camera.w+220,camera.y-220];}
export function enteringTool(previous:ToolState,kind:Tool,target:Point,camera:CameraState,elapsedMs:number,following?:Action,samples:Sample[]=[]):ToolState {
  const from=offscreenToolPoint(camera),p=smooth(elapsedMs/TOOL_SLIDE_MS),mode=toolModeForAction(kind,following);
  return {visible:true,kind,x:from[0]+(target[0]-from[0])*p,y:from[1]+(target[1]-from[1])*p,color:toolColorForAction(following,previous.color),mode,angle:toolAngleForAction(mode,samples),lift:1};
}
export function exitingTool(tool:ToolState,camera:CameraState,elapsedMs:number):ToolState {
  const to=offscreenToolPoint(camera),p=smooth(elapsedMs/TOOL_SLIDE_MS);
  return {...tool,x:tool.x+(to[0]-tool.x)*p,y:tool.y+(to[1]-tool.y)*p,lift:1,visible:tool.visible&&elapsedMs<TOOL_SLIDE_MS};
}
export function movingTool(tool:ToolState,to:Point,p:number):ToolState {
  const ease=smooth(p);return {...tool,x:tool.x+(to[0]-tool.x)*ease,y:tool.y+(to[1]-tool.y)*ease,lift:1};
}
export function createToolMotion(kind:ToolMotion['kind'],from:Point,to:Point):ToolMotion {
  return {kind,from:[...from],to:[...to],elapsedMs:0};
}
export function advanceToolMotion(tool:ToolState,motion:ToolMotion|undefined,deltaMs:number):{tool:ToolState;motion?:ToolMotion} {
  if(!motion)return {tool};
  const elapsedMs=Math.min(TOOL_SLIDE_MS,motion.elapsedMs+Math.max(0,deltaMs)),p=smooth(elapsedMs/TOOL_SLIDE_MS);
  const next={...tool,x:motion.from[0]+(motion.to[0]-motion.from[0])*p,y:motion.from[1]+(motion.to[1]-motion.from[1])*p,lift:1,visible:motion.kind==='enter'||(tool.visible&&elapsedMs<TOOL_SLIDE_MS)};
  return {tool:next,motion:elapsedMs<TOOL_SLIDE_MS?{...motion,from:[...motion.from],to:[...motion.to],elapsedMs}:undefined};
}
export interface LogicalState { tool:ToolState; toolMotion?:ToolMotion; camera:CameraState; active:LayerName[]; drySheen:number; wetRegions:string[]; objects:SceneObject[]; grid?:GridState; comparison?:{step:number;actionId:string;p:number} }
/** Immutable layer references avoid all premultiplied-alpha round trips on untouched layers. */
export interface Checkpoint { images:Partial<Record<LayerName,HTMLCanvasElement>>; state:LogicalState; bytes:number }
export function initialState():LogicalState {return {tool:{visible:false,kind:'pencil',x:1220,y:-220,color:'#41444b',mode:'stand',angle:TOOL_FIXED_ANGLE,lift:1},camera:{x:0,y:0,w:1000,h:625},active:[],drySheen:1,wetRegions:[],objects:[]};}
export function cloneState(state:LogicalState):LogicalState {return {tool:{...state.tool},toolMotion:state.toolMotion?{...state.toolMotion,from:[...state.toolMotion.from],to:[...state.toolMotion.to]}:undefined,camera:{...state.camera},active:[...state.active],drySheen:state.drySheen,wetRegions:[...state.wetRegions],objects:state.objects.map(o=>({...o,at:[...o.at],light:o.light?[...o.light]:undefined})),grid:state.grid?{...state.grid,vanishing:state.grid.vanishing?[...state.grid.vanishing]:undefined}:undefined,comparison:state.comparison?{...state.comparison}:undefined};}
export class SnapshotCache {
  private entries=new Map<number,Checkpoint>();
  private readonly shared=new WeakSet<HTMLCanvasElement>();
  bytes=0;
  readonly budget=48*1024*1024;
  get size():number{return this.entries.size;}
  isShared(canvas:HTMLCanvasElement):boolean{return this.shared.has(canvas);}
  get(index:number):Checkpoint|undefined {const cp=this.entries.get(index);if(cp){this.entries.delete(index);this.entries.set(index,cp);}return cp;}
  nearest(index:number):[number,Checkpoint]|undefined {let nearest=-1;for(const key of this.entries.keys())if(key<=index&&key>nearest)nearest=key;const cp=this.get(nearest);return cp?[nearest,cp]:undefined;}
  save(index:number,layers:Record<LayerName,HTMLCanvasElement>,state:LogicalState):void {
    if(this.entries.has(index))return;const images:Checkpoint['images']={};let bytes=0;
    const active:LayerName[]=[];
    for(const name of state.active){
      const image=layers[name];let nonempty=name==='under';
      // A known painted under layer is never read back, converted or redrawn
      // while inspecting unrelated layers. It keeps the original raster.
      if(!nonempty){const pixels=context(image).getImageData(0,0,image.width,image.height).data;for(let i=3;i<pixels.length;i+=4)if(pixels[i]){nonempty=true;break;}}
      if(!nonempty)continue;active.push(name);images[name]=image;bytes+=image.width*image.height*4;
    }
    const stored=cloneState(state);stored.active=active;
    const cp={images,state:stored,bytes};while(this.bytes+bytes>this.budget&&this.entries.size){const oldest=this.entries.keys().next().value!;this.remove(oldest);}if(bytes<=this.budget){for(const image of Object.values(images))if(image)this.shared.add(image);this.entries.set(index,cp);this.bytes+=bytes;}
  }
  private remove(index:number):void {const cp=this.entries.get(index);if(!cp)return;cp.images={};this.bytes-=cp.bytes;this.entries.delete(index);}
  clear():void {for(const index of [...this.entries.keys()])this.remove(index);}
}
