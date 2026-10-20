import type { Action, Script, RegionShape, Point } from './types';
import { hashSeed, rng } from './rng';
import { pathLines, sampleLines, sweepLines, regionBounds, resolveRegion, pointInRegion } from './shapes';
import type { Sample, Bounds } from './shapes';

export interface CompiledAction { action:Action; seed:number; samples:Sample[]; region?:RegionShape; bounds:Bounds }
export interface CompiledStep { actions:CompiledAction[]; durationMs:number }
export interface CompiledScript { steps:CompiledStep[]; points:number }
const supported=new Set(['hand.enter','hand.exit','hand.move','pencil.stroke','pencil.hatch','crayon.stroke','crayon.fill','smudge','paint.stroke','paint.wash','paint.drop','paint.bleed','paint.dry','paint.soften','fx.sheen','scratch.cover','scratch.stroke','note.arrow','note.circle','note.label','zoom.to','zoom.reset','wait','frottage.setup','frottage.rub','tool.place','scene.object','compare','note.meter','paint.mix','paint.dab','eraser.stroke','stencil','splatter','drip','blow','decal.fold','marble.swirl','marble.transfer','stamp.press','grid.show','grid.hide']);
function hatchLines(r:RegionShape,angle:number,spacing:number):Point[][] {
  const b=regionBounds(r),cx=b.x+b.w/2,cy=b.y+b.h/2,rad=angle*Math.PI/180,dx=Math.cos(rad),dy=Math.sin(rad),nx=-dy,ny=dx,extent=Math.hypot(b.w,b.h),out:Point[][]=[];
  for(let offset=-extent/2;offset<=extent/2;offset+=spacing){
    const px=cx+nx*offset,py=cy+ny*offset;let lo=-extent,hi=extent;
    for(const [pos,dir,min,max] of [[px,dx,b.x,b.x+b.w],[py,dy,b.y,b.y+b.h]]){
      if(Math.abs(dir)<1e-7){if(pos<min||pos>max){lo=1;hi=0;break;}}else {const t1=(min-pos)/dir,t2=(max-pos)/dir;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
    }if(hi>lo)out.push([[px+dx*lo,py+dy*lo],[px+dx*hi,py+dy*hi]]);
  }return out;
}
export function compileScript(script:Script):CompiledScript {
  let points=0;
  const steps=script.steps.map(step=>({durationMs:step.durationMs,actions:step.actions.map(action=>{
    if(!supported.has(action.type))throw new Error(`未対応のアクション: ${action.type}`);
    const region='region'in action?resolveRegion(action.region,script):undefined;
    const seed=hashSeed(script.seed,step.id,action.id);
    let samples:Sample[]=[];
    if(action.type==='paint.dab'&&region){const b=regionBounds(region),random=rng(seed),count=action.count??16;samples=Array.from({length:count},(_,i)=>{let x=b.x,y=b.y;for(let attempt=0;attempt<1000;attempt++){x=b.x+b.w*random();y=b.y+b.h*random();if(pointInRegion(region,x,y))break;}return {x,y,angle:0,p:(i+1)/count,move:true};});}
    else if(action.type==='blow'){const random=rng(seed),dir=action.direction??[1,0],angle=Math.atan2(dir[1],dir[0]),length=action.length??220,branches=action.branches??6,lines:Point[][]=[];for(let i=0;i<branches;i++){const turn=angle+(i/(Math.max(1,branches-1))-.5)*1.1,points:Point[]=[action.at];for(let j=1;j<=18;j++){const d=length*j/18*(.75+random()*.25),bend=(random()-.5)*16;points.push([Math.max(0,Math.min(1000,action.at[0]+Math.cos(turn)*d-Math.sin(turn)*bend)),Math.max(0,Math.min(625,action.at[1]+Math.sin(turn)*d+Math.cos(turn)*bend))]);}lines.push(points);}samples=sampleLines(lines,3);}
    else if(action.type==='stamp.press'){const count=action.count??1,size=action.size??70;samples=Array.from({length:count},(_,i)=>({x:Math.min(990,action.at[0]+i*size*1.3),y:action.at[1],angle:0,p:(i+1)/count,move:true}));}
    else if('path'in action)samples=sampleLines(pathLines(action.path),action.type==='pencil.stroke'?1.5:action.type==='crayon.stroke'?Math.max(2,(action.width??12)/5):2.5);
    else if(action.type==='pencil.hatch'&&region){let lines=hatchLines(region,action.angle??45,action.spacing??10);if(action.cross)lines=lines.concat(hatchLines(region,(action.angle??45)+90,action.spacing??10));samples=sampleLines(lines,2.5);}
    else if(region)samples=sampleLines(sweepLines(region,45),5);
    else if('at'in action&&action.at)samples=[{x:action.at[0],y:action.at[1],angle:0,p:0,move:true}];
    const width='width'in action?action.width??16:'size'in action?action.size??30:30;
    let bounds=region&&action.type!=='stencil'?regionBounds(region):samples.length?{x:Math.min(...samples.map(p=>p.x))-width,y:Math.min(...samples.map(p=>p.y))-width,w:Math.max(...samples.map(p=>p.x))-Math.min(...samples.map(p=>p.x))+width*2,h:Math.max(...samples.map(p=>p.y))-Math.min(...samples.map(p=>p.y))+width*2}:{x:0,y:0,w:1000,h:625};
    bounds={x:Math.max(0,Math.floor(bounds.x-5)),y:Math.max(0,Math.floor(bounds.y-5)),w:Math.ceil(bounds.w+10),h:Math.ceil(bounds.h+10)};
    bounds.w=Math.max(1,Math.min(bounds.w,1000-bounds.x));bounds.h=Math.max(1,Math.min(bounds.h,625-bounds.y));points+=samples.length;
    if(samples.some(s=>s.x<0||s.x>1000||s.y<0||s.y>625)||samples.length>50000)throw new Error(`生成した経路が範囲外または複雑すぎます: ${action.id}`);
    return {action,seed,samples,region,bounds};
  }).sort((a,b)=>a.action.t-b.action.t)}));
  return {steps,points};
}
