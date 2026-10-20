import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseScript, validateScript } from '../src/engine/schema';
import { mixPaint } from '../src/engine/mixing';
import { compileScript } from '../src/engine/compiler';
import { cloneState, initialState } from '../src/engine/snapshots';
import { pointInRegion } from '../src/engine/shapes';
import { Renderer } from '../src/engine/stage';
import { softenedPigment } from '../src/engine/techniques';
import type { Action, Script, RegionShape } from '../src/engine/types';
import w11 from '../public/data/anim/W-11.json';

const region={shape:'rect',x:120,y:140,w:500,h:300} as const;
const path={points:[[140,170],[570,390]] as [number,number][]};
const make=(action:unknown)=>{const script=structuredClone(w11) as any;script.steps[0].actions=[{id:'feature',t:0,dur:1000,...action as object}];return script;};
const child:Script={schemaVersion:1,id:'P-01',seed:10,stage:{paper:'gayoushi',view:'top',mirror:'handedness'},regions:{},steps:[{id:'line',durationMs:5000,caption:'線を見よう',description:'線の広がり',actions:[{id:'line',type:'pencil.stroke',t:0,dur:3000,path}]}]};

describe('expanded script contracts',()=>{
  const cases:unknown[]=[
    {type:'frottage.setup',pattern:'leaf',region},{type:'frottage.rub',path,color:'kiiro'},
    {type:'tool.place',item:'palette',to:[250,300]},{type:'scene.object',objectId:'tree',sprite:'tree',at:[500,300],rotation:15,light:[200,50]},
    {type:'note.meter',label:'力のかげん',value:[[0,0],[1,1]]},{type:'paint.mix',region,colors:['aka','kiiro'],amounts:[1,1]},{type:'paint.soften',path,width:24,strength:.5},
    {type:'paint.dab',region,color:'aka',tool:'sponge',count:30},{type:'eraser.stroke',path},
    {type:'crayon.stroke',path,color:'kiiro',resist:true},{type:'stencil',region,path,color:'aka'},
    {type:'splatter',region,color:'ao'},{type:'drip',path,color:'ao'},{type:'blow',at:[250,250],color:'aka',direction:[1,.4]},
    {type:'decal.fold',region},{type:'marble.swirl',region,colors:['ao','kiiro']},{type:'stamp.press',at:[300,300],color:'aka',shape:'vegetable'},
    {type:'marble.transfer',region,to:[725,430],scale:.5},
    {type:'grid.show',kind:'perspective',vanishing:[500,200]},{type:'grid.hide'},
    {type:'compare',left:child,right:{...child,seed:20},labels:['立てる','ねかせる']},
  ];
  it.each(cases)('validates and compiles feature %j',action=>{
    const raw=make(action);if((action as {type:string}).type==='frottage.rub')raw.steps[0].actions.unshift({id:'setup',type:'frottage.setup',t:0,dur:0,region,pattern:'leaf'});expect(validateScript(raw)).toEqual([]);const compiled=compileScript(parseScript(raw));expect(compiled.steps[0].actions.at(-1)!.action.type).toBe((action as {type:string}).type);
  });
  it('rejects a zero pigment total, mismatched ratios, water pigment and unknown scene assets',()=>{
    for(const action of [{type:'paint.mix',region,colors:['aka'],amounts:[0]},{type:'paint.mix',region,colors:['aka','ao'],amounts:[1]},{type:'paint.mix',region,colors:['water'],amounts:[1]},{type:'scene.object',objectId:'bad',sprite:'glove',at:[200,200]},{type:'tool.place',item:'sleeve',to:[200,200]}])expect(validateScript(make(action)).length).toBeGreaterThan(0);
  });
  it('allows a short independent comparison child, rejects nested comparisons and does not change input',()=>{
    const comparison=make({type:'compare',left:child,right:child,labels:['A','B']}),before=structuredClone(comparison);
    const parsed=parseScript(comparison);expect(parsed.steps[0].actions[0]).toMatchObject({left:{steps:[{actions:[{width:2}]}]}});expect(comparison).toEqual(before);
    const nested=structuredClone(child);nested.steps[0].actions=[{id:'nested',type:'compare',t:0,dur:3000,left:child,right:child,labels:['A','B']}];expect(validateScript(make({type:'compare',left:nested,right:child,labels:['A','B']})).join()).toContain('入れ子');
  });
  it('keeps relief, resist and erasing write conflicts explicit',()=>{
    const raw=make({type:'pencil.stroke',path});raw.steps[0].actions.push({id:'erase',t:500,dur:1000,type:'eraser.stroke',path});expect(validateScript(raw).join()).toContain('同じ状態 paint');
  });
  it('rejects a transferred sheet that would extend beyond the drawing stage',()=>{expect(validateScript(make({type:'marble.transfer',region,to:[990,600],scale:1})).join()).toContain('ステージ外');});
});

describe('pigment approximation invariants',()=>{
  it('is independent of ingredient order and common ratio scale',()=>{expect(mixPaint(['aka','ao'],[1,3])).toBe(mixPaint(['ao','aka'],[3,1]));expect(mixPaint(['aka','ao'],[1,3])).toBe(mixPaint(['aka','ao'],[10,30]));});
  it('keeps pure colors, zero-weight ingredients, white and black distinct',()=>{
    expect(mixPaint(['aka'],[1])).toBe('#E8382F');expect(mixPaint(['aka','ao'],[1,0])).toBe('#E8382F');
    const luminance=(hex:string)=>[1,3,5].reduce((n,i)=>n+parseInt(hex.slice(i,i+2),16),0);
    expect(luminance(mixPaint(['aka','shiro'],[1,1]))).toBeGreaterThan(luminance(mixPaint(['aka'],[1])));
    expect(luminance(mixPaint(['aka','kuro'],[1,1]))).toBeLessThan(luminance(mixPaint(['aka'],[1])));
    expect(()=>mixPaint(['aka'],[0])).toThrow();expect(()=>mixPaint(['aka'],[-1])).toThrow();expect(()=>mixPaint(['aka'],[NaN])).toThrow();
  });
});
describe('wet pigment softening',()=>{
  it('leaves an even pigment field and zero strength unchanged',()=>{const field=new Uint8ClampedArray(Array.from({length:25},()=>[220,40,30,170]).flat()),bounds={x:0,y:0,w:5,h:5};expect(softenedPigment(field,5,5,bounds,2,1)).toEqual(field);expect(softenedPigment(field,5,5,bounds,2,0)).toEqual(field);});
  it('softens a color boundary without turning transparent pixels into dark paint',()=>{const field=new Uint8ClampedArray(5*5*4);for(let y=0;y<5;y++)for(let x=0;x<2;x++)field.set([240,30,20,255],(y*5+x)*4);const result=softenedPigment(field,5,5,{x:0,y:0,w:5,h:5},2,1),i=(2*5+2)*4;expect(result[i+3]).toBeGreaterThan(0);expect(result[i+3]).toBeLessThan(255);expect(Array.from(result.slice(i,i+3))).toEqual([240,30,20]);expect(field[i+3]).toBe(0);});
  it('mixes the existing wet colors at the boundary while keeping the source immutable',()=>{const field=new Uint8ClampedArray(Array.from({length:25},(_,i)=>i%5<2?[240,20,20,255]:[20,20,240,255]).flat()),before=field.slice(),result=softenedPigment(field,5,5,{x:0,y:0,w:5,h:5},2,1),i=(2*5+2)*4;expect(result[i]).toBeGreaterThan(20);expect(result[i+2]).toBeGreaterThan(20);expect(result[i+3]).toBe(255);expect(field).toEqual(before);});
});

describe('deterministic new geometry and restoration',()=>{
  it('dabs stay inside an ellipse and regenerate identical contacts',()=>{
    const ellipse:RegionShape={shape:'ellipse',cx:500,cy:300,rx:160,ry:80},script=parseScript(make({type:'paint.dab',region:ellipse,color:'aka',count:100}));
    const first=compileScript(script).steps[0].actions[0].samples;expect(first).toEqual(compileScript(script).steps[0].actions[0].samples);expect(first.every(s=>pointInRegion(ellipse,s.x,s.y))).toBe(true);
  });
  it('blown branches stay bounded and are disconnected',()=>{
    const samples=compileScript(parseScript(make({type:'blow',at:[980,610],color:'aka',direction:[1,1],length:500,branches:12}))).steps[0].actions[0].samples;
    expect(samples.every(s=>s.x>=0&&s.x<=1000&&s.y>=0&&s.y<=625)).toBe(true);expect(samples.filter(s=>s.move)).toHaveLength(12);
  });
  it('new leaf and rectangle generators close their contour and retain stage bounds',()=>{
    for(const path of [{gen:'leaf',cx:500,cy:300,rx:90,ry:150},{gen:'rectangle',x:100,y:100,w:400,h:200}]){const points=compileScript(parseScript(make({type:'pencil.stroke',path}))).steps[0].actions[0].samples;expect(points[0].x).toBeCloseTo(points.at(-1)!.x);expect(points[0].y).toBeCloseTo(points.at(-1)!.y);expect(points.every(s=>s.x>=0&&s.x<=1000&&s.y>=0&&s.y<=625)).toBe(true);}
  });
  it('clones scene, grid and comparison state without shared mutable points',()=>{
    const original=initialState();original.objects=[{id:'tree',sprite:'tree',at:[200,300],scale:1,z:0,opacity:1,rotation:0,light:[400,20]}];original.grid={kind:'perspective',vanishing:[500,200]};original.comparison={step:0,actionId:'compare',p:.3};
    const copy=cloneState(original);original.objects[0].at[0]=999;original.objects[0].light![0]=999;original.grid.vanishing![0]=999;original.comparison.p=1;
    expect(copy.objects[0].at[0]).toBe(200);expect(copy.objects[0].light![0]).toBe(400);expect(copy.grid!.vanishing![0]).toBe(500);expect(copy.comparison!.p).toBe(.3);
  });
});

describe('scene seek and direct video composition',()=>{
  function canvas():HTMLCanvasElement {const ctx=new Proxy({measureText:()=>({width:20}),getImageData:()=>({data:new Uint8ClampedArray(1000*625*4)})},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>undefined});return {width:1000,height:625,getContext:()=>ctx,getBoundingClientRect:()=>({width:1000,height:625})} as unknown as HTMLCanvasElement;}
  beforeEach(()=>{vi.stubGlobal('document',{createElement:canvas});vi.stubGlobal('window',{devicePixelRatio:1});});afterEach(()=>vi.unstubAllGlobals());
  it('moving the same object across steps restores the original intermediate position after seeking',()=>{
    const script:Script={...child,steps:[{...child.steps[0],actions:[{id:'place',type:'scene.object',t:0,dur:0,objectId:'tree',sprite:'tree',at:[200,300]}]},{...child.steps[0],id:'move',actions:[{id:'move',type:'scene.object',t:0,dur:1000,objectId:'tree',sprite:'tree',at:[600,300],rotation:90}]}]};
    const renderer=new Renderer(canvas(),script),state=()=>cloneState((renderer as unknown as {state:ReturnType<typeof initialState>}).state);
    renderer.render(1,500,{left:false,still:true});const halfway=state();expect(halfway.objects[0]).toMatchObject({at:[400,300],rotation:45});renderer.render(1,1000,{left:false,still:true});expect(state().objects[0].at).toEqual([600,300]);renderer.render(1,500,{left:false,still:true});expect(state()).toEqual(halfway);
    const output=canvas();renderer.renderTo(output);expect(output.width).toBe(1000);expect(output.height).toBe(625);renderer.dispose();
  });
  it('reuses a visited end without executing materials again and preserves empty logical active flags',()=>{
    const renderer=new Renderer(canvas(),child),internal=renderer as unknown as {state:ReturnType<typeof initialState>;executeStep:(index:number,time:number)=>void},execute=vi.spyOn(internal,'executeStep');
    renderer.render(0,5000,{left:false,still:true});const end=cloneState(internal.state);expect(end.active).toContain('paint');expect(execute).toHaveBeenCalledTimes(1);
    renderer.render(0,5000,{left:true,still:true});expect(internal.state).toEqual(end);expect(execute).toHaveBeenCalledTimes(1);
    renderer.render(0,1500,{left:false,still:true});expect(execute).toHaveBeenCalledTimes(2);renderer.render(0,5000,{left:false,still:true});expect(internal.state).toEqual(end);expect(execute).toHaveBeenCalledTimes(2);
    (renderer as unknown as {snapshots:{clear:()=>void}}).snapshots.clear();renderer.render(0,5000,{left:false,still:true});expect(internal.state).toEqual(end);expect(execute).toHaveBeenCalledTimes(3);
    expect(renderer.getStats().snapshotBytes).toBeLessThanOrEqual(48*1024*1024);renderer.dispose();
  });
  it('reuses the completed checkpoint while carrying an unfinished tool exit into the next step',()=>{
    const script:Script={...child,steps:[{...child.steps[0],actions:[{id:'enter',type:'hand.enter',t:0,dur:400,tool:'pencil'},{id:'exit',type:'hand.exit',t:4900,dur:100}]},{...child.steps[0],id:'observe',actions:[{id:'wait',type:'wait',t:0,dur:5000}]}]},renderer=new Renderer(canvas(),script),state=()=>cloneState((renderer as unknown as {state:ReturnType<typeof initialState>}).state);
    renderer.render(0,5000,{left:false,still:true});const end=state();expect(end.toolMotion).toMatchObject({kind:'exit',elapsedMs:100});expect(end.tool.visible).toBe(true);
    renderer.render(0,5000,{left:false,still:true});expect(state()).toEqual(end);renderer.render(1,0,{left:false,still:true});expect(state()).toEqual(end);
    renderer.render(1,150,{left:false,still:true});expect(state().toolMotion?.elapsedMs).toBe(250);renderer.render(0,5000,{left:false,still:true});expect(state()).toEqual(end);renderer.dispose();
  });
  it('retains the completed comparison through a checkpoint and restores it after a partial comparison',()=>{
    const script:Script={...child,steps:[{...child.steps[0],actions:[{id:'compare',type:'compare',t:0,dur:5000,left:child,right:child,labels:['A','B']}]},{...child.steps[0],id:'observe',actions:[]}]},renderer=new Renderer(canvas(),script),state=()=>cloneState((renderer as unknown as {state:ReturnType<typeof initialState>}).state);
    renderer.render(0,5000,{left:true,still:true});const end=state();expect(end.comparison).toEqual({step:0,actionId:'compare',p:1});renderer.render(1,0,{left:true,still:true});expect(state()).toEqual(end);
    renderer.render(0,2500,{left:true,still:true});expect(state().comparison?.p).toBe(.5);renderer.render(0,5000,{left:true,still:true});expect(state()).toEqual(end);renderer.dispose();
  });
  it('keeps placed paper and palette below subsequent pigment, with deterministic entry and seek',()=>{
    const script:Script={...child,steps:[{...child.steps[0],actions:[{id:'paper',type:'tool.place',t:0,dur:0,item:'paper',to:[500,300]},{id:'palette',type:'tool.place',t:0,dur:1000,item:'palette',to:[700,300]}]}]};
    const renderer=new Renderer(canvas(),script),state=()=>cloneState((renderer as unknown as {state:ReturnType<typeof initialState>}).state);renderer.render(0,500,{left:false,still:true});const halfway=state();expect(halfway.objects.find(o=>o.sprite==='palette')).toMatchObject({at:[700,75]});expect(halfway.objects.every(o=>o.z<0)).toBe(true);renderer.render(0,1000,{left:false,still:true});renderer.render(0,500,{left:false,still:true});expect(state()).toEqual(halfway);renderer.dispose();
  });
  it('keeps comparison cameras and pictures independent while sharing the parent time',()=>{
    const right:Script={...child,steps:[{...child.steps[0],actions:[{id:'zoom',type:'zoom.to',t:0,dur:2000,rect:[200,100,400,250]}]}]};
    const script:Script={...child,steps:[{...child.steps[0],actions:[{id:'compare',type:'compare',t:0,dur:5000,left:child,right,labels:['立てる','ねかせる']}]}]};
    const renderer=new Renderer(canvas(),script);renderer.render(0,2500,{left:true,still:true});const pair=(renderer as unknown as {comparison:{renderers:Renderer[]}}).comparison.renderers,states=pair.map(r=>cloneState((r as unknown as {state:ReturnType<typeof initialState>}).state));
    expect(states[0].camera).toEqual({x:0,y:0,w:1000,h:625});expect(states[1].camera).toEqual({x:200,y:100,w:400,h:250});expect(pair.map(r=>(r as unknown as {currentTime:number}).currentTime)).toEqual([2500,2500]);renderer.dispose();
  });
  it('releases the previous pair when a different comparison replaces it',()=>{
    const comparison:Action={id:'first',type:'compare',t:0,dur:1000,left:child,right:child,labels:['A','B']};const script:Script={...child,steps:[{...child.steps[0],actions:[comparison,{...comparison,id:'second',t:1500}]}]};
    const renderer=new Renderer(canvas(),script);renderer.render(0,500,{left:false,still:true});const old=(renderer as unknown as {comparison:{canvases:HTMLCanvasElement[];renderers:Renderer[]}}).comparison;renderer.render(0,2000,{left:false,still:true});expect(old.canvases.every(c=>c.width===1&&c.height===1)).toBe(true);expect(()=>old.renderers[0].render(0,0,{left:false,still:true})).toThrow('解放済み');renderer.dispose();
  });
  it('persists and hides guides through checkpoints without permanently baking them into artwork',()=>{
    const script:Script={...child,steps:[{...child.steps[0],actions:[{id:'show',type:'grid.show',t:0,dur:0,kind:'perspective',vanishing:[400,220]}]},{...child.steps[0],id:'hide',actions:[{id:'hide',type:'grid.hide',t:500,dur:0}]}]};
    const renderer=new Renderer(canvas(),script),state=()=>cloneState((renderer as unknown as {state:ReturnType<typeof initialState>}).state);renderer.render(1,0,{left:false,still:true});expect(state().grid).toEqual({kind:'perspective',vanishing:[400,220]});renderer.render(1,500,{left:false,still:true});expect(state().grid).toBeUndefined();renderer.render(1,0,{left:false,still:true});expect(state().grid?.vanishing).toEqual([400,220]);expect(state().active).toEqual([]);renderer.dispose();
  });
});
