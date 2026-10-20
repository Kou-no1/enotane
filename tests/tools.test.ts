import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceToolMotion, cloneState, createToolMotion, enteringTool, exitingTool, followingTool, initialState, movingTool, offscreenToolPoint, toolAngleForAction, toolColorForAction, toolForAction, toolModeForAction, TOOL_FIXED_ANGLE, TOOL_LOWER_MS, TOOL_SLIDE_MS } from '../src/engine/snapshots';
import type { LogicalState } from '../src/engine/snapshots';
import { Renderer } from '../src/engine/stage';
import { compileScript } from '../src/engine/compiler';
import { sampleLines } from '../src/engine/shapes';
import { COLORS } from '../src/engine/textures';
import { TOOL_ANGLE, TOOL_SCALE, toolPaintColor, toolShadowOffset } from '../src/engine/tools';
import type { Action, Script, Tool } from '../src/engine/types';
import type { Sample } from '../src/engine/shapes';

const pencil:Action={id:'line',type:'pencil.stroke',t:100,dur:1000,path:{points:[[100,140],[300,140]]}};
const samples:Sample[]=[{x:100,y:140,angle:0,p:0,move:true},{x:200,y:140,angle:0,p:.5,move:false},{x:300,y:140,angle:0,p:1,move:false}];
const visible=()=>({...initialState().tool,visible:true});
const camera={x:0,y:0,w:1000,h:625};

 describe('tool contact and fixed orientation',()=>{
  it('anchors to the last actually painted stamp, including the final contact',()=>{
    expect(followingTool(visible(),pencil,samples,.75)).toMatchObject({x:200,y:140,lift:0,angle:-55});
    expect(followingTool(visible(),pencil,samples,1)).toMatchObject({x:300,y:140,lift:0,angle:-55});
  });
  it('uses one fixed angle for a curved stroke at every playback time',()=>{
    const curve=sampleLines([[[20,20],[150,10],[200,100],[100,170],[20,20]]],2);
    for(let i=0;i<=100;i++)expect(followingTool(visible(),pencil,curve,i/100).angle).toBe(-55);
    expect(TOOL_FIXED_ANGLE).toBe(TOOL_ANGLE);
  });
  it('fixes a laid crayon perpendicular to its first connected segment',()=>{
    const action:Action={id:'lay',type:'crayon.stroke',t:0,dur:1000,path:{points:[[20,20],[100,100],[200,20]]},mode:'lay',color:'aka'};
    const curve=sampleLines([[[20,20],[100,100],[200,20]]],2);
    for(const p of [0,.2,.5,.8,1])expect(followingTool(visible(),action,curve,p)).toMatchObject({mode:'lay',angle:135});
    expect(toolAngleForAction('lay',[])).toBe(-55);
    expect(toolAngleForAction('stand',curve)).toBe(-55);
  });
  it('does not use a disconnected jump as the laid crayon tangent',()=>{
    const points:Sample[]=[{x:0,y:0,p:0,move:true,angle:0},{x:80,y:90,p:.2,move:true,angle:0},{x:80,y:110,p:.5,move:false,angle:Math.PI/2}];
    expect(toolAngleForAction('lay',points)).toBe(180);
  });
  it('keeps disconnected-dot contacts on an existing painted sample',()=>{
    const dots:Sample[]=[{x:100,y:200,angle:0,p:0,move:true},{x:200,y:200,angle:0,p:.5,move:true},{x:300,y:200,angle:0,p:1,move:true}];
    expect(followingTool(visible(),pencil,dots,.25)).toMatchObject({x:100,y:200});
    expect(followingTool(visible(),pencil,dots,.5)).toMatchObject({x:200,y:200});
  });
  it('does not reveal hidden tools or invent contacts for an action without samples',()=>{
    const hidden=initialState().tool,shown=visible();
    expect(followingTool(hidden,pencil,samples,.5)).toBe(hidden);
    expect(followingTool(shown,pencil,[],.5)).toBe(shown);
  });
});

 describe('lifting, entry, exit and replay',()=>{
  it('lowers a raised tool smoothly in exactly 150 ms without moving its contact',()=>{
    const start=visible();
    expect(followingTool(start,pencil,samples,.1,0).lift).toBe(1);
    expect(followingTool(start,pencil,samples,.1,75).lift).toBe(.5);
    expect(followingTool(start,pencil,samples,.1,150).lift).toBe(0);
    expect(followingTool(start,pencil,samples,.1,300).lift).toBe(0);
    expect(TOOL_LOWER_MS).toBe(150);
    for(const ms of [0,75,150])expect(followingTool(start,pencil,samples,.1,ms)).toMatchObject({x:100,y:140});
  });
  it('retains contact shadow between consecutive drawing actions and raises only an unpainted move',()=>{
    const down={...visible(),lift:0};
    expect(followingTool(down,pencil,samples,0,0).lift).toBe(0);
    expect(movingTool(down,[400,300],.5)).toMatchObject({x:(down.x+400)/2,y:(down.y+300)/2,lift:1});
    expect(movingTool(down,[400,300],1)).toMatchObject({x:400,y:300,angle:-55,lift:1});
  });
  it('places the complete tool outside the upper-right camera corner, including zoomed views',()=>{
    for(const view of [camera,{x:280,y:170,w:416,h:260}]){
      const [x,y]=offscreenToolPoint(view);expect(x).toBeGreaterThan(view.x+view.w);expect(y).toBeLessThan(view.y);
      const state=enteringTool(visible(),'pencil',[170,140],view,0,pencil,samples);
      expect([state.x,state.y]).toEqual([x,y]);expect(state.angle).toBe(-55);
    }
  });
  it('uses 400 ms for entry and exit even when a legacy action duration is 300 ms',()=>{
    const target:[number,number]=[170,140],start=visible();
    const at300=enteringTool(start,'pencil',target,camera,300,pencil,samples);
    expect(at300.x).toBeGreaterThan(target[0]);expect(at300.y).toBeLessThan(target[1]);
    expect(enteringTool(start,'pencil',target,camera,400,pencil,samples)).toMatchObject({x:170,y:140,visible:true,lift:1});
    expect(exitingTool({...start,x:170,y:140},camera,300).visible).toBe(true);
    expect(exitingTool({...start,x:170,y:140},camera,400)).toMatchObject({x:1220,y:-220,visible:false});
    expect(TOOL_SLIDE_MS).toBe(400);
  });
  it('gives an unchanged drawing start precedence over an unfinished entrance',()=>{
    const wash:Action={id:'wash',type:'paint.wash',t:300,dur:2600,color:'water',region:{shape:'rect',x:100,y:100,w:400,h:300}};
    const start=enteringTool(visible(),'brush-round',[100,140],camera,300,wash,samples);
    expect(start.x).not.toBe(100);
    expect(followingTool(start,wash,samples,0,0)).toMatchObject({x:100,y:140,kind:'brush-round',color:'#BFE3F2'});
  });
  it('reconstructs the same tool state after forward and backward seeks',()=>{
    const replay=(elapsed:number)=>followingTool(enteringTool(visible(),'pencil',[100,140],camera,elapsed,pencil,samples),pencil,samples,elapsed/1000,elapsed);
    const earlier=replay(370);replay(980);expect(replay(370)).toEqual(earlier);
    expect(visible().lift).toBe(1);
  });
  it('copies tool contact, orientation and fractional lifting in checkpoints independently',()=>{
    const state=initialState();state.tool={...state.tool,visible:true,mode:'lay',angle:135,lift:.5};
    const restored=cloneState(state);state.tool.mode='stand';state.tool.angle=-55;state.tool.lift=1;
    expect(restored.tool).toMatchObject({mode:'lay',angle:135,lift:.5});
    expect(restored.tool).not.toBe(state.tool);
  });
});

 describe('tool appearance and action compatibility',()=>{
  it('applies .8 to logical coordinates and the requested contact/raised shadow offsets',()=>{
    expect(TOOL_SCALE).toBe(.8);expect(toolShadowOffset(0)).toEqual([6,7]);expect(toolShadowOffset(1)).toEqual([12,14]);expect(toolShadowOffset(.5)).toEqual([9,10.5]);
    expect(toolShadowOffset(-1)).toEqual([6,7]);expect(toolShadowOffset(2)).toEqual([12,14]);
  });
  it('sets the brush tip to the exact current paint colour, including water after red paint',()=>{
    const red:Action={id:'red',type:'paint.stroke',t:0,dur:1000,path:{points:[[0,0],[100,0]]},color:'aka'};
    const blue:Action={...red,id:'blue',color:'ao'};
    const water:Action={id:'water',type:'paint.wash',t:0,dur:1000,color:'water',region:{shape:'rect',x:0,y:0,w:100,h:100}};
    expect(toolColorForAction(red,'#000000')).toBe(COLORS.aka);expect(toolColorForAction(blue,COLORS.aka)).toBe(COLORS.ao);
    expect(toolColorForAction(water,COLORS.aka)).toBe('#BFE3F2');expect(toolPaintColor('water')).toBe('#BFE3F2');
    expect(enteringTool({...visible(),color:COLORS.aka},'brush-round',[0,0],camera,0,water).color).toBe('#BFE3F2');
  });
  it('uses the current visible stripe colour for a multicolour crayon fill',()=>{
    const fill:Action={id:'fill',type:'crayon.fill',t:0,dur:1000,region:{shape:'rect',x:100,y:140,w:200,h:100},colors:['kiiro','ao'],pattern:'stripes'};
    expect(followingTool(visible(),fill,samples,0)).toMatchObject({color:COLORS.kiiro});
    expect(followingTool(visible(),fill,samples,1)).toMatchObject({color:COLORS.ao});
    const cover:Action={id:'cover',type:'scratch.cover',t:0,dur:1000,region:{shape:'rect',x:100,y:140,w:200,h:100}};
    expect(toolColorForAction(cover,COLORS.aka)).toBe(COLORS.kuro);
  });
  it('chooses the existing tool IDs without altering action data',()=>{
    const scratch:Action={id:'scratch',type:'scratch.stroke',t:0,dur:1000,path:{points:[[10,10],[20,20]]},width:4};
    const stroke:Action={id:'paint',type:'paint.stroke',t:0,dur:1000,path:{points:[[10,10],[20,20]]},color:'aka',brush:'flat'};
    const drop:Action={id:'drop',type:'paint.drop',t:0,dur:300,at:[10,20],color:'aka',size:20};
    expect(toolForAction(scratch,'pencil')).toBe('waribashi');expect(toolForAction(stroke,'pencil')).toBe('brush-flat');expect(toolForAction(drop,'brush-flat')).toBe('brush-flat');expect(toolForAction(drop,'pencil')).toBe('brush-round');
    expect(toolForAction(pencil,'brush-round')).toBe('pencil');expect(pencil.type).toBe('pencil.stroke');
  });
  it('uses a circular contact marker ID for finger smudging and retains the existing soft-tool IDs',()=>{
    const smudge:Action={id:'rub',type:'smudge',t:0,dur:1000,path:{points:[[10,10],[20,20]]}};
    expect(followingTool(visible(),smudge,samples,.5)).toMatchObject({kind:'finger',mode:'stand',angle:-55});
    for(const kind of ['tissue','cotton'] as const)expect(toolForAction({...smudge,tool:kind},'pencil')).toBe(kind);
    for(const kind of ['pencil','brush-round','brush-flat','crayon','oil-pastel','waribashi','finger'] as Tool[])expect(toolModeForAction(kind)).toBe('stand');
  });
  it('preserves the three legacy action names and their authored durations in compilation',()=>{
    const actions:Action[]=[{id:'enter',type:'hand.enter',t:0,dur:300,tool:'pencil'},{id:'move',type:'hand.move',t:400,dur:200,to:[100,100]},{id:'exit',type:'hand.exit',t:700,dur:300}];
    const script:Script={schemaVersion:1,id:'compat',seed:1,stage:{paper:'gayoushi',view:'top',mirror:'handedness'},regions:{},steps:[{id:'one',durationMs:1200,caption:'',description:'',actions}]};
    expect(compileScript(script).steps[0].actions.map(c=>c.action)).toEqual(actions);
  });
});

describe('slides across step checkpoints',()=>{
  function testCanvas():HTMLCanvasElement {
    const ctx=new Proxy({}, {get:()=>()=>undefined});
    return {width:1000,height:625,getContext:()=>ctx,getBoundingClientRect:()=>({width:1000,height:625})} as unknown as HTMLCanvasElement;
  }
  beforeEach(()=>{
    vi.stubGlobal('document',{createElement:testCanvas});
    vi.stubGlobal('window',{devicePixelRatio:1});
  });
  afterEach(()=>vi.unstubAllGlobals());
  const makeScript=(steps:{durationMs:number;actions:Action[]}[]):Script=>({schemaVersion:1,id:'cross-step',seed:1,stage:{paper:'gayoushi',view:'top',mirror:'handedness'},regions:{},steps:steps.map((step,i)=>({...step,id:`step-${i}`,caption:'',description:''}))});
  const stateOf=(renderer:Renderer)=>cloneState((renderer as unknown as {state:LogicalState}).state);
  const entrance:Action={id:'enter',type:'hand.enter',t:0,dur:300,tool:'pencil'};
  const move:Action={id:'move',type:'hand.move',t:500,dur:100,to:[170,140]};
  const exit:Action={id:'exit',type:'hand.exit',t:800,dur:200};
  const options={left:false,still:true};

  it('continues an exit through multiple short steps and disappears only at 400 ms',()=>{
    const renderer=new Renderer(testCanvas(),makeScript([{durationMs:1000,actions:[entrance,move,exit]},{durationMs:50,actions:[]},{durationMs:300,actions:[]}]));
    renderer.render(2,100,options);const at350=stateOf(renderer);
    expect(at350.toolMotion).toMatchObject({kind:'exit',from:[170,140],to:[1220,-220],elapsedMs:350});
    expect(at350.tool.visible).toBe(true);
    const expected=advanceToolMotion({...visible(),x:170,y:140},createToolMotion('exit',[170,140],[1220,-220]),350);
    expect(at350.tool.x).toBeCloseTo(expected.tool.x);expect(at350.tool.y).toBeCloseTo(expected.tool.y);
    renderer.render(2,150,options);expect(stateOf(renderer)).toMatchObject({tool:{visible:false,x:1220,y:-220},toolMotion:undefined});
    renderer.render(2,100,options);expect(stateOf(renderer)).toEqual(at350);
    renderer.dispose();
  });
  it('continues an entrance using its original endpoints after a step ends at 100 ms',()=>{
    const renderer=new Renderer(testCanvas(),makeScript([{durationMs:100,actions:[{...entrance,dur:100}]},{durationMs:400,actions:[]}]));
    renderer.render(1,100,options);const halfway=stateOf(renderer);
    expect(halfway.toolMotion).toMatchObject({kind:'enter',from:[1220,-220],to:[650,360],elapsedMs:200});
    expect(halfway.tool).toMatchObject({visible:true,x:935,y:70});
    renderer.render(1,300,options);expect(stateOf(renderer)).toMatchObject({tool:{visible:true,x:650,y:360},toolMotion:undefined});
    renderer.render(1,100,options);expect(stateOf(renderer)).toEqual(halfway);
    renderer.dispose();
  });
  it('starts a replacement move at the carried slide position when that move begins',()=>{
    const replacement:Action={id:'replace',type:'hand.move',t:50,dur:100,to:[100,100]};
    const renderer=new Renderer(testCanvas(),makeScript([{durationMs:1000,actions:[entrance,move,exit]},{durationMs:500,actions:[replacement]}]));
    renderer.render(1,100,options);const current=stateOf(renderer);
    const atMoveStart=advanceToolMotion({...visible(),x:170,y:140},createToolMotion('exit',[170,140],[1220,-220]),250).tool;
    const expected=movingTool(atMoveStart,[100,100],.5);
    expect(current.tool.x).toBeCloseTo(expected.x);expect(current.tool.y).toBeCloseTo(expected.y);expect(current.toolMotion).toBeUndefined();
    renderer.render(1,400,options);expect(stateOf(renderer).tool).toMatchObject({visible:true,x:100,y:100});
    renderer.render(1,100,options);expect(stateOf(renderer)).toEqual(current);
    renderer.dispose();
  });
  it('cancels a carried exit when drawing takes ownership at its original start',()=>{
    const stroke:Action={...pencil,t:50};
    const renderer=new Renderer(testCanvas(),makeScript([{durationMs:1000,actions:[entrance,move,exit]},{durationMs:500,actions:[stroke]}]));
    renderer.render(1,50,options);expect(stateOf(renderer)).toMatchObject({tool:{visible:true,x:100,y:140,angle:-55},toolMotion:undefined});
    renderer.dispose();
  });
  it('replaces a carried exit with a fresh entrance at the next authored ownership event',()=>{
    const replacement:Action={id:'new-tool',type:'hand.enter',tool:'brush-round',t:25,dur:300};
    const renderer=new Renderer(testCanvas(),makeScript([{durationMs:1000,actions:[entrance,move,exit]},{durationMs:500,actions:[replacement]}]));
    renderer.render(1,100,options);expect(stateOf(renderer)).toMatchObject({tool:{visible:true,kind:'brush-round'},toolMotion:{kind:'enter',from:[1220,-220],to:[650,360],elapsedMs:75}});
    renderer.dispose();
  });
  it('keeps the slide endpoints fixed while the camera continues to zoom',()=>{
    const zoom:Action={id:'zoom',type:'zoom.to',t:0,dur:800,rect:[280,170,416,260]};
    const renderer=new Renderer(testCanvas(),makeScript([{durationMs:1000,actions:[zoom,{...entrance,t:100}]}]));
    renderer.render(0,200,options);const early=stateOf(renderer);
    renderer.render(0,300,options);const later=stateOf(renderer);
    expect(later.toolMotion?.from).toEqual(early.toolMotion?.from);expect(later.toolMotion?.to).toEqual(early.toolMotion?.to);
    expect(later.camera.w).not.toBe(early.camera.w);
    renderer.render(0,200,options);expect(stateOf(renderer)).toEqual(early);
    renderer.dispose();
  });
  it('deep-copies pending endpoints and elapsed time in a restored logical snapshot',()=>{
    const state=initialState();state.toolMotion=createToolMotion('exit',[170,140],[1220,-220]);state.toolMotion.elapsedMs=200;
    const saved=cloneState(state);state.toolMotion.from[0]=999;state.toolMotion.to[1]=999;state.toolMotion.elapsedMs=400;
    expect(saved.toolMotion).toEqual({kind:'exit',from:[170,140],to:[1220,-220],elapsedMs:200});
    const progressed=advanceToolMotion(saved.tool,saved.toolMotion,50);
    expect(progressed.motion?.elapsedMs).toBe(250);expect(saved.toolMotion!.elapsedMs).toBe(200);
    progressed.motion!.from[0]=500;expect(saved.toolMotion!.from[0]).toBe(170);
  });
});
