import { describe, expect, it } from 'vitest';
import p02 from '../public/data/anim/P-02.json';
import c09 from '../public/data/anim/C-09.json';
import w11 from '../public/data/anim/W-11.json';
import { parseScript, validateScript } from '../src/engine/schema';
import { parseCaption, plainCaption } from '../src/engine/ruby';

function copy<T>(value:T):T {return structuredClone(value);}
function scriptWith(actions:unknown[]):any {const raw:any=copy(w11);raw.steps[0].actions=actions;return raw;}
const line={id:'line',type:'pencil.stroke',t:0,dur:1000,path:{points:[[100,100],[400,100]]}};

describe('教材の台本と時間',()=>{
  it.each([[p02,25000,5],[c09,24000,4],[w11,20000,4]] as const)('3本が構造・時間・字幕の基準を満たす', (raw,total,count)=>{
    expect(validateScript(raw)).toEqual([]);
    const script=parseScript(raw);
    expect(script.steps.length).toBe(count);
    expect(script.steps.reduce((sum,step)=>sum+step.durationMs,0)).toBe(total);
  });
  it('既定値を補い、元の台本を変更しない',()=>{
    const raw=scriptWith([line]);const before=copy(raw);const parsed=parseScript(raw);
    expect(parsed.steps[0].actions[0]).toMatchObject({hardness:'HB',pressure:0.6,width:2,mode:'stand'});
    expect(raw).toEqual(before);
    expect(parsed).not.toBe(raw);
  });
  it.each([null,[],{},'same'])('不正なルート入力を例外で止める (%j)',v=>expect(()=>parseScript(v)).toThrow('台本が不正'));
  it('追加アクションの必須引数・未知type・未知引数を無言で通さない',()=>{
    expect(validateScript(scriptWith([{...line,type:'frottage.rub'}])).length).toBeGreaterThan(0);
    expect(validateScript(scriptWith([{...line,type:'pencill.stroke'}])).join()).toContain('未知');
    expect(validateScript(scriptWith([{...line,opacity:0.5}])).join()).toContain('未知の引数');
    const unknown:any=copy(w11);unknown.id='W-99';expect(validateScript(unknown).join()).toContain('既知ID');
  });
  it('終了超過・負時間・小数時間・NaNを拒否する',()=>{
    for(const change of [{t:4900,dur:200},{t:-1},{dur:1.2},{t:Number.NaN}]) expect(validateScript(scriptWith([{...line,...change}])).length).toBeGreaterThan(0);
  });
  it('アクションID重複と瞬時の線描画を拒否する',()=>{
    expect(validateScript(scriptWith([line,{...line,t:2000}])).join()).toContain('重複');
    expect(validateScript(scriptWith([{...line,dur:0}])).join()).toContain('正のdur');
  });
  it('スクラッチ下地はunderへ描き、黒はtopだけに重なる',()=>{
    expect(c09.steps[0].actions.find(a=>a.type==='crayon.fill')).toMatchObject({layer:'under'});
    expect(c09.steps[1].actions.some(a=>a.type==='scratch.cover')).toBe(true);
    expect(c09.steps[2].actions.some(a=>a.type==='scratch.stroke')).toBe(true);
  });
  it('にじみの前に水を置き、現実の乾燥時間を省略したことを伝える',()=>{
    expect(w11.steps[0].actions.find(a=>a.type==='paint.wash')).toMatchObject({color:'water'});
    expect(w11.steps.at(-1)?.caption).toContain('はやく みせているよ');
  });
});

describe('領域・経路・混色引数の誤り',()=>{
  it('未知refと暗黙のsameを拒否する',()=>{
    for(const region of [{ref:'missing'},'same'])expect(validateScript(scriptWith([{id:'wash',type:'paint.wash',t:0,dur:1000,color:'water',region}])).join()).toMatch(/領域/);
  });
  it('色と水を混同しない',()=>{
    expect(validateScript(scriptWith([{id:'drop',type:'paint.drop',t:0,dur:1000,color:'water',at:[400,300],size:22}])).length).toBeGreaterThan(0);
    expect(validateScript(scriptWith([{id:'wash',type:'paint.wash',t:0,dur:1000,color:'water',region:{ref:'wet-area'}}]))).toEqual([]);
  });
  it('生成後のwaveとellipseがステージ外へ出る場合を拒否する',()=>{
    for(const path of [{gen:'wave',x:100,y:10,w:800,amplitude:30,cycles:4},{gen:'ellipse',cx:50,cy:100,rx:80,ry:60}])expect(validateScript(scriptWith([{...line,path}])).join()).toContain('ステージ外');
  });
  it('点々と放射線の生成引数・不連続経路を受け入れる',()=>{
    for(const path of [{gen:'dots',x:100,y:100,w:300,count:5},{gen:'burst',cx:500,cy:300,r:120,rays:16},{subpaths:[[[100,100],[200,100]],[[500,100],[600,100]]]}])expect(validateScript(scriptWith([{...line,path}]))).toEqual([]);
  });
  it('過大な生成本数、点数、無限大を拒否する',()=>{
    for(const path of [{gen:'burst',cx:500,cy:300,r:120,rays:100000},{points:Array.from({length:4097},()=>[100,100])},{points:[[100,Infinity]]}])expect(validateScript(scriptWith([{...line,path}])).length).toBeGreaterThan(0);
  });
  it('SVGは絶対座標MLCQZだけを受け入れ、不足・未知命令を拒否する',()=>{
    expect(validateScript(scriptWith([{...line,path:{d:'M100 100 L200 100 Q250 150 300 100 C350 50 400 150 450 100 Z'}}]))).toEqual([]);
    for(const d of ['m100 100 l200 100','M100 100 A20 20 0 0 0 200 200','M100 100 C200 200','M100 100 L1200 100','M100 100 '+ 'Z '.repeat(513)])expect(validateScript(scriptWith([{...line,path:{d}}])).length).toBeGreaterThan(0);
  });
  it('pressureカーブは全区間を覆い、位置は昇順にする',()=>{
    expect(validateScript(scriptWith([{...line,pressure:[[0,0.3],[0.5,1],[1,0.4]]}]))).toEqual([]);
    for(const pressure of [[[0.1,0.3],[1,0.5]],[[0,0.3],[0.7,1],[0.5,0.4],[1,0.2]],[[0,0.3],[1,2]]])expect(validateScript(scriptWith([{...line,pressure}])).join()).toContain('pressure');
  });
  it('fillのcolor/colors排他とgradToを検証する',()=>{
    expect(validateScript(scriptWith([{id:'fill',type:'crayon.fill',t:0,dur:1000,region:{ref:'wet-area'},color:'aka',colors:['kiiro']}])).join()).toContain('片方');
    expect(validateScript(scriptWith([{id:'grad',type:'paint.wash',t:0,dur:1000,region:{ref:'wet-area'},color:'aka',pattern:'grad'}])).length).toBeGreaterThan(0);
  });
});

describe('時間と状態の意味',()=>{
  it('同じ層の重複書き込みを拒否し、終了境界の連続は認める',()=>{
    expect(validateScript(scriptWith([line,{...line,id:'next',t:500}])).join()).toContain('同時に変更');
    expect(validateScript(scriptWith([line,{...line,id:'next',t:1000}]))).toEqual([]);
  });
  it('乾燥はpaint/wet/wetMask全てを保護する',()=>{
    const dry={id:'dry',type:'paint.dry',t:500,dur:1000,region:{ref:'wet-area'}};
    expect(validateScript(scriptWith([line,dry])).join()).toContain('paint');
    expect(validateScript(scriptWith([{id:'wash',type:'paint.wash',t:0,dur:1000,color:'water',region:{ref:'wet-area'}},dry])).join()).toContain('wetMask');
  });
  it('bleedの元は同じステップの終了済みdropに限定する',()=>{
    const raw:any=copy(w11);raw.steps[1].actions[2].source='wash';expect(validateScript(raw).join()).toContain('先行paint.drop');
    raw.steps[1].actions[2].source='red';raw.steps[1].actions[2].t=1000;expect(validateScript(raw).join()).toContain('終了後');
  });
  it('別の層は同時に書けるが、1つの道具で2描画は追えない',()=>{
    const fill={id:'under',type:'crayon.fill',t:400,dur:1000,region:{ref:'wet-area'},color:'aka',layer:'under'};
    const cover={id:'top',type:'scratch.cover',t:400,dur:1000,region:{ref:'wet-area'}};
    expect(validateScript(scriptWith([fill,cover]))).toEqual([]);
    expect(validateScript(scriptWith([{id:'enter',type:'hand.enter',t:0,dur:300,tool:'oil-pastel'},fill,cover])).join()).toContain('1つの道具');
    expect(validateScript(scriptWith([fill,cover,{id:'late-enter',type:'hand.enter',t:800,dur:300,tool:'oil-pastel'}])).join()).toContain('1つの道具');
  });
  it('道具とカメラをそれぞれ重複更新しない',()=>{
    expect(validateScript(scriptWith([{id:'enter',type:'hand.enter',t:0,dur:1000,tool:'pencil'},{id:'exit',type:'hand.exit',t:500,dur:500}])).join()).toContain('tool');
    expect(validateScript(scriptWith([{id:'zoom',type:'zoom.to',t:0,dur:1000,rect:[100,100,300,200]},{id:'reset',type:'zoom.reset',t:500,dur:1000}])).join()).toContain('camera');
  });
});

describe('字幕のルビと利き手',()=>{
  it('親文字・読み・方向を分離する',()=>{
    const text='%KIKI%の{手|て}で、%HANTAI%へ';
    expect(parseCaption(text,true)).toEqual([{text:'左の'},{text:'手',reading:'て'},{text:'で、右へ'}]);
    expect(plainCaption(text,false,false)).toBe('右の手で、左へ');
    expect(plainCaption(text,true,true)).toBe('左のてで、右へ');
  });
  it('HTMLを解析せず文字列として返す',()=>expect(parseCaption('<img src=x onerror=alert(1)>',false)).toEqual([{text:'<img src=x onerror=alert(1)>'}]));
  it('壊れたルビ・未知の置換語・字幕長超過を台本で拒否する',()=>{
    for(const caption of ['{水|}','{水|みず','%UNKNOWN%へ','あ'.repeat(33)]) { const raw:any=copy(w11);raw.steps[0].caption=caption;expect(validateScript(raw).length).toBeGreaterThan(0); }
  });
  it('字数はルビの読みを除き、空白・句読点を含める',()=>{
    const raw:any=copy(w11);raw.steps[0].caption='{水|みず}'.repeat(32);expect(validateScript(raw)).toEqual([]);
    raw.steps[0].caption+='。';expect(validateScript(raw).join()).toContain('32文字');
  });
});
