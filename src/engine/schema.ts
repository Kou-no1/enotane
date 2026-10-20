import type { Action, Script, RegionShape } from './types';
import { captionErrors, plainCaption } from './ruby.ts';
import { regionBounds } from './shapes.ts';

/** Public complexity limits also apply after path expansion in the compiler. */
export const SCRIPT_LIMITS = Object.freeze({ steps: 8, actionsPerStep: 96, regions: 64, points: 4096, subpaths: 128, svgCommands: 512, svgChars: 16384, polygonPoints: 256, radius: 512, width: 128, count: 512, rays: 128, cycles: 64 });
export const PAINT_COLORS = ['shiro', 'kiiro', 'daidai', 'aka', 'momo', 'kimidori', 'midori', 'mizu', 'ao', 'murasaki', 'chairo', 'kuro'] as const;
export const TOOLS = ['pencil', 'crayon', 'oil-pastel', 'brush-round', 'brush-flat', 'waribashi', 'finger', 'tissue', 'cotton', 'bamboo', 'sponge', 'net-brush', 'eraser'] as const;
export const SCENE_SPRITES = ['circle','ellipse','triangle','square','rect','rectangle','apple','dog','leaf','tree','house','flower','mountain','cloud','sun','person','face','palette','water-cup','cloth','paper','tube','paint-tube','tray','straw','net','brush'] as const;
type Obj = Record<string, unknown>;
const BASE = ['id', 'type', 't', 'dur'];
const EXTRA: Record<string, string[]> = {
  'hand.enter': ['tool', 'from'], 'hand.exit': [], 'hand.move': ['to'],
  'pencil.stroke': ['path', 'hardness', 'pressure', 'width', 'mode'], 'pencil.hatch': ['region', 'angle', 'spacing', 'cross'],
  'crayon.stroke': ['path', 'color', 'kind', 'mode', 'pressure', 'width', 'resist'], 'crayon.fill': ['region', 'color', 'colors', 'kind', 'pattern', 'pressure', 'layer'],
  smudge: ['path', 'tool', 'strength', 'width'],
  'paint.stroke': ['path', 'color', 'water', 'brush', 'part', 'width', 'mode', 'layer'], 'paint.wash': ['region', 'color', 'water', 'pattern', 'gradTo', 'mode', 'layer'],
  'paint.drop': ['at', 'color', 'size', 'water'], 'paint.bleed': ['source', 'region', 'radius'], 'paint.dry': ['region'], 'fx.sheen': ['region'],
  'paint.soften':['path','width','strength'],
  'scratch.cover': ['region', 'color'], 'scratch.stroke': ['path', 'width'],
  'note.arrow': ['at', 'to', 'text'], 'note.circle': ['at', 'r', 'text'], 'note.label': ['at', 'text'],
  'zoom.to': ['rect'], 'zoom.reset': [], wait: [],
  'frottage.setup':['pattern','region'], 'frottage.rub':['path','color','width'],
  'tool.place':['item','to','scale','color'], 'scene.object':['objectId','sprite','at','scale','z','rotation','opacity','color','light'],
  compare:['left','right','labels'], 'note.meter':['label','value','at'],
  'paint.mix':['colors','amounts','region'], 'paint.dab':['region','color','tool','count'],
  'eraser.stroke':['path','width','layer'], stencil:['region','path','color','width','side'],
  splatter:['region','color','count','size'], drip:['path','color','width'], blow:['at','color','direction','length','branches'],
  'decal.fold':['region','axis'], 'marble.swirl':['region','colors','turns'], 'stamp.press':['at','color','shape','size','count'],
  'marble.transfer':['region','to','scale'],
  'grid.show':['kind','vanishing'], 'grid.hide':[],
};
const DEFAULTS: Record<string, Obj> = {
  'hand.enter': { from: 'kiki' },
  'pencil.stroke': { hardness: 'HB', pressure: 0.6, width: 2, mode: 'stand' }, 'pencil.hatch': { angle: 45, spacing: 10, cross: false },
  'crayon.stroke': { kind: 'crayon', mode: 'stand', pressure: 0.6, width: 12 }, 'crayon.fill': { kind: 'crayon', pattern: 'oneway', pressure: 0.6, layer: 'paint' },
  smudge: { tool: 'tissue', strength: 0.5, width: 24 },
  'paint.stroke': { water: 0.5, brush: 'round', part: 'tip', width: 12, mode: 'transparent', layer: 'paint' },
  'paint.wash': { water: 0.5, pattern: 'flat', mode: 'transparent', layer: 'paint' }, 'paint.drop': { water: 0.6 }, 'scratch.cover': { color: 'kuro' },
  'paint.soften':{width:24,strength:.5},
  'frottage.rub':{width:48}, 'tool.place':{scale:1}, 'scene.object':{scale:1,z:0,rotation:0,opacity:1},
  'paint.dab':{tool:'brush',count:16}, 'eraser.stroke':{width:30,layer:'paint'}, stencil:{width:40,side:'outside'},
  splatter:{count:180,size:4}, drip:{width:16}, blow:{direction:[1,0],length:220,branches:6},
  'decal.fold':{axis:'vertical'}, 'marble.swirl':{turns:3}, 'stamp.press':{shape:'circle',size:70,count:1}, 'grid.show':{kind:'thirds'},
  'marble.transfer':{scale:.5},
};
const DRAWING = new Set(['pencil.stroke', 'pencil.hatch', 'crayon.stroke', 'crayon.fill', 'smudge', 'paint.stroke', 'paint.wash', 'paint.drop', 'paint.bleed', 'paint.soften','scratch.cover', 'scratch.stroke','frottage.rub','paint.mix','paint.dab','eraser.stroke','stencil','splatter','drip','blow','decal.fold','marble.swirl','marble.transfer','stamp.press']);

function object(value: unknown): value is Obj { return value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null); }

export function validateScript(value: unknown, comparisonChild=false): string[] {
  const errors: string[] = [];
  const fail = (where: string, message: string) => errors.push(`${where}: ${message}`);
  function record(v: unknown, where: string, allowed: string[], required: string[] = []): v is Obj {
    if (!object(v)) { fail(where, 'objectが必要です'); return false; }
    for (const key of Object.keys(v)) if (!allowed.includes(key)) fail(`${where}.${key}`, '未知の引数です');
    for (const key of required) if (!(key in v)) fail(`${where}.${key}`, '必須項目です');
    return true;
  }
  function number(v: unknown, where: string, min = 0, max = 60000, integer = false): v is number {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) { fail(where, `有限の${integer ? '整数' : '数値'} ${min}〜${max} が必要です`); return false; }
    return true;
  }
  function string(v: unknown, where: string, max = 200, allowEmpty = false): v is string {
    if (typeof v !== 'string' || (!allowEmpty && !v.trim()) || [...v].length > max) { fail(where, `空でない文字列（${max}文字以下）が必要です`); return false; }
    return true;
  }
  function enumValue(v: unknown, where: string, allowed: readonly string[], optional = false) {
    if (v === undefined && optional) return;
    if (typeof v !== 'string' || !allowed.includes(v)) fail(where, `許可値は ${allowed.join('/')} です`);
  }
  function id(v: unknown, where: string) { if (string(v, where, 64) && !/^[A-Za-z][A-Za-z0-9_-]*$/u.test(v)) fail(where, 'IDは英字で始まる英数字・_・-です'); }
  function point(v: unknown, where: string, offstage = false) {
    if (!Array.isArray(v) || v.length !== 2) { fail(where, '[x,y]が必要です'); return; }
    number(v[0], `${where}[0]`, offstage ? -1000 : 0, offstage ? 2000 : 1000);
    number(v[1], `${where}[1]`, offstage ? -625 : 0, offstage ? 1250 : 625);
  }
  function points(v: unknown, where: string, min: number, max: number): number {
    if (!Array.isArray(v) || v.length < min || v.length > max) { fail(where, `点数は ${min}〜${max} です`); return 0; }
    v.forEach((p, i) => point(p, `${where}[${i}]`)); return v.length;
  }
  function bounds(where: string, x: unknown, y: unknown, w: unknown, h: unknown, centered = false) {
    if (![x,y,w,h].every(n => typeof n === 'number' && Number.isFinite(n))) return;
    const [xx, yy, ww, hh] = [x,y,w,h] as number[];
    if (centered ? xx - ww < 0 || xx + ww > 1000 || yy - hh < 0 || yy + hh > 625 : xx < 0 || xx + ww > 1000 || yy < 0 || yy + hh > 625) fail(where, '生成後の領域・経路がステージ外です');
  }
  function region(v: unknown, where: string, refs: Set<string>, allowRef = true) {
    if (!object(v)) { fail(where, '領域はshapeまたはrefを持つobjectです（sameは使えません）'); return; }
    if ('ref' in v) {
      record(v, where, ['ref'], ['ref']);
      if (!allowRef) fail(where, 'regions内は具体的なshapeを指定してください');
      if (string(v.ref, `${where}.ref`, 64) && !refs.has(v.ref)) fail(`${where}.ref`, '未知の領域参照です');
      return;
    }
    switch(v.shape) {
      case 'rect':
        record(v, where, ['shape','x','y','w','h'], ['shape','x','y','w','h']);
        number(v.x, `${where}.x`, 0, 1000); number(v.y, `${where}.y`, 0, 625); number(v.w, `${where}.w`, 0.1, 1000); number(v.h, `${where}.h`, 0.1, 625); bounds(where,v.x,v.y,v.w,v.h); break;
      case 'ellipse':
        record(v, where, ['shape','cx','cy','rx','ry'], ['shape','cx','cy','rx','ry']);
        number(v.cx, `${where}.cx`, 0, 1000); number(v.cy, `${where}.cy`, 0, 625); number(v.rx, `${where}.rx`, 0.1, SCRIPT_LIMITS.radius); number(v.ry, `${where}.ry`, 0.1, SCRIPT_LIMITS.radius); bounds(where,v.cx,v.cy,v.rx,v.ry,true); break;
      case 'circle':
        record(v, where, ['shape','cx','cy','r'], ['shape','cx','cy','r']);
        number(v.cx, `${where}.cx`, 0, 1000); number(v.cy, `${where}.cy`, 0, 625); number(v.r, `${where}.r`, 0.1, SCRIPT_LIMITS.radius); bounds(where,v.cx,v.cy,v.r,v.r,true); break;
      case 'polygon':
        record(v, where, ['shape','points'], ['shape','points']); points(v.points, `${where}.points`, 3, SCRIPT_LIMITS.polygonPoints); break;
      default: fail(`${where}.shape`, '未対応の領域shapeです');
    }
  }
  function svg(d: unknown, where: string) {
    if (!string(d, where, SCRIPT_LIMITS.svgChars)) return;
    const tokenPattern = /[A-Za-z]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/gu;
    const tokens = d.match(tokenPattern) ?? [];
    if (d.replace(tokenPattern, '').replace(/[\s,]/gu, '')) { fail(where, 'SVGパスに不正な文字があります'); return; }
    let i = 0, count = 0, begun = false;
    while (i < tokens.length) {
      const cmd = tokens[i++];
      const arity: Record<string, number> = { M:2,L:2,C:6,Q:4,Z:0 };
      if (!(cmd in arity)) { fail(where, `SVG命令 ${cmd} は未対応です（M/L/C/Q/Zのみ）`); return; }
      if (!begun && cmd !== 'M') fail(where, 'SVGパスはMから開始してください');
      begun = true;
      if (cmd === 'Z') { count++; if(count > SCRIPT_LIMITS.svgCommands) { fail(where, 'SVGパスが複雑すぎます'); return; } continue; }
      let groups = 0;
      while (i < tokens.length && !/^[A-Za-z]$/u.test(tokens[i])) {
        if (i + arity[cmd] > tokens.length || tokens.slice(i,i+arity[cmd]).some(t => /^[A-Za-z]$/u.test(t))) { fail(where, `${cmd}の座標数が足りません`); return; }
        for(let j=0;j<arity[cmd];j+=2) point([Number(tokens[i+j]),Number(tokens[i+j+1])], `${where}.${cmd}`);
        i += arity[cmd]; groups++; count++;
        if(count > SCRIPT_LIMITS.svgCommands) { fail(where, 'SVGパスが複雑すぎます'); return; }
      }
      if(!groups) { fail(where, `${cmd}には座標が必要です`); return; }
    }
    if(!count) fail(where, 'SVGパスが空です');
  }
  function path(v: unknown, where: string) {
    if (!object(v)) { fail(where, 'path objectが必要です'); return; }
    if ('points' in v) { record(v,where,['points'],['points']); points(v.points,`${where}.points`,1,SCRIPT_LIMITS.points); return; }
    if ('subpaths' in v) {
      record(v,where,['subpaths'],['subpaths']);
      if(!Array.isArray(v.subpaths) || v.subpaths.length < 1 || v.subpaths.length > SCRIPT_LIMITS.subpaths) { fail(where,'subpathsは1〜128本です'); return; }
      const count = v.subpaths.reduce((n,p,i)=>n+points(p,`${where}.subpaths[${i}]`,1,SCRIPT_LIMITS.points),0);
      if(count > SCRIPT_LIMITS.points) fail(where,'全経路の合計点数が4096を超えています');
      return;
    }
    if ('d' in v) { record(v,where,['d'],['d']); svg(v.d,`${where}.d`); return; }
    const params: Record<string,string[]> = { line:['x1','y1','x2','y2'], wave:['x','y','w','amplitude','cycles'], zigzag:['x','y','w','amplitude','cycles'], spiral:['cx','cy','r','turns'], dots:['x','y','w','count'], burst:['cx','cy','r','rays'], ellipse:['cx','cy','rx','ry'],leaf:['cx','cy','rx','ry'],rectangle:['x','y','w','h'] };
    if (typeof v.gen !== 'string' || !params[v.gen]) { fail(`${where}.gen`,'未対応の生成関数です'); return; }
    record(v,where,['gen',...params[v.gen]],['gen',...params[v.gen]]);
    if(v.gen==='line') { point([v.x1,v.y1],where); point([v.x2,v.y2],where); return; }
    if(v.gen==='rectangle'){point([v.x,v.y],where);number(v.w,`${where}.w`,.1,1000);number(v.h,`${where}.h`,.1,625);bounds(where,v.x,v.y,v.w,v.h);return;}
    if(v.gen==='wave' || v.gen==='zigzag') {
      point([v.x,v.y],where); number(v.w,`${where}.w`,0.1,1000); number(v.amplitude,`${where}.amplitude`,0.1,625); number(v.cycles,`${where}.cycles`,1,SCRIPT_LIMITS.cycles,true);
      if(typeof v.y==='number' && typeof v.amplitude==='number') bounds(where,v.x,v.y-v.amplitude,v.w,2*v.amplitude); return;
    }
    if(v.gen==='dots') { point([v.x,v.y],where); number(v.w,`${where}.w`,0.1,1000); number(v.count,`${where}.count`,1,SCRIPT_LIMITS.count,true); bounds(where,v.x,v.y,v.w,0); return; }
    point([v.cx,v.cy],where);
    if(v.gen==='ellipse'||v.gen==='leaf') { number(v.rx,`${where}.rx`,0.1,SCRIPT_LIMITS.radius); number(v.ry,`${where}.ry`,0.1,SCRIPT_LIMITS.radius); bounds(where,v.cx,v.cy,v.rx,v.ry,true); }
    else { number(v.r,`${where}.r`,0.1,SCRIPT_LIMITS.radius); bounds(where,v.cx,v.cy,v.r,v.r,true); if(v.gen==='spiral') number(v.turns,`${where}.turns`,0.1,16); else number(v.rays,`${where}.rays`,1,SCRIPT_LIMITS.rays,true); }
  }
  function pressure(v: unknown, where: string) {
    if(v===undefined) return;
    if(typeof v==='number') { number(v,where,0,1); return; }
    if(!Array.isArray(v) || v.length<2 || v.length>32) { fail(where,'pressureカーブは2〜32点です'); return; }
    let last=-1;
    v.forEach((p,i)=> { if(!Array.isArray(p)||p.length!==2) { fail(`${where}[${i}]`,'[位置,筆圧]が必要です'); return; } number(p[0],where,0,1); number(p[1],where,0,1); if(typeof p[0]==='number') { if(p[0]<=last) fail(where,'pressureの位置は厳密な昇順です'); last=p[0]; } });
    if(!Array.isArray(v[0]) || v[0][0]!==0 || !Array.isArray(v[v.length-1]) || v[v.length-1][0]!==1) fail(where,'pressureは位置0から1まで指定してください');
  }
  if (!record(value,'script',['schemaVersion','id','seed','stage','regions','steps'],['schemaVersion','id','seed','stage','regions','steps'])) return errors;
  if(value.schemaVersion!==1) fail('script.schemaVersion','対応する版は1です');
  if(string(value.id,'script.id',4)) {
    const match=/^([PCWMKZO])-(\d{2})$/u.exec(value.id);
    const counts:Record<string,number>={P:10,C:12,W:18,M:7,K:6,Z:10,O:6};
    if(!match || Number(match[2])<1 || Number(match[2])>counts[match[1]])fail('script.id','レッスンIDは内容マップの既知IDを指定してください');
  }
  number(value.seed,'script.seed',0,4294967295,true);
  if(record(value.stage,'script.stage',['paper','view','mirror'],['paper','view','mirror'])) { enumValue(value.stage.paper,'stage.paper',['gayoushi']); enumValue(value.stage.view,'stage.view',['top','side']); enumValue(value.stage.mirror,'stage.mirror',['handedness','none']); }
  const refs = new Set<string>();
  if(object(value.regions)) {
    const entries=Object.entries(value.regions);
    if(entries.length>SCRIPT_LIMITS.regions) fail('regions','領域は64個以下です');
    entries.forEach(([key])=>{id(key,`regions.${key}`); refs.add(key);});
    entries.forEach(([key,v])=>region(v,`regions.${key}`,refs,false));
  } else fail('regions','領域辞書objectが必要です');
  if(!Array.isArray(value.steps) || value.steps.length<(comparisonChild?1:3) || value.steps.length>SCRIPT_LIMITS.steps) { fail('steps',comparisonChild?'比較の子ステップは1〜8件です':'ステップは3〜8件です'); return errors; }
  const stepIds = new Set<string>();
  let total=0, toolPresent=false, frottageReady=false;
  value.steps.forEach((step,si)=>{
    const where=`steps[${si}]`;
    if(!record(step,where,['id','durationMs','caption','description','actions'],['id','durationMs','caption','description','actions'])) return;
    id(step.id,`${where}.id`);
    if(typeof step.id==='string') { if(stepIds.has(step.id)) fail(`${where}.id`,'ステップIDが重複しています'); stepIds.add(step.id); }
    if(number(step.durationMs,`${where}.durationMs`,3000,8000,true)) total+=step.durationMs;
    if(string(step.caption,`${where}.caption`,256)) { captionErrors(step.caption).forEach(e=>fail(`${where}.caption`,e)); const max=typeof value.id==='string'&&['P-02','C-09'].includes(value.id)?24:32; if(Math.max([...plainCaption(step.caption)].length,[...plainCaption(step.caption,true)].length)>max) fail(`${where}.caption`,`${max}文字を超えています（ルビの親文字で数えます）`); }
    string(step.description,`${where}.description`,500);
    if(!Array.isArray(step.actions) || step.actions.length<1 || step.actions.length>SCRIPT_LIMITS.actionsPerStep) { fail(`${where}.actions`,'アクションは1〜96個です'); return; }
    const ids=new Set<string>(), checked:Obj[]=[];
    const actions=step.actions;
    actions.forEach((a,ai)=>{
      const aw=`${where}.actions[${ai}]`;
      if(!object(a)) { fail(aw,'action objectが必要です'); return; }
      if(typeof a.type!=='string' || !(a.type in EXTRA)) { fail(`${aw}.type`,'未知のアクションです'); return; }
      record(a,aw,[...BASE,...EXTRA[a.type]],BASE);
      id(a.id,`${aw}.id`); if(typeof a.id==='string') { if(ids.has(a.id)) fail(`${aw}.id`,'アクションIDが重複しています'); ids.add(a.id); }
      const validT=number(a.t,`${aw}.t`,0,60000,true), validD=number(a.dur,`${aw}.dur`,0,60000,true);
      if(validT&&validD&&typeof step.durationMs==='number'&&Number(a.t)+Number(a.dur)>step.durationMs) fail(aw,'t + durがステップの終了を超えています');
      if(DRAWING.has(a.type)&&a.dur===0) fail(`${aw}.dur`,'描く動きを見せるアクションは正のdurが必要です');
      const normalized={...DEFAULTS[a.type],...a}; checked.push(normalized);
      const p=(field='path')=>path(a[field],`${aw}.${field}`);
      const r=()=>region(a.region,`${aw}.region`,refs);
      const color=(field='color',optional=false,water=false)=>enumValue(a[field],`${aw}.${field}`,water?[...PAINT_COLORS,'water']:PAINT_COLORS,optional);
      const optN=(field:string,min:number,max:number,integer=false)=>{if(a[field]!==undefined)number(a[field],`${aw}.${field}`,min,max,integer);};
      if(a.pressure!==undefined)pressure(a.pressure,`${aw}.pressure`);
      if(a.text!==undefined)string(a.text,`${aw}.text`,48);
      switch(a.type) {
        case 'hand.enter': enumValue(a.tool,`${aw}.tool`,TOOLS); enumValue(a.from,`${aw}.from`,['kiki'],true); break;
        case 'hand.move': point(a.to,`${aw}.to`,true); break;
        case 'pencil.stroke': p(); enumValue(a.hardness,`${aw}.hardness`,['H','HB','B','2B','4B'],true); enumValue(a.mode,`${aw}.mode`,['stand','lay'],true); optN('width',0.1,SCRIPT_LIMITS.width); break;
        case 'pencil.hatch': r(); optN('angle',-360,360); optN('spacing',1,128); if(a.cross!==undefined&&typeof a.cross!=='boolean')fail(`${aw}.cross`,'booleanが必要です'); break;
        case 'crayon.stroke': p(); color(); enumValue(a.kind,`${aw}.kind`,['crayon','oil-pastel'],true); enumValue(a.mode,`${aw}.mode`,['stand','lay'],true); optN('width',0.1,SCRIPT_LIMITS.width); if(a.resist!==undefined&&typeof a.resist!=='boolean')fail(`${aw}.resist`,'booleanが必要です'); break;
        case 'crayon.fill':
          r(); if((a.color===undefined)===(a.colors===undefined))fail(aw,'colorまたはcolorsの片方だけが必要です');
          if(a.color!==undefined)color(); if(a.colors!==undefined) { if(!Array.isArray(a.colors)||a.colors.length<1||a.colors.length>12)fail(`${aw}.colors`,'colorsは1〜12色です'); else a.colors.forEach((c,i)=>enumValue(c,`${aw}.colors[${i}]`,PAINT_COLORS)); }
          enumValue(a.kind,`${aw}.kind`,['crayon','oil-pastel'],true); enumValue(a.pattern,`${aw}.pattern`,['oneway','round','stripes','dots'],true); enumValue(a.layer,`${aw}.layer`,['paint','under'],true); break;
        case 'smudge': p(); enumValue(a.tool,`${aw}.tool`,['finger','tissue','cotton'],true); optN('strength',0,1); optN('width',0.1,SCRIPT_LIMITS.width); break;
        case 'paint.stroke': p(); color(); optN('water',0,1); optN('width',0.1,SCRIPT_LIMITS.width); enumValue(a.brush,`${aw}.brush`,['round','flat'],true); enumValue(a.part,`${aw}.part`,['tip','belly'],true); enumValue(a.mode,`${aw}.mode`,['transparent','opaque'],true); enumValue(a.layer,`${aw}.layer`,['paint','wet'],true); break;
        case 'paint.wash':
          r(); color('color',false,true); optN('water',0,1); enumValue(a.pattern,`${aw}.pattern`,['flat','grad'],true); enumValue(a.mode,`${aw}.mode`,['transparent','opaque'],true); enumValue(a.layer,`${aw}.layer`,['paint','wet'],true);
          if(a.pattern==='grad') { color('gradTo'); if(a.color==='water')fail(aw,'水だけのwashにはgradを使えません'); } else if(a.gradTo!==undefined)fail(`${aw}.gradTo`,'gradToはpattern:gradでのみ指定できます'); break;
        case 'paint.drop': point(a.at,`${aw}.at`); color(); number(a.size,`${aw}.size`,0.1,128); optN('water',0,1); break;
        case 'paint.bleed': r(); id(a.source,`${aw}.source`); number(a.radius,`${aw}.radius`,0.1,SCRIPT_LIMITS.radius); { const previous=actions.slice(0,ai).find(x=>object(x)&&x.id===a.source); if(!object(previous)||previous.type!=='paint.drop')fail(`${aw}.source`,'同じステップ内の先行paint.dropを参照してください'); else if(typeof previous.t==='number'&&typeof previous.dur==='number'&&typeof a.t==='number'&&previous.t+previous.dur>a.t)fail(aw,'元のdropの終了後にbleedを開始してください'); } break;
        case 'paint.dry': case 'fx.sheen': r(); break;
        case 'paint.soften':p();optN('width',1,SCRIPT_LIMITS.width);optN('strength',0,1);break;
        case 'scratch.cover': r(); color('color',true); break;
        case 'scratch.stroke': p(); number(a.width,`${aw}.width`,0.1,SCRIPT_LIMITS.width); break;
        case 'note.arrow': point(a.at,`${aw}.at`); point(a.to,`${aw}.to`); break;
        case 'note.circle': point(a.at,`${aw}.at`); number(a.r,`${aw}.r`,0.1,SCRIPT_LIMITS.radius); if(Array.isArray(a.at))bounds(aw,a.at[0],a.at[1],a.r,a.r,true); break;
        case 'note.label': point(a.at,`${aw}.at`); string(a.text,`${aw}.text`,48); break;
        case 'zoom.to': if(!Array.isArray(a.rect)||a.rect.length!==4)fail(`${aw}.rect`,'[x,y,w,h]が必要です'); else { point(a.rect.slice(0,2),`${aw}.rect`); number(a.rect[2],`${aw}.rect.w`,1,1000); number(a.rect[3],`${aw}.rect.h`,1,625); bounds(aw,...a.rect as [unknown,unknown,unknown,unknown]); } break;
        case 'frottage.setup':r();enumValue(a.pattern,`${aw}.pattern`,['leaf','wood','mesh']);break;
        case 'frottage.rub':p();color();optN('width',1,SCRIPT_LIMITS.width);break;
        case 'tool.place':enumValue(a.item,`${aw}.item`,[...TOOLS,...SCENE_SPRITES]);point(a.to,`${aw}.to`);optN('scale',.1,4);color('color',true);break;
        case 'scene.object':id(a.objectId,`${aw}.objectId`);enumValue(a.sprite,`${aw}.sprite`,SCENE_SPRITES);point(a.at,`${aw}.at`);optN('scale',.1,4);optN('z',-100,100);optN('rotation',-360,360);optN('opacity',0,1);color('color',true);if(a.light!==undefined)point(a.light,`${aw}.light`);break;
        case 'compare':
          if(comparisonChild)fail(aw,'compareの入れ子は禁止です');
          else for(const side of ['left','right'])validateScript(a[side],true).forEach(e=>fail(`${aw}.${side}`,e));
          if(!Array.isArray(a.labels)||a.labels.length!==2)fail(`${aw}.labels`,'左右2つのラベルが必要です');else a.labels.forEach((v,i)=>string(v,`${aw}.labels[${i}]`,32));break;
        case 'note.meter':string(a.label,`${aw}.label`,32);pressure(a.value,`${aw}.value`);if(a.value===undefined)fail(`${aw}.value`,'valueが必要です');if(a.at!==undefined)point(a.at,`${aw}.at`);break;
        case 'paint.mix':case 'marble.swirl':
          r();if(!Array.isArray(a.colors)||a.colors.length<1||a.colors.length>12)fail(`${aw}.colors`,'colorsは1〜12色です');else a.colors.forEach((v,i)=>enumValue(v,`${aw}.colors[${i}]`,PAINT_COLORS));
          if(a.type==='paint.mix') {if(!Array.isArray(a.amounts)||!Array.isArray(a.colors)||a.amounts.length!==a.colors.length)fail(`${aw}.amounts`,'色と量を同じ数で指定してください');else {a.amounts.forEach((v,i)=>number(v,`${aw}.amounts[${i}]`,0,100));if(a.amounts.every(v=>typeof v==='number')&&a.amounts.reduce((n,v)=>n+Number(v),0)<=0)fail(`${aw}.amounts`,'色の量の合計は0より大きくしてください');}}
          else optN('turns',.25,12);break;
        case 'paint.dab':r();color();enumValue(a.tool,`${aw}.tool`,['brush','sponge'],true);optN('count',1,SCRIPT_LIMITS.count);if(a.count!==undefined&&typeof a.count==='number'&&!Number.isInteger(a.count))fail(`${aw}.count`,'整数が必要です');break;
        case 'eraser.stroke':p();optN('width',1,SCRIPT_LIMITS.width);enumValue(a.layer,`${aw}.layer`,['paint','top'],true);break;
        case 'stencil':r();p();color();optN('width',1,SCRIPT_LIMITS.width);enumValue(a.side,`${aw}.side`,['inside','outside'],true);break;
        case 'splatter':r();color();optN('count',1,SCRIPT_LIMITS.count,true);optN('size',.5,24);break;
        case 'drip':p();color();optN('width',1,SCRIPT_LIMITS.width);break;
        case 'blow':point(a.at,`${aw}.at`);color();optN('length',10,500);optN('branches',1,24,true);if(a.direction!==undefined){if(!Array.isArray(a.direction)||a.direction.length!==2||a.direction.some(v=>typeof v!=='number'||!Number.isFinite(v))||Math.hypot(...a.direction as [number,number])===0)fail(`${aw}.direction`,'0でない有限の方向ベクトルが必要です');}break;
        case 'decal.fold':r();enumValue(a.axis,`${aw}.axis`,['vertical','horizontal'],true);break;
        case 'marble.transfer': {r();point(a.to,`${aw}.to`);optN('scale',.1,2);if(errors.length===0&&object(a.region)&&Array.isArray(a.to)){const shape='ref'in a.region&&object(value.regions)?value.regions[String(a.region.ref)]:a.region,b=regionBounds(shape as RegionShape),s=Number(a.scale??.5);bounds(aw,Number(a.to[0])-b.w*s/2,Number(a.to[1])-b.h*s/2,b.w*s,b.h*s);}break;}
        case 'stamp.press':point(a.at,`${aw}.at`);color();enumValue(a.shape,`${aw}.shape`,['circle','square','leaf','vegetable','cardboard'],true);optN('size',4,300);optN('count',1,16,true);break;
        case 'grid.show':enumValue(a.kind,`${aw}.kind`,['thirds','perspective','center'],true);if(a.vanishing!==undefined)point(a.vanishing,`${aw}.vanishing`);break;
      }
    });
    function overlaps(a:Obj,b:Obj) { if(![a.t,a.dur,b.t,b.dur].every(v=>typeof v==='number'))return false; const [at,ad,bt,bd]=[a.t,a.dur,b.t,b.dur] as number[]; if(ad===0&&bd===0)return false; if(ad===0)return at>=bt&&at<bt+bd; if(bd===0)return bt>=at&&bt<at+ad; return at<bt+bd&&bt<at+ad; }
    function writes(a:Obj):string[] {
      const type=String(a.type);
      if(type.startsWith('hand.'))return ['tool']; if(type.startsWith('zoom.'))return ['camera'];
      if(type==='paint.dry')return ['paint','wet','wetMask']; if(type==='paint.drop')return ['wet','wetMask']; if(type==='paint.bleed')return ['wet'];
      if(type==='paint.soften')return ['wet','wetMask'];
      if(type==='marble.transfer')return ['paint','wet'];
      if(type==='paint.wash'&&a.color==='water')return ['wetMask'];
      if(type==='paint.wash'||type==='paint.stroke')return a.layer==='wet'?['wet','wetMask']:['paint'];
      if(type==='crayon.fill')return [String(a.layer)]; if(type.startsWith('scratch.'))return ['top'];
      if(type==='frottage.setup')return ['frottageMask'];if(type==='eraser.stroke')return [String(a.layer)];
      if(type==='crayon.stroke'&&a.resist)return ['paint','resistMask'];
      if(['frottage.rub','paint.mix','paint.dab','stencil','splatter','drip','blow','decal.fold','marble.swirl','stamp.press'].includes(type))return ['paint'];
      if(type==='compare')return ['comparison'];if(type==='scene.object')return [`object:${a.objectId}`];if(type==='tool.place')return [`item:${a.item}`];
      if(['pencil.stroke','pencil.hatch','crayon.stroke','smudge'].includes(type))return ['paint']; return [];
    }
    for(let i=0;i<checked.length;i++)for(let j=i+1;j<checked.length;j++) {
      const a=checked[i],b=checked[j]; if(!overlaps(a,b))continue;
      const common=writes(a).filter(layer=>writes(b).includes(layer));
      if(common.length)fail(where,`${a.id}と${b.id}が同じ状態 ${common.join('/')} を同時に変更します`);
      else if(DRAWING.has(String(a.type))&&DRAWING.has(String(b.type))) {
        const time=Math.max(Number(a.t),Number(b.t));
        const end=Math.min(Number(a.t)+Number(a.dur),Number(b.t)+Number(b.dur));
        let present=toolPresent;
        checked.filter(h=>String(h.type).startsWith('hand.')&&Number(h.t)<=time).sort((x,y)=>Number(x.t)-Number(y.t)).forEach(h=>{if(h.type==='hand.enter')present=true;if(h.type==='hand.exit'&&Number(h.t)+Number(h.dur)<=time)present=false;});
        if(checked.some(h=>h.type==='hand.enter'&&Number(h.t)>time&&Number(h.t)<end))present=true;
        if(present)fail(where,`${a.id}と${b.id}を1つの道具が同時に追うことはできません`);
      }
    }
    checked.filter(a=>a.type==='hand.enter'||a.type==='hand.exit').sort((a,b)=>Number(a.t)-Number(b.t)).forEach(a=>{toolPresent=a.type==='hand.enter';});
    for(const action of checked.filter(a=>a.type==='frottage.rub'))if(!frottageReady&&!checked.some(a=>a.type==='frottage.setup'&&Number(a.t)+Number(a.dur)<=Number(action.t)))fail(where,'frottage.rubはfrottage.setupの終了後に使ってください');
    if(checked.some(a=>a.type==='frottage.setup'))frottageReady=true;
  });
  if(total<(comparisonChild?1:20000)||total>60000)fail('steps',comparisonChild?'比較の子の合計時間は0秒超〜60秒です':'レッスンの合計時間は20〜60秒です');
  return errors;
}

export function parseScript(value: unknown): Script {
  const errors=validateScript(value);
  if(errors.length)throw new Error(`台本が不正です\n${errors.join('\n')}`);
  const script=structuredClone(value) as Script;
  const normalize=(target:Script)=>target.steps.forEach(step=>{step.actions=step.actions.map(action=>{const result={...DEFAULTS[action.type],...action} as Action;if(result.type==='compare'){normalize(result.left);normalize(result.right);}return result;});});normalize(script);
  return script;
}
