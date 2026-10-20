// Lesson-specific animation authoring; generated files are ordinary versioned Script JSON.
// P-02, C-09 and W-11 are intentionally absent and remain byte-for-byte unchanged.
const A = (type, fields = {}) => ({ type, ...fields });
const rect = (x,y,w,h) => ({shape:'rect',x,y,w,h});
const ellipse = (cx,cy,rx,ry) => ({shape:'ellipse',cx,cy,rx,ry});
const circle = (cx,cy,r) => ({shape:'circle',cx,cy,r});
const polygon = points => ({shape:'polygon',points});
const line = (x1,y1,x2,y2) => ({gen:'line',x1,y1,x2,y2});
const oval = (cx,cy,rx,ry) => ({gen:'ellipse',cx,cy,rx,ry});
const points = (...p) => ({points:p});
const label = (text,x=150,y=80) => A('note.label',{at:[x,y],text});
const arrow = (at,to,text) => A('note.arrow',{at,to,...(text?{text}:{})});
const object = (objectId,sprite,x,y,scale=1,color='midori',extra={}) => A('scene.object',{objectId,sprite,at:[x,y],scale,color,...extra});
const place = (item,x,y,scale=1) => A('tool.place',{item,to:[x,y],scale});
const pencil = (path,fields={}) => A('pencil.stroke',{path,hardness:'2B',pressure:.65,width:3,...fields});
const crayon = (path,color,fields={}) => A('crayon.stroke',{path,color,width:15,pressure:.65,...fields});
const fill = (region,color,fields={}) => A('crayon.fill',{region,color,kind:'oil-pastel',...fields});
const wash = (region,color,fields={}) => A('paint.wash',{region,color,water:.5,...fields});
const paint = (path,color,fields={}) => A('paint.stroke',{path,color,width:18,...fields});
const mix = (region,colors,amounts) => A('paint.mix',{region,colors,amounts});
const drawTypes = new Set(['pencil.stroke','pencil.hatch','crayon.stroke','crayon.fill','smudge','paint.stroke','paint.wash','paint.drop','paint.bleed','paint.dry','paint.soften','scratch.cover','scratch.stroke','frottage.rub','paint.mix','paint.dab','eraser.stroke','stencil','splatter','drip','blow','decal.fold','marble.swirl','marble.transfer','stamp.press']);
function toolFor(a){if(a.type.startsWith('pencil'))return'pencil';if(a.type.startsWith('crayon')||a.type==='frottage.rub')return a.kind==='oil-pastel'?'oil-pastel':'crayon';if(a.type==='smudge')return a.tool??'tissue';if(a.type.startsWith('scratch'))return'waribashi';if(a.type==='eraser.stroke')return'eraser';if(a.type==='paint.dab'&&a.tool==='sponge')return'sponge';if(a.type==='splatter')return'net-brush';return'brush-round';}
function step(caption,description,items){
  const draws=items.filter(a=>drawTypes.has(a.type));
  const span=draws.length?Math.floor(3600/draws.length):0;
  let n=0;
  const actions=items.map((a,i)=>{
    const drawing=drawTypes.has(a.type);
    const explicitT=a.t,explicitDur=a.dur;
    return {id:`action-${i}`,t:explicitT??(drawing?400+n++*span:0),dur:explicitDur??(drawing?span:a.type.startsWith('note.')?5000:0),...a};
  });
  if(draws.length&&draws.every(a=>!['decal.fold','marble.swirl','marble.transfer','paint.dry'].includes(a.type))){
    actions.unshift({id:'enter',type:'hand.enter',tool:toolFor(draws[0]),t:0,dur:400});
    actions.push({id:'exit',type:'hand.exit',t:4100,dur:400});
  }
  return {id:'pending',durationMs:5000,caption,description,actions};
}
function script(id,steps,mirror='handedness',regions={}){return {schemaVersion:1,id,seed:40000+id.charCodeAt(0)*100+Number(id.slice(2)),stage:{paper:'gayoushi',view:'top',mirror},regions,steps:steps.map((s,i)=>({...s,id:`step-${i+1}`}))};}
function side(id,caption,items){const s=script(id,[step(caption,caption,items)]);s.seed+=caption.length;return s;}
function compareStep(id,caption,description,leftItems,rightItems,labels){return step(caption,description,[A('compare',{left:side(id,labels[0],leftItems),right:side(id,labels[1],rightItems),labels,t:0,dur:5000})]);}
const B = (text,description,items) => step(text,description,items);
const out={};

out['P-01']=script('P-01',[
compareStep('P-01','たてると ねかせるを くらべよう','立てた細い線と寝かせた広い線を独立した二つの紙で比較する。',[pencil(line(180,260,820,260),{width:3,mode:'stand'})],[pencil(line(180,260,820,260),{width:20,mode:'lay'})],['たてる','ねかせる']),
compareStep('P-01','はばは どう かわる？','同じ曲線の幅を比較する。',[pencil({gen:'wave',x:150,y:300,w:670,amplitude:55,cycles:3},{width:3})],[pencil({gen:'wave',x:150,y:300,w:670,amplitude:55,cycles:3},{mode:'lay',width:22})],['せん','ひろい あと']),
B('こまかい せんに つかえるね','立てた線で葉のすじを描く。',[pencil(oval(500,320,210,110)),pencil(line(300,330,710,300)),label('こまかい せん')]),
B('ひろい かげも ためそう','寝かせた鉛筆で広い影を塗る。',[pencil({subpaths:[[[220,270],[740,270]],[[220,300],[740,300]],[[220,330],[740,330]]]},{width:34,mode:'lay'}),label('えらんで つかおう')])]);
out['P-03']=script('P-03',[
B('やさしく ひくと どうなる？','弱い力のメーターと薄い線を同じ時間で表示する。',[pencil(line(180,180,830,180),{pressure:.15}),A('note.meter',{label:'ちから',value:.15,at:[170,500]}),label('よわめ')]),
B('すこし ちからを いれてみよう','中くらいの力で前より濃い線を引く。',[pencil(line(180,300,830,300),{pressure:.55}),A('note.meter',{label:'ちから',value:.55,at:[170,500]}),label('すこし つよめ')]),
B('こい せんも ためしてみよう','強めの筆圧と濃い線を比較する。',[pencil(line(180,420,830,420),{pressure:.9}),A('note.meter',{label:'ちから',value:.9,at:[170,500]}),label('かみが やぶれない つよさ')]),
B('とちゅうで ちからを かえるよ','カーブの位置に合わせてメーターと筆圧が弱→強→弱と変わる。',[pencil({gen:'wave',x:180,y:525,w:640,amplitude:25,cycles:2},{pressure:[[0,.15],[.5,.95],[1,.15]],width:6}),A('note.meter',{label:'ちから',value:[[0,.15],[.5,.95],[1,.15]],at:[170,70],t:400,dur:3600})])]);
out['P-04']=script('P-04',[
B('同じ{力|ちから}で くらべよう','HとHBを同じ力・幅で上から順に描く。',[pencil(line(200,130,800,130),{hardness:'H'}),pencil(line(200,220,800,220),{hardness:'HB'}),label('H',130,130),label('HB',130,220)]),
B('Bと2Bも ならべるよ','Bと2Bを同じ力・幅で描く。',[pencil(line(200,310,800,310),{hardness:'B'}),pencil(line(200,400,800,400),{hardness:'2B'}),label('B',130,310),label('2B',130,400)]),
B('4Bの線も 見てみよう','五本目の4Bを加え、同じ条件の5本が並ぶ。',[pencil(line(200,490,800,490),{hardness:'4B'}),label('4B',130,490),label('おなじ ちから',420,70)]),
B('紙や{力|ちから}でも 変わるよ','五本を見比べる注記。濃いほうを正解にしない。',[arrow([700,100],[720,130],'うすく みえる'),arrow([700,560],[720,490],'こく みえる'),label('どれを つかいたい？',360,590)])]);
out['P-05']=script('P-05',[
B('丸から りんごを見つけよう','丸い輪郭と軸を重ね、りんごの形の手掛かりを示す。',[pencil(oval(310,300,135,130)),pencil(points([310,170],[310,135],[345,120])),label('まる')]),
B('三角と丸で 犬もできるね','犬の顔を丸、耳を三角で組み合わせる。',[pencil(oval(700,300,115,110)),pencil({subpaths:[[[600,240],[545,150],[650,200]],[[750,200],[850,150],[800,250]]]}),label('まると さんかく',560,90)]),
B('見たものに合わせて 変えよう','基礎図形から個別の形へ変える例を表示する。',[object('apple','apple',310,310,1.8,'aka'),object('dog','dog',700,320,1.7,'chairo'),label('かたちは へんこうできる')]),
B('どんな組み合わせに しよう？','丸三角四角を異なる配置へ置き、自由な組み合わせを促す。',[object('round','circle',180,510,.65,'momo'),object('tri','triangle',450,510,.7,'ao'),object('square','square',700,510,.65,'kiiro'),label('じぶんの くみあわせ',330,70)])]);
out['P-06']=script('P-06',[
B('線の間を 広くしてみよう','左に広い間隔のハッチングを描く。',[A('pencil.hatch',{region:rect(100,150,230,300),angle:45,spacing:24}),label('ひろい あいだ',100,90)]),
B('間をせまくすると どうなる？','中央に細かい間隔のハッチングを描く。',[A('pencil.hatch',{region:rect(385,150,230,300),angle:45,spacing:9}),label('せまい あいだ',385,90)]),
B('向きを変えて 重ねよう','右のハッチングを交差させる。',[A('pencil.hatch',{region:rect(670,150,230,300),angle:45,spacing:10,cross:true}),label('こうさする せん',670,90)]),
B('暗さと感じを くらべよう','三つの線列を中立的に比較する。',[label('どんな めんに つかう？',300,540),arrow([235,500],[225,380]),arrow([790,500],[790,380])])]);
out['P-07']=script('P-07',[
B('同じくらいの影を ぬろう','指、ティッシュ、綿棒用に三つの鉛筆面を用意する。',[pencil(line(130,290,310,290),{width:48,mode:'lay'}),pencil(line(410,290,590,290),{width:48,mode:'lay'}),pencil(line(690,290,870,290),{width:48,mode:'lay'})]),
B('指とティッシュを くらべよう','左は白い接点円で指ぼかし、中央はティッシュでぼかす。',[A('smudge',{path:line(130,300,310,300),tool:'finger',width:52,strength:.55}),A('smudge',{path:line(410,300,590,300),tool:'tissue',width:70,strength:.65}),label('ゆび',120,170),label('ティッシュ',400,170)]),
B('綿棒なら どうなる？','右は小さめの綿棒で境界をぼかす。',[A('smudge',{path:line(690,300,870,300),tool:'cotton',width:26,strength:.45}),label('めんぼう',680,170)]),
B('ふちの感じを 見てみよう','三つの境界を円で示し、選択を促す。',[A('note.circle',{at:[220,300],r:90}),A('note.circle',{at:[500,300],r:90}),A('note.circle',{at:[780,300],r:90}),label('どうぐで どう かわる？',290,490)])]);
out['P-08']=script('P-08',[
B('暗い面を つくるよ','消す対象を鉛筆だけで塗る。',[pencil({subpaths:[[[200,180],[780,180]],[[200,215],[780,215]],[[200,250],[780,250]],[[200,285],[780,285]],[[200,320],[780,320]],[[200,355],[780,355]],[[200,390],[780,390]],[[200,425],[780,425]]]},{width:65,mode:'lay',hardness:'4B'})]),
B('消しゴムで 光の線を出すよ','鉛筆面から波状の光を消し出す。',[A('eraser.stroke',{path:{gen:'wave',x:250,y:280,w:470,amplitude:35,cycles:2},width:24,layer:'paint'}),label('ひかりの せん')]),
B('丸い光も ためしてみよう','異なる形を消し、光の位置の選択を示す。',[A('eraser.stroke',{path:oval(650,365,40,24),width:24,layer:'paint'}),label('かたちを かえる')]),
B('残った暗さも 表し方にしよう','消す前の暗い面と明るい部分の役割を注記する。',[arrow([300,500],[380,260],'あかるい'),arrow([760,500],[750,420],'くらい'),label('どんな ひかりに みえる？',300,80)])]);
out['P-09']=script('P-09',[
B('光を一つ 決めて見よう','左上の単一光源と球の簡略観察図を置く。',[object('ball','circle',500,290,2.3,'shiro',{light:[220,100]}),object('sun','sun',200,100,.7,'kiiro'),arrow([235,130],[430,230],'ひかり')]),
B('光が当たりにくい 面を見るよ','球の右下へ鉛筆の陰を加える。',[A('pencil.hatch',{region:ellipse(540,320,85,80),angle:45,spacing:7}),label('ものの くらい めん',570,200)]),
B('地面に落ちる 影もあるね','球と離れた右下へ投影を描く。',[pencil(line(570,440,790,485),{width:65,mode:'lay',pressure:.85}),label('じめんの かげ',670,540)]),
B('面と地面の影を 分けて見よう','二種類の影と光源の方向を注記する。',[arrow([360,500],[550,330],'くらい めん'),arrow([820,370],[680,465],'おちる かげ'),label('ひとつの ひかりの れい',120,80)])]);
out['P-10']=script('P-10',[
B('ざらざらを 短い線で','左に不規則な短い線の集合を描く。',[pencil({subpaths:Array.from({length:35},(_,i)=>{const x=110+(i%7)*29,y=220+Math.floor(i/7)*34;return [[x,y],[x+15,y-9],[x+20,y+11]];})}),label('ざらざら',100,100)]),
B('ふわふわを 曲線で','中央に曲線を重ね、柔らかい感じを試す。',[pencil({subpaths:Array.from({length:8},(_,i)=>[[385,230+i*18],[420,200+i*18],[465,235+i*18],[515,205+i*18],[565,230+i*18]])},{pressure:.25}),label('ふわふわ',390,100)]),
B('つるつるを 長い線で','右に長いゆるい曲線を並べる。',[pencil({subpaths:Array.from({length:5},(_,i)=>[[690,220+i*32],[740,230+i*32],[820,220+i*32],[890,230+i*32]])},{pressure:.45}),label('つるつる',680,100)]),
B('感じに合う線を 選ぼう','三種を上下優劣なく比較する。',[label('この せんから なにを かんじる？',280,520)])]);

out['C-01']=script('C-01',[
compareStep('C-01','おなじ むきに ぬってみよう','同じ紙、色、力でクレヨンとオイルパステルを比較する。',[fill(rect(230,180,500,260),'aka',{kind:'crayon'})],[fill(rect(230,180,500,260),'aka',{kind:'oil-pastel'})],['クレヨン','パス']),
compareStep('C-01','かさねると どう ちがう？','同じ黄色を重ねる。製品差の注記を両側で見られる。',[fill(rect(230,180,500,260),'ao',{kind:'crayon'}),fill(rect(280,230,400,150),'kiiro',{kind:'crayon'})],[fill(rect(230,180,500,260),'ao',{kind:'oil-pastel'}),fill(rect(280,230,400,150),'kiiro',{kind:'oil-pastel'})],['クレヨンの かさなり','パスの かさなり']),
B('せいひんや かみで かわるよ','材料の特徴を一律に決めない注記を置く。',[fill(rect(120,230,280,170),'aka',{kind:'crayon'}),fill(rect(600,230,280,170),'aka',{kind:'oil-pastel'}),label('おなじ ざいりょうで ためそう')]),
B('どの かんじを つかう？','紙の白とかすれ、濃い面に注目を向ける。',[arrow([270,510],[250,330],'かみの しろ'),arrow([730,510],[750,330],'こい めん')])]);
out['C-02']=script('C-02',[
compareStep('C-02','たてると ねかせるを くらべよう','包み紙のある立てた線と、紙をはがした横持ちの広い線を比べる。',[crayon(line(170,310,820,310),'aka',{mode:'stand',width:12})],[crayon(line(170,310,820,310),'aka',{mode:'lay',width:25})],['たてる','ねかせる']),
B('たてると こまかい せん','立てたクレヨンで葉の輪郭とすじを描く。',[crayon(oval(320,280,160,90),'midori',{width:10}),crayon(line(170,290,465,265),'midori',{width:10}),label('ほそい せん')]),
B('よこで ひろく ぬれるね','紙をはがしたクレヨンを塗る向きの直角へ寝かせて面を描く。',[crayon({subpaths:[[[560,210],[810,210]],[[560,260],[810,260]],[[560,310],[810,310]]] },'mizu',{mode:'lay',width:30}),label('ひろい めん',550,100)]),
B('はばを えらんで つかおう','細い線と広い面を優劣なく示す。',[label('どこに つかいたい？',320,510)])]);
out['C-03']=script('C-03',[
B('おなじ むきに ぬるよ','左の面を一方向のクレヨンの線で塗る。',[crayon({subpaths:Array.from({length:10},(_,i)=>[[100,190+i*22],[310,190+i*22]])},'ao'),label('いちほうこう',100,100)]),
B('ぐるぐる まわして ぬるよ','中央に丸い動きで重なる面を作る。',[fill(rect(390,185,220,250),'ao',{kind:'crayon',pattern:'round'}),label('ぐるぐる',390,100)]),
B('すきまを うめると どうなる？','右に密な線を重ね、隙間の変化を示す。',[crayon({subpaths:Array.from({length:22},(_,i)=>[[690,190+i*10],[900,190+i*10]])},'ao',{width:20,pressure:.85}),label('すきまを うめる',670,100)]),
B('すきまも ひょうげんに できるね','三つの塗り方の違いを注記する。',[label('どんな かんじが する？',320,520)])]);
out['C-04']=script('C-04',[
B('こい ところから はじめるよ','左の強い筆圧から右へ徐々に弱くなる青の線を描く。',[crayon(line(160,250,840,250),'ao',{width:70,mode:'lay',pressure:[[0,1],[.4,.7],[1,.1]]}),A('note.meter',{label:'ちから',value:[[0,1],[.4,.7],[1,.1]],at:[160,480],t:400,dur:3600})]),
B('べつの いろでも ためそう','赤も同じ方向へ力を抜き、色に依らない変化を比べる。',[crayon(line(160,370,840,370),'aka',{width:70,mode:'lay',pressure:[[0,1],[.5,.5],[1,.1]]}),label('あかでも ためす')]),
B('はんたいから ぬってみよう','下に逆方向の変化を描く。',[crayon(line(160,500,840,500),'midori',{width:58,mode:'lay',pressure:[[0,.1],[.5,.55],[1,1]]}),label('よわい → つよい',200,80)]),
B('どんな かんじに つかう？','筆圧の変化と紙の白が残る場所を示す。',[arrow([820,150],[820,240],'うすい ところ'),label('だんだん かわる いろ',310,580)])]);
out['C-05']=script('C-05',[
compareStep('C-05','はじめの いろを ぬるよ','左黄色、右青の下地を同じ領域へ塗る。',[fill(rect(180,180,640,280),'kiiro')],[fill(rect(180,180,640,280),'ao')],['きいろから','あおから']),
compareStep('C-05','じゅんばんを かえて かさねよう','黄色→青と青→黄色を子台本で独立比較する。',[fill(rect(180,180,640,280),'kiiro'),fill(rect(260,230,480,170),'ao')],[fill(rect(180,180,640,280),'ao'),fill(rect(260,230,480,170),'kiiro')],['きいろ → あお','あお → きいろ']),
B('したの いろは どこに みえる？','二つの順序の重なりを紙の上にも並べる。',[fill(rect(100,230,300,200),'kiiro'),fill(rect(145,260,210,130),'ao'),fill(rect(600,230,300,200),'ao'),fill(rect(645,260,210,130),'kiiro'),label('したの いろと うえの いろ')]),
B('どちらも えらんで つかえるね','製品・力で変わることと使う選択を促す。',[label('ちからや ざいりょうでも かわるよ',180,530)])]);
out['C-06']=script('C-06',[
B('となりに 2いろを ぬるよ','赤と黄色のパスを隣接して塗る。',[fill(rect(180,220,320,200),'aka'),fill(rect(500,220,320,200),'kiiro'),label('あか',210,170),label('きいろ',660,170)]),
B('さかいを すこし こするよ','指の代わりに白い半透明の接点円を表示し、境界をこする。',[A('smudge',{path:line(470,250,530,390),tool:'finger',strength:.8,width:70}),label('さかいを こする')]),
B('はばを かえると どうなる？','境界の上下へ追加のぼかしを入れ、広がる範囲を変える。',[A('smudge',{path:line(450,300,550,300),tool:'tissue',strength:.65,width:85}),label('ティッシュでも ためせる')]),
B('こする まえと あとを みよう','元の赤、黄色と境界を区別して示す。',[arrow([350,500],[500,320],'まんなかの いろ'),label('ふちを のこす ことも できるよ',190,80)])]);
out['C-07']=script('C-07',[
B('2色の点を はなしてかくよ','赤と黄色の点を別々の点として並べる。',[fill(rect(240,170,520,300),'aka',{pattern:'dots',kind:'crayon'}),crayon({gen:'dots',x:260,y:260,w:450,count:18},'kiiro',{width:12}),label('あかと きいろの てん')]),
B('近くで見ると 点が見えるね','カメラを点の一部へ寄せる。',[A('zoom.to',{rect:[340,240,160,100],dur:1100}),label('ひとつずつの てん',380,250)]),
B('離れて見ると どう感じる？','カメラを全体へ戻し色の感じの比較を促す。',[A('zoom.reset',{dur:1200}),label('いろが まざって みえる？',220,520)]),
B('点の間を かえてみよう','離れた青と黄色の点も加え、点密度の選択を示す。',[crayon({gen:'dots',x:200,y:540,w:600,count:12},'ao',{width:18}),crayon({gen:'dots',x:225,y:540,w:540,count:12},'kiiro',{width:18}),label('みる きょりでも かわるよ',220,80)])]);
out['C-08']=script('C-08',[
B('暗い色の 丸をぬるよ','青いパスで丸を塗り、白を重ねる準備をする。',[fill(circle(500,315,175),'ao'),label('あおい めん')]),
B('白いパスを 重ねてみよう','左上へ白の厚い線を重ね、下色を明るく覆う。',[crayon(points([405,260],[440,225],[490,205]),'shiro',{kind:'oil-pastel',width:48,pressure:.9}),label('しろい パス')]),
B('白の量を 変えてみよう','小さな白い反射を追加する。',[crayon(line(555,400,605,380),'shiro',{kind:'oil-pastel',width:18,pressure:.8}),label('ちいさい ひかり',600,500)]),
B('どこに光を 置きたい？','光の場所と暗い面に注目する。',[arrow([230,170],[435,245],'あかるい'),arrow([800,440],[620,330],'くらい めん'),label('ひかりの ばしょを えらぼう',240,80)])]);
out['C-10']=script('C-10',[
B('はっぱは かみの したに おくよ','紙の下の葉の凹凸を非表示マスクとして準備する。',[A('frottage.setup',{pattern:'leaf',region:ellipse(270,310,160,190)}),label('かみの したの はっぱ',100,80),arrow([100,150],[270,310],'したの でこぼこ')]),
B('ねかせて こすってみよう','葉の高いところに濃い跡が生まれ、葉脈が出る。',[A('frottage.rub',{path:{subpaths:Array.from({length:13},(_,i)=>[[90,140+i*26],[455,140+i*26]])},color:'midori',width:40}),label('はみゃくが みえる')]),
B('べつの でこぼこも ためそう','右側に木目を紙の下のマスクとして設定し、擦り出す。',[A('frottage.setup',{pattern:'wood',region:rect(550,130,330,380)}),A('frottage.rub',{path:{subpaths:Array.from({length:14},(_,i)=>[[555,140+i*25],[875,140+i*25]])},color:'chairo',width:34}),label('きの め',590,90)]),
B('したの ものと あとを くらべよう','葉脈と木目の違いを二つの紙内で観察する。',[label('なにを うつして みたい？',230,560)])]);
out['C-11']=script('C-11',[
B('クレヨンで 線をかこう','白と黄色のクレヨンに抵抗マスクを記録する。',[crayon({gen:'wave',x:180,y:270,w:650,amplitude:55,cycles:3},'shiro',{resist:true,width:25,pressure:.9}),crayon({gen:'dots',x:200,y:400,w:600,count:14},'kiiro',{resist:true,width:18}),label('しろと きいろの クレヨン')]),
B('上から うすい水彩をぬるよ','青い水彩は抵抗マスク部分で弱まり、クレヨンの線が残る。',[wash(rect(130,160,740,340),'ao',{water:.85}),label('うすい すいさい')]),
B('クレヨンの線は どう見える？','残る線と水彩の場所を区別する。',[arrow([210,80],[330,270],'クレヨンの あと'),arrow([760,550],[760,450],'すいさいの めん')]),
B('量や紙でも 変わるよ','別の小領域で濃い水彩を重ね、残り方の選択を促す。',[wash(rect(600,200,200,250),'murasaki',{water:.25}),label('のこりかたを ためそう',200,550)])]);
out['C-12']=script('C-12',[
B('よういされた 型を置くよ','中央の型を注記で示す。切る作業は画面に入れない。',[object('stencil','triangle',500,320,2.2,'shiro'),label('おとなが よういした かた')]),
B('型のふちを ぬってみよう','三角の周りへパスの線を置く。',[crayon(points([370,400],[500,170],[630,400],[370,400]),'aka',{width:20}),label('ふちの パス')]),
B('外へ こすってみよう','型の外だけへ色を広げ、型の内側を残す。',[A('stencil',{region:polygon([[370,400],[500,170],[630,400]]),path:{subpaths:[[[400,360],[315,370]],[[460,240],[395,205]],[[550,260],[625,230]],[[610,365],[685,385]],[[495,400],[495,500]]]},color:'aka',width:70,side:'outside'}),label('そとへ こする')]),
B('型を外すと ふちが残るね','型を消し、抽象的な白い抜きとぼかしの境界を見せる。',[object('stencil','triangle',500,320,2.2,'shiro',{opacity:0}),label('どんな かたに したい？',240,560)])]);

out['W-01']=script('W-01',[
B('まず 紙の場所を決めよう','中央に紙、手前左にぞうきんを置く。',[place('paper',470,305,3.6),place('cloth',180,500,1.1),label('かみを まんなかに')]),
B('利き手側に パレットを置くよ','標準は右側、左ききはステージ全体の反転に任せる。',[place('palette',830,200,1.25),place('brush-round',760,420,.7),label('%KIKI%がわに パレット',580,80)]),
B('筆洗を たおしにくい所へ','筆洗を机の端から離れた右上へ置く。',[place('water-cup',805,380,1.1),arrow([940,480],[820,390],'とりやすい ばしょ')]),
B('使いやすく 場所を変えていいよ','各道具の位置を少し調整して準備の自由度を示す。',[place('cloth',660,515,1.1),place('brush-round',755,460,.7),label('つくえに あわせて ためそう',210,575)])]);
out['W-02']=script('W-02',[
B('パレットの部屋を 見てみよう','パレットを大きく配置する。',[place('palette',500,330,3),label('ちいさい へやと ひろい へや')]),
B('小さい部屋へ 色を出すよ','小さい色だまりを赤と黄色で置く。',[wash(circle(340,270,38),'aka',{water:.1,mode:'opaque'}),wash(circle(445,230,38),'kiiro',{water:.1,mode:'opaque'}),label('すこしずつ だす')]),
B('広い部屋で 水を混ぜよう','中央の混色領域へ赤を水で薄める。',[wash(ellipse(530,390,120,65),'aka',{water:.7}),label('ひろい へやで みずを たす',390,550)]),
B('ほかの色も 少し混ぜられるね','広い部屋で赤と黄色を混ぜる。',[mix(ellipse(530,390,120,65),['aka','kiiro'],[1,1]),label('へやの かたちは どうぐで ちがう')])]);
out['W-03']=script('W-03',[
B('色のついた筆を 洗うよ','筆洗と色のついた筆の配置、洗う部屋を注記する。',[object('wash-cup','water-cup',300,340,2,'mizu'),place('brush-round',300,290,1),wash(circle(300,340,70),'chairo',{water:.9}),label('あらう',225,165)]),
B('別の水で すすぐよ','すすぐ用の筆洗を分けて配置し、筆を移す。',[object('rinse-cup','water-cup',550,340,2,'mizu'),place('brush-round',550,290,1),label('すすぐ',480,165),arrow([350,420],[480,420])]),
B('きれいな水で 色をとくよ','色を溶く用の水とパレットを置く。',[object('clean-cup','water-cup',800,340,2,'mizu'),place('palette',600,510,1.1),place('brush-round',800,290,1),label('いろを とく みず',685,165)]),
B('用具の部屋に 合わせて使おう','三つの使い分けは例であり、学校の道具に合わせると注記。',[label('へやの かずは どうぐで ちがう',210,80),label('みずは のまない',340,590)])]);
out['W-04']=script('W-04',[
B('筆へ 水を含ませるよ','筆洗と筆を表示して水を含ませる場面を図示する。',[place('water-cup',260,300,1.7),place('brush-round',250,280,1),label('みずを ふくませる')]),
B('ぞうきんへ 軽く当てるよ','筆をぞうきんの上へ移して、水を吸わせる場面を示す。',[place('cloth',560,350,1.9),place('brush-round',570,315,1),arrow([720,200],[590,340],'かるく あてる')]),
compareStep('W-04','水の量で 線をくらべよう','水が多い線と調整した線を比較する。',[paint(line(180,300,820,300),'ao',{water:.95,width:26})],[paint(line(180,300,820,300),'ao',{water:.25,width:26})],['みずが おおい','みずを すこし へらす']),
B('かきたい線に 合わせてみよう','細い線と広い面の使い分けを示す。',[paint(line(180,470,820,470),'ao',{width:8,water:.25}),label('どんな せんを かきたい？',210,80)])]);
out['W-05']=script('W-05',[
compareStep('W-05','水が少ない・多いを くらべよう','同じ下の鉛筆線を置いて透け方を比較する。',[pencil(line(120,315,870,315)),wash(rect(220,160,560,310),'aka',{water:.1,mode:'opaque'})],[pencil(line(120,315,870,315)),wash(rect(220,160,560,310),'aka',{water:.9})],['みずが すくない','みずが おおい']),
B('濃さのたとえは 食べ物の名前','三つの面を水量差で並べ、飲用の指示にしない。',[wash(rect(100,200,230,260),'ao',{water:.05,mode:'opaque'}),wash(rect(385,200,230,260),'ao',{water:.5}),wash(rect(670,200,230,260),'ao',{water:.95}),label('ヨーグルト',100,150),label('ぎゅうにゅう',385,150),label('ジュース',670,150)]),
B('下の線は どのくらい見える？','三つの色面の濃さと白い紙の見え方を注記する。',[label('たべものは つかわない',280,80),arrow([490,530],[490,410],'すけかた')]),
B('使う絵の具と紙で ためそう','水量だけで結果を断定せず実物で比較するよう促す。',[label('みずの りょうを すこしずつ かえよう',130,570)])]);
out['W-06']=script('W-06',[
B('筆先で 細い線をひこう','上段へ筆先の細い線を描く。',[paint(line(160,150,840,150),'midori',{width:8,part:'tip'}),label('ふでさき',150,100)]),
B('筆の腹で 広い面もできるね','中央へ筆の腹を使った広い線を描く。',[paint(line(160,285,840,285),'midori',{width:48,part:'belly',brush:'flat'}),label('ふでの はら',150,230)]),
B('とんとん 点を置いてみよう','点を叩く描画アクションで領域へ点を配置する。',[A('paint.dab',{region:rect(160,365,680,95),color:'midori',tool:'brush',count:36}),label('とんとん',150,335)]),
B('水が少ない 跡もためそう','かすれを筆の水量と疎な線として描く。',[paint({subpaths:[[[160,535],[280,535]],[[315,535],[430,532]],[[485,534],[610,534]],[[660,535],[840,532]]]},'midori',{water:.05,width:25}),label('かすれも ひょうげん',150,490)])]);
out['W-07']=script('W-07',[
B('赤と黄色を 少しずつ混ぜよう','2色同量の混色を左の領域へ図示する。',[mix(circle(260,300,110),['aka','kiiro'],[1,1]),label('あか ＋ きいろ',130,100)]),
B('量を変えると どう変わる？','赤が多い配合を中央へ置く。',[mix(circle(520,300,110),['aka','kiiro'],[3,1]),label('あかが おおい',410,100)]),
B('3色を混ぜた色も ためそう','3色で落ち着く色を右へ図示する。',[mix(circle(780,300,110),['aka','kiiro','ao'],[1,1,1]),label('3しょく',700,100)]),
B('落ち着いた色も 使えるよ','混色は近似である注記と活用を表示する。',[label('いろの へんかの めやす',220,470),label('どんな ものに つかいたい？',240,550)])]);
out['W-08']=script('W-08',[
B('元の色を ぬってみよう','赤の元色を中央の上段へ置く。',[wash(rect(365,90,270,95),'aka',{water:.15,mode:'opaque'}),label('もとの あか',355,60)]),
compareStep('W-08','白と水の違いを くらべよう','下の鉛筆線を白混色と水希釈でそれぞれ覆う。',[pencil(line(160,315,850,315)),mix(rect(220,180,560,260),['aka','shiro'],[1,2])],[pencil(line(160,315,850,315)),wash(rect(220,180,560,260),'aka',{water:.95})],['しろを まぜる','みずで うすめる']),
B('反対の色を 少し混ぜよう','赤と少量の緑を混ぜた色を右に置く。',[mix(rect(600,240,270,200),['aka','midori'],[1,.2]),label('みどりを すこし',580,200)]),
B('見せたい感じで 選べるね','色材を足す白と透け方を変える水を言葉で区別する。',[label('しろは いろの ざいりょう',90,510),label('みずは すけかたを かえる',90,560)])]);
out['W-09']=script('W-09',[
B('同じ向きへ 筆を動かすよ','左の領域を横方向で塗り始める。',[paint(line(160,220,820,220),'ao',{brush:'flat',part:'belly',width:52}),label('おなじ むき')]),
B('かわく前に となりをつなぐよ','次の横線を重ねて広い面へつなぐ。',[paint(line(160,270,820,270),'ao',{brush:'flat',part:'belly',width:52}),paint(line(160,320,820,320),'ao',{brush:'flat',part:'belly',width:52}),label('かわく まえに つなぐ')]),
B('先に色を 作っておこう','面の下部をつなぎ、用意した色の必要を示す。',[paint(line(160,370,820,370),'ao',{brush:'flat',part:'belly',width:52}),paint(line(160,420,820,420),'ao',{brush:'flat',part:'belly',width:52}),place('palette',870,540,.65)]),
B('むらも 表し方にできるね','均一な面と重なりの場所を観察する。',[arrow([840,100],[730,270],'つないだ ところ'),label('めんの かんじを えらぼう',210,550)])]);
out['W-10']=script('W-10',[
B('濃い色から ぬるよ','上部に比較的濃い青を横へ塗る。',[paint(line(180,180,820,180),'ao',{water:.15,width:70,brush:'flat',part:'belly'}),label('こい いろ')]),
B('少し水を 足してつなごう','中段に水量を増やした青をつなぐ。',[paint(line(180,270,820,270),'ao',{water:.5,width:70,brush:'flat',part:'belly'}),label('みずを すこし たす')]),
B('さらに うすい色へつなぐよ','下段へ水量を増やした色をつなぐ。',[paint(line(180,360,820,360),'ao',{water:.9,width:70,brush:'flat',part:'belly'}),label('すこしずつ かわる')]),
B('空や遠い景色へ 使ってみよう','色が変わる完成面と遠い山を合わせる。',[object('far','mountain',500,460,2.4,'mizu'),label('どんな くうかんに したい？',210,570)])]);
out['W-12']=script('W-12',[
B('下の色を ぬっておこう','黄色を濡れた層へ置く。',[wash(rect(170,150,660,330),'kiiro',{layer:'wet',water:.55}),label('したの きいろ')]),
B('かわくまで 待つよ','指定領域を乾燥定着し、短縮表示を明示する。',[A('paint.dry',{region:rect(170,150,660,330)}),label('ここでは はやく みせているよ')]),
B('薄い青と 濃い青を重ねるよ','乾燥した黄色の左へ透明調、右へ不透明調の青を重ねる。',[wash(rect(210,220,250,200),'ao',{water:.85}),wash(rect(540,220,250,200),'ao',{water:.1,mode:'opaque'}),label('うすい あお',210,100),label('こい あお',560,100)]),
B('下の色は どのくらい見える？','透ける場合と覆う場合の違いを示す。',[label('えのぐの せいひんでも かわる',190,540)])]);
out['W-13']=script('W-13',[
B('水多めの色を ぬるよ','黄色の濡れた領域を作る。',[wash(ellipse(500,310,300,165),'kiiro',{water:.85,layer:'wet'}),label('ぬれた きいろ')]),
B('赤を ちょんとたらすよ','黄色の濡れた領域内へ赤を置き、領域外へはにじませない。',[A('paint.drop',{at:[405,305],color:'aka',size:34,t:400,dur:300}),A('paint.bleed',{source:'action-0',region:ellipse(500,310,300,165),radius:145,t:700,dur:3100}),label('かわく まえに おく')]),
B('別の場所へ 青も置いてみよう','隣の青も濡れたマスク内へ広げる。',[A('paint.drop',{at:[610,330],color:'ao',size:30,t:400,dur:300}),A('paint.bleed',{source:'action-0',region:ellipse(500,310,300,165),radius:125,t:700,dur:3100}),label('かさなる ところを みよう')]),
B('広がりを見て かわかそう','乾燥して模様を定着する。',[A('paint.dry',{region:ellipse(500,310,300,165)}),label('かわく じかんは はやく みせている')])]);
out['W-14']=script('W-14',[
B('ぬれた色の 面をつくるよ','赤の濡れた面を作る。',[wash(ellipse(500,315,250,160),'water',{water:.9}),wash(ellipse(500,315,220,145),'aka',{water:.65,layer:'wet'}),label('ぬれている いろ')]),
B('きれいな水の筆で ふちをなぞる','水のマスクと水色の穂先で濡れた色の境界をなぞる。',[wash(rect(660,210,95,220),'water',{water:.7}),A('paint.soften',{path:line(675,220,690,410),width:62,strength:.7}),label('みずの ふでで ふちを やわらげる')]),
B('残すふちと ぼかすふちを選ぼう','片側だけを水の筆でぼかし、もう片側をくっきり残す。',[A('paint.soften',{path:points([650,225],[690,270],[700,355],[650,410]),width:46,strength:.55}),arrow([230,480],[310,315],'のこした ふち')]),
B('ぬれたうちに ためそう','乾燥後の仕上がりを固定し、実物の条件を注記する。',[A('paint.dry',{region:ellipse(500,315,280,170)}),label('かわいた あとは かわりかたが ちがう')])]);
out['W-15']=script('W-15',[
B('パレットの残りを ふくよ','汚れたパレットとぞうきんを図示する。',[place('palette',300,290,1.9),place('cloth',370,325,1.2),label('のこりを ふく')]),
B('筆を洗って 穂先を整えよう','筆洗、洗う筆、整えた筆を示す。',[place('water-cup',630,300,1.7),place('brush-round',625,290,.9),label('ふでを あらう',570,100)]),
B('水は 決めた場所へ捨てるよ','流しではなく指定回収容器を表示する。',[place('tray',800,485,1.3),arrow([650,370],[795,470],'きめた かいしゅう ばしょ'),label('がっこうの ルールを きこう',190,80)]),
B('道具を戻して 手を洗おう','道具を収納位置へ配置し、手洗いは文字説明だけにする。',[place('palette',260,500,1),place('brush-round',470,500,.8),place('cloth',620,500,1),label('つぎに つかいやすく もどそう',200,150)])]);
out['W-16']=script('W-16',[
B('うすい下がきで 形を見よう','りんごの軽い鉛筆輪郭を置く。',[pencil(oval(500,315,200,150),{hardness:'H',pressure:.2}),pencil(line(500,165,520,125),{hardness:'H',pressure:.2}),label('うすい したがき')]),
B('色でも 形ができるね','線を全てなぞらず、内側に赤い面を置く。',[wash(ellipse(500,330,190,135),'aka',{water:.5}),label('いろの さかいで かたち')]),
B('残したい線も 選べるよ','一部だけ軸を色で示し、輪郭の線は残す。',[paint(line(500,195,520,135),'chairo',{width:13}),label('せんを のこす ところ')]),
B('全部を なぞらなくてもいいよ','下描きと色の役割を注記する。',[arrow([270,510],[330,325],'せんと いろ'),label('みせたい かたちを えらぼう',210,80)])]);
out['W-17']=script('W-17',[
B('空の大きい面を 決めよう','上半分の空領域を注記する。',[label('ひろい そらの ばしょ'),A('note.circle',{at:[500,220],r:160})]),
B('広い筆で 色をつなごう','空を青から水色へ面でつなぐ。',[wash(rect(90,120,820,310),'ao',{pattern:'grad',gradTo:'mizu',water:.7}),label('ひろい ふでで ぬる')]),
B('主役と背景を 合わせてみよう','大きな木を空の前へ置く。',[object('tree','tree',490,430,2.5,'midori'),wash(rect(90,450,820,90),'kimidori',{water:.7}),label('しゅやくと はいけい')]),
B('時間や場所で 色を選べるね','夕方の雲を加え、背景の選択を促す。',[object('cloud','cloud',710,250,1.1,'momo'),label('どんな じかんに したい？',190,580)])]);
out['W-18']=script('W-18',[
B('白を残す形を 決めてみよう','雲にする中央の白い領域を注記する。',[label('ここを ぬらずに のこす'),A('note.circle',{at:[500,270],r:130})]),
B('周りへ 色をぬるよ','雲の白い形を避けた四つの多角形の水彩を描く。',[wash(rect(120,120,760,100),'ao',{water:.7}),wash(rect(120,380,760,130),'mizu',{water:.7}),wash(polygon([[120,220],[360,220],[340,270],[355,325],[390,380],[120,380]]),'ao',{water:.7}),wash(polygon([[640,220],[880,220],[880,380],[610,380],[660,325],[650,270]]),'ao',{water:.7})]),
B('ぬらない紙が 雲に見えるね','紙の白と色の境界を示す。',[arrow([260,560],[485,300],'かみの しろ'),label('しろい えのぐとは べつの ほうほう')]),
B('どんな白を 残したい？','小さい白の光として未塗装の隙間も示す。',[label('ひかりや はなにも つかえる',210,560)])]);

out['M-01']=script('M-01',[
B('かみの はんぶんに いろを おくよ','折る軸の左半分だけに赤と青の色を置く。',[wash(ellipse(350,280,130,70),'aka',{water:.4}),wash(ellipse(380,400,100,60),'ao',{water:.4}),label('かわく まえに')]),
B('おって そっと おさえよう','中央軸へ紙を合わせる転写アクション。',[A('decal.fold',{region:rect(120,120,760,410),axis:'vertical'}),label('おって あわせる')]),
B('ひらくと にた かたちに なるね','左右へ写った形の見え方を注記する。',[arrow([180,100],[350,280],'はじめの かたち'),arrow([730,100],[650,280],'うつった かたち')]),
B('なにに みえる？','対称に近い偶然の形へ目と触角以外の抽象点を添え、見立てを促す。',[crayon({gen:'dots',x:430,y:290,w:140,count:3},'kiiro',{width:20}),label('じぶんの なまえを つけよう',210,570)])]);
out['M-02']=script('M-02',[
B('やさいの あとを おしてみよう','準備済みの野菜断面の跡を左へ押す。',[A('stamp.press',{at:[230,300],color:'aka',shape:'vegetable',size:130,count:3}),label('やさい',160,100)]),
B('スポンジなら どうなる？','中央へスポンジの四角い跡を押す。',[A('stamp.press',{at:[500,300],color:'ao',shape:'square',size:105,count:3}),label('スポンジ',420,100)]),
B('だんボールの すじも みえるね','右へ段ボールの筋の跡を押す。',[A('stamp.press',{at:[770,300],color:'midori',shape:'cardboard',size:125,count:3}),label('だんボール',665,100)]),
B('むきや かさなりを かえてみよう','下に葉の跡を追加して組み合わせの選択を示す。',[A('stamp.press',{at:[380,490],color:'kiiro',shape:'leaf',size:90,count:4}),label('がざいの やさいは たべない',210,580)])]);
out['M-03']=script('M-03',[
B('すこし いろを たらすよ','上部に赤い色の始点を置く。',[A('paint.drop',{at:[300,170],color:'aka',size:36}),label('すこしずつ')]),
B('かたむけると ながれるよ','上から下へ重力に沿う赤い道を描く。',[A('drip',{path:points([300,170],[310,250],[335,350],[345,470]),color:'aka',width:28}),arrow([750,170],[750,380],'かたむける むき')]),
B('むきを かえると どうなる？','違う傾きで青が斜めへ流れる道を描く。',[A('drip',{path:points([550,160],[590,255],[650,365],[770,490]),color:'ao',width:24}),label('むきを かえる')]),
B('いろの みちから みつけよう','流れの分岐のような短い道を加える。',[A('drip',{path:points([340,370],[450,430],[495,485]),color:'aka',width:14}),label('なにに みえる？',350,570)])]);
out['M-04']=script('M-04',[
B('色を少し 紙へおこう','赤い色だまりと離したストローの図。',[A('paint.drop',{at:[330,320],color:'aka',size:45}),place('straw',190,370,.9),label('ストローは いろに つけない')]),
B('短く吹くと 枝分かれするよ','右方向への送風で赤が枝状に広がる。',[A('blow',{at:[330,320],color:'aka',direction:[1,0],length:270,branches:7}),label('すこしずつ ふく')]),
B('息の向きも 変えてみよう','別の位置から上向きへ青を広げる。',[A('blow',{at:[720,460],color:'ao',direction:[0,-1],length:240,branches:6}),label('むきを かえる')]),
B('口を離して 息を吸おう','吸い込まない休息の手順を文字で表示する。',[label('すわない',350,90),label('くちを はなして いきを すう',200,540)])]);
out['M-05']=script('M-05',[
B('紙の周りを 広くおおう','広い範囲の養生と網・ブラシの道具を表示する。',[place('paper',500,320,3.4),place('net',790,200,1.2),place('brush',700,140,1),label('ひとへ むけない')]),
B('網とブラシで 点を飛ばすよ','青い細かい点を中央の領域へ配置する。',[A('splatter',{region:rect(160,160,680,310),color:'ao',count:250,size:4}),place('net-brush',690,230,1),label('かみへ むける')]),
B('距離や色を 変えてみよう','赤い少し大きな点を狭い領域へ重ねる。',[A('splatter',{region:ellipse(450,320,230,130),color:'aka',count:100,size:7}),label('てんの おおきさを くらべる')]),
B('細かい点を 何に使う？','星空の例へ白の点を重ねる。',[A('splatter',{region:rect(180,180,640,270),color:'shiro',count:90,size:3}),label('かおを ちかづけない',240,550)])]);
out['M-06']=script('M-06',[
B('スポンジに いろを つけよう','パレットとスポンジを置く。',[place('palette',220,420,1.3),place('sponge',230,370,1),label('いろを つけすぎない')]),
B('そっと ぽんぽん おすよ','緑のスポンジ跡を広めの領域へ押す。',[A('paint.dab',{region:ellipse(420,300,200,130),color:'midori',tool:'sponge',count:35}),label('そっと おす')]),
B('かさねたり はなしたり しよう','黄緑の跡を重ね、離れた場所にも押す。',[A('paint.dab',{region:ellipse(560,340,180,140),color:'kimidori',tool:'sponge',count:45}),A('paint.dab',{region:circle(780,230,65),color:'kimidori',tool:'sponge',count:9}),label('かさなりと すきま')]),
B('ふわっとした あとを つかおう','葉の集まりとして木の幹を添える。',[paint(line(510,400,510,530),'chairo',{width:25}),label('くもや もりに つかえるね',210,570)])]);
out['M-07']=script('M-07',[
B('専用の画材と液を 用意するよ','専用液の容器を示し、普通の水彩と区別する。',[place('tray',500,320,3.5),label('せいひんで していされた えき'),label('おとなと じゅんび',320,550)]),
B('水面へ 色をおくよ','領域に赤・青・黄の模様を生成する。',[A('marble.swirl',{region:rect(190,180,620,280),colors:['aka','ao','kiiro'],turns:1}),label('みずの うえの もよう')]),
B('そっと動かして 模様を見よう','同じ色の領域へ回転数を変えた模様を図示する。',[A('marble.swirl',{region:rect(190,180,620,280),colors:['aka','ao','kiiro'],turns:3}),label('せんの ながれを ためす')]),
B('紙に写して 形を見つけよう','専用液上の模様を固定した紙へ転写し、紙が右下へ移る図示。実際の紙や顔料の転写条件は製品による。',[A('marble.transfer',{region:rect(190,180,620,280),to:[725,430],scale:.5}),arrow([790,150],[790,450],'かみへ うつす'),label('ふつうの すいさいだけでは ちがう',130,560)])]);

out['K-01']=script('K-01',[
B('いろを ならべてみよう','赤、黄、青、水色の四つの色を同じ形で置く。',[fill(circle(170,320,75),'aka'),fill(circle(390,320,75),'kiiro'),fill(circle(610,320,75),'ao'),fill(circle(830,320,75),'mizu'),label('いろの かんじを はなそう')]),
B('あたたかく かんじる いろは？','暖色の代表例を注記し、正解にしない。',[A('note.circle',{at:[170,320],r:90}),A('note.circle',{at:[390,320],r:90}),label('ひとによって ちがう')]),
B('つめたく かんじる いろは？','寒色の代表例を注記する。',[A('note.circle',{at:[610,320],r:90}),A('note.circle',{at:[830,320],r:90}),label('どんな ばしょを おもいだす？')]),
B('ちがう かんじかたも きこう','中間色も追加し一意分類を避ける。',[fill(circle(500,515,65),'murasaki'),label('じぶんの かんじを だいじに',210,80)])],'none');
out['K-02']=script('K-02',[
B('色を輪に 並べてみよう','赤・橙・黄・緑・青・紫の六つの有彩色を代表的な色相の輪で置く。白黒茶を色相の位置へ含めない。',[...['aka','daidai','kiiro','midori','ao','murasaki'].map((color,i)=>fill(circle(500+210*Math.cos(i*Math.PI/3),310+210*Math.sin(i*Math.PI/3),42),color)),label('だいひょうてきな いろの わ',190,40)]),
B('となりの色を くらべよう','赤と橙へ注目する丸を置く。',[A('note.circle',{at:[710,310],r:53}),A('note.circle',{at:[605,492],r:53}),label('となりの いろ',365,310)]),
B('向かいの色を 並べてみよう','代表モデル上の赤と緑の位置を線で示す。',[arrow([710,310],[290,310],'むかいの いろ'),label('いろの わの モデルで ちがう',190,40)]),
B('配色の手がかりに 使えるね','隣接する色と離れた色の組合せの選択を促す。',[label('どんな くみあわせを つかう？',220,570)])],'none');
out['K-03']=script('K-03',[
B('元の色を ぬってみよう','中央に元の青を置く。',[mix(circle(500,310,85),['ao'],[1]),label('もとの あお',380,180)]),
B('白を少しずつ 足そう','左へ白の量が違う二つの明るい青を置く。',[mix(circle(300,310,75),['ao','shiro'],[1,1]),mix(circle(130,310,60),['ao','shiro'],[1,3]),label('しろを ふやす',100,100)]),
B('黒も少しずつ 足してみよう','右へ黒の量が違う二つの暗い青を置く。',[mix(circle(700,310,75),['ao','kuro'],[1,.25]),mix(circle(870,310,60),['ao','kuro'],[1,.7]),label('くろを ふやす',620,100)]),
B('どんな明るさを 使いたい？','明るさは比較として扱い、用途を問う。',[label('みずで うすめるのとは ちがう',200,510),label('あかるさの めやす',300,570)])],'none');
out['K-04']=script('K-04',[
B('白と黒で 灰色を作ろう','左上に灰色の混色を置く。',[mix(circle(250,190,75),['shiro','kuro'],[2,1]),label('はいろを つくる')]),
B('元の色へ 少し混ぜてみよう','赤の元色と少量の白黒を含む落ち着いた色を並べる。',[mix(circle(220,400,90),['aka'],[1]),mix(circle(490,400,90),['aka','shiro','kuro'],[1,.3,.15]),label('すこし まぜる',380,290)]),
B('量をふやすと どう感じる？','さらに灰色を多くした赤を右へ置く。',[mix(circle(760,400,90),['aka','shiro','kuro'],[1,1,.5]),label('はいろが おおい',630,290)]),
B('しずかな色も 選べるね','落ち着く色を劣った色と扱わず活用を促す。',[label('どんな ばしょや じかんに つかう？',170,560)])],'none');
out['K-05']=script('K-05',[
B('赤・黄・青から 始めよう','三色の元色を上段へ置く。',[mix(circle(260,170,65),['aka'],[1]),mix(circle(500,170,65),['kiiro'],[1]),mix(circle(740,170,65),['ao'],[1]),label('この3しょくで ためす')]),
B('2色を混ぜて くらべよう','赤黄、黄青、赤青の三つを下段へ並べる。',[mix(circle(260,380,80),['aka','kiiro'],[1,1]),mix(circle(500,380,80),['kiiro','ao'],[1,1]),mix(circle(740,380,80),['aka','ao'],[1,1])]),
B('量を変えると どう変わる？','黄色が多い黄青の色を下に追加する。',[mix(ellipse(370,525,95,35),['kiiro','ao'],[3,1]),mix(ellipse(630,525,95,35),['kiiro','ao'],[1,3]),label('きいろが おおい',180,575),label('あおが おおい',580,575)]),
B('全ての色は 作れないよ','画面の混色近似と原色の限界を説明する。',[label('いろの へんかの めやす',190,70),label('ぜんぶの いろは つくれない',190,585)])],'none');
out['K-06']=script('K-06',[
B('おなじ かたちを ならべよう','同じ花形を同じ大きさで左右へ置く。',[object('a','flower',280,320,2,'aka'),object('b','flower',720,320,2,'ao'),label('かたちは おなじ')]),
B('いろから どんな かんじ？','赤と青の花の感じを問う。',[label('あか',240,480),label('あお',680,480),label('どんな きもちや ばしょを かんじる？',140,80)]),
B('べつの いろでも ためそう','同じ二つの花を黄と紫へ変更する。',[object('a','flower',280,320,2,'kiiro'),object('b','flower',720,320,2,'murasaki'),label('きいろ',210,480),label('むらさき',660,480)]),
B('かんじかたは ひとそれぞれだよ','固定的な感情対応を用いず複数の感じ方を促す。',[label('きもちの こたえは ひとつじゃない',140,80),label('じぶんの いろを えらぼう',220,560)])],'none');

out['Z-01']=script('Z-01',[
compareStep('Z-01','ちいさい・おおきいを くらべよう','同じ花を小さい配置と大きい配置で比べる。',[object('flower','flower',500,310,.9,'aka')],[object('flower','flower',500,310,3,'aka')],['ちいさい かたち','おおきい かたち']),
B('まわりの あきを みてみよう','小さい花を左、大きい花を右へ置く。',[object('small','flower',260,300,.8,'aka'),object('large','flower',720,300,2.2,'aka'),label('まわりの あき')]),
B('あいている ばしょも つかえるね','空きを点線の円で注目する。',[A('note.circle',{at:[280,500],r:70}),label('あきから なにを かんじる？',140,80)]),
B('みせたい ことで えらぼう','大きさを変える選択を示す。',[object('small','flower',260,300,1.4,'aka'),label('どちらも えらべるよ',280,570)])],'none');
out['Z-02']=script('Z-02',[
compareStep('Z-02','たてなが・よこながを くらべよう','縦長と横長の紙を同じステージ内の枠として比較する。',[object('paper','paper',500,310,3,'shiro',{rotation:90}),object('tree','tree',500,310,1.8,'midori')],[object('paper','paper',500,310,3,'shiro'),object('tree','tree',500,310,1.8,'midori')],['たてなが','よこなが']),
B('たかい きなら どう おく？','縦の伸びる木と縦長の紙を図示する。',[object('sheet','paper',270,315,2.5,'shiro',{rotation:90}),object('tree','tree',270,320,2,'midori'),label('たてに のびる',100,80)]),
B('よこに のびる けしきも あるね','横長の紙と山を配置する。',[object('sheet2','paper',750,315,2.5,'shiro'),object('mountain','mountain',750,350,1.7,'ao'),label('よこに のびる',575,80)]),
B('かきたい もので えらぼう','紙の向きを表したいことから選ぶと促す。',[label('なにを みせたい？',340,550)])],'none');
out['Z-03']=script('Z-03',[
B('同じ形を いくつか置こう','同じ木を三つ並べる。',[object('a','tree',250,330,1.3,'midori'),object('b','tree',500,330,1.3,'midori'),object('c','tree',750,330,1.3,'midori'),label('どこに めが いく？')]),
B('大きさで 主役を変えてみよう','中央の木だけ大きくする。',[object('b','tree',500,320,2.4,'midori'),label('おおきさを かえる')]),
B('色でも 見え方が変わるね','左の木を赤へ変え、右へ位置を調整する。',[object('a','tree',250,330,1.3,'aka'),object('b','tree',570,320,1.8,'midori'),label('いろと ばしょを かえる')]),
B('どこを 見てほしい？','単一の主役を強制せず見せたいことを問う。',[label('しゅやくを いくつに しても いい',140,520)])],'none');
out['Z-04']=script('Z-04',[
B('まず 中央へ置いてみよう','中央に同じ花を置く。',[object('flower','flower',500,320,1.6,'aka'),label('まんなかの はいち')]),
B('三つずつに 分ける線を見るよ','三分割の補助線を表示する。',[A('grid.show',{kind:'thirds'}),label('3つずつに わける')]),
B('交点の近くへ 置いてみよう','左下側の交点へ主役を移動する。',[object('flower','flower',333,416,1.6,'aka'),label('こうてんの ちかく')]),
B('中央も三分割も 選べるね','補助線を消し、表したい感じに合わせると示す。',[A('grid.hide'),label('どちらも えらべるよ',300,80)])],'none');
out['Z-05']=script('Z-05',[
B('形を はなして置いてみよう','三つの葉を離して置く。',[object('a','leaf',220,320,1.5,'aka',{z:1}),object('b','leaf',500,320,1.5,'kiiro',{z:2}),object('c','leaf',780,320,1.5,'midori',{z:3}),label('はなれた かたち')]),
B('重ねると 前後が見えるね','葉を近づけて前後を重なりで表す。',[object('a','leaf',410,320,1.8,'aka',{z:1}),object('b','leaf',510,330,1.8,'kiiro',{z:2}),object('c','leaf',610,340,1.8,'midori',{z:3}),label('てまえが おくを かくす')]),
B('前後を 入れかえてみよう','同じ位置で赤い葉のzを前へ変更する。',[object('a','leaf',410,320,1.8,'aka',{z:4}),label('どれが まえに みえる？')]),
B('かくれた所も 想像できるね','隠れた輪郭を注記で想像するよう促す。',[arrow([700,180],[550,320],'かくれた ところ'),label('どの かたちを まえに したい？',200,540)])],'none');
out['Z-06']=script('Z-06',[
B('平らな地面と 地平線を見るよ','平らな地面と地平線を示す。',[wash(rect(100,300,800,260),'kimidori',{water:.8}),pencil(line(100,300,900,300)),label('ちへいせん',700,280)]),
B('近い木を 見てみよう','手前の大きな木を地面へ配置する。',[object('near','tree',260,460,2.2,'midori'),label('ちかい き',130,180)]),
B('遠い木の 大きさと位置は？','遠い木を地平線へ近く小さく置く。',[object('far','tree',730,330,.65,'midori'),object('middle','tree',530,390,1.2,'midori'),label('とおい き',660,200)]),
B('同じ場所から 見る一例だよ','条件を明記して、いつでも上へ置くという断定を避ける。',[label('おなじ たいらな じめんの れい',170,80),arrow([820,540],[730,335],'おおきさと いち')])],'none');
out['Z-07']=script('Z-07',[
B('昼の遠い山を 見てみよう','遠い淡青の山を後ろのzへ置く。',[object('far','mountain',580,270,2.6,'mizu',{z:0,opacity:.45}),label('ひるまの やまの いちれい')]),
B('近い山と 色をくらべよう','手前の濃い緑の山を重ねる。',[object('near','mountain',370,415,3.2,'midori',{z:2}),label('ちかい やま',140,550)]),
B('遠い色は うすく青寄りの例だよ','遠山へ注目の矢印を表示する。',[arrow([830,110],[670,255],'とおい やま'),label('じかんや てんきで かわる',150,70)]),
B('見た景色の色を 選んでいいよ','夕方の変化例として淡紫へ更新する。',[object('far','mountain',580,270,2.6,'murasaki',{z:0,opacity:.45}),label('じぶんが みた いろを つかおう',170,580)])],'none');
out['Z-08']=script('Z-08',[
B('同じ建物を 見てみよう','正面に近い家の図を置く。',[object('house','house',500,330,2.5,'daidai'),label('おなじ たてもの')]),
B('下から見ると 高く感じる？','低い視点の注記と、大きい建物の形を表示する。',[object('house','house',500,325,3.8,'daidai'),label('むしの め みあげる'),arrow([220,540],[430,240],'したから')]),
B('上から見ると 上の面が見えるね','上面を思わせる四角・屋根を別図形で図示する。',[object('house','house',500,370,1.8,'daidai',{rotation:0}),object('roof','triangle',500,300,1.9,'chairo'),label('とりの め みおろす'),arrow([260,130],[450,310],'うえから')]),
B('見る場所の違いを ためそう','画面の簡略図であり安全な観察場所を選ぶと示す。',[label('あんぜんな ばしょから みよう',180,570)])],'none');
out['Z-09']=script('Z-09',[
B('まっすぐな 配置を見よう','同じ木と三角をまっすぐ置く。',[object('tree','tree',350,350,2,'midori'),object('triangle','triangle',680,350,1.8,'aka'),label('まっすぐ')]),
B('ななめにすると どう感じる？','木と三角を傾ける。',[object('tree','tree',350,350,2,'midori',{rotation:-25}),object('triangle','triangle',680,350,1.8,'aka',{rotation:30}),label('ななめに かたむける')]),
B('三角の並びも ためしてみよう','三つの花を三角配置する。',[object('one','flower',230,510,.8,'kiiro'),object('two','flower',500,200,.8,'kiiro'),object('three','flower',790,510,.8,'kiiro'),label('どちらへ うごきそう？')]),
B('動きも静けさも 選べるね','動きの印象は人によることを含め用途を問う。',[label('みせたい うごきを えらぼう',210,580)])],'none');
out['Z-10']=script('Z-10',[
B('正面に近い道を 見てみよう','一点へ向かう道の左右の線を描く。',[pencil(points([100,560],[500,250],[900,560])),label('おくへ のびる みち')]),
B('線を延ばすと 一つの点へ','消失点の補助線を表示する。',[A('grid.show',{kind:'perspective',vanishing:[500,250]}),A('note.circle',{at:[500,250],r:24}),label('あつまる てん',545,230)]),
B('建物も 線を手がかりにするよ','近い家と遠い家を道の両側へ置く。',[object('near','house',200,450,1.3,'chairo'),object('far','house',615,315,.5,'chairo'),pencil(line(220,390,500,250)),label('おくへ むかう せん')]),
B('全部の線が 集まるわけではないよ','縦横の線はそのまま、一点へ向かう方向を限定する。',[A('grid.hide'),label('たてや よこの せんは べつ',150,80),arrow([150,190],[170,430],'たての せん')])],'none');

out['O-01']=script('O-01',[
B('もののふちを ゆっくり見るよ','葉の観察対象と目でたどる方向を表示する。',[object('leaf','leaf',700,305,2.1,'midori'),arrow([830,150],[770,245],'めで たどる'),label('かみを みずに ためす')]),
B('目の動きに合わせて 線を動かす','観察対象を見ながら紙側へ非正確な輪郭を描く。',[pencil(points([170,450],[135,330],[150,210],[230,165],[300,230],[365,260],[340,350],[280,445],[170,450])),label('ずれても たのしもう')]),
B('ゆっくり見た所を 話してみよう','複雑な葉脈と輪郭の注目を示す。',[pencil(points([175,420],[230,295],[325,240])),arrow([450,180],[270,240],'よく みた ところ')]),
B('思いがけない線を 見つけよう','出来た線を採点せず見立てを促す。',[label('どんな かたちに みえる？',210,570)])],'none');
out['O-02']=script('O-02',[
B('同じ場所から 長さをくらべるよ','りんごと容器を並べ、観察位置を固定する。',[object('apple','apple',320,345,1.6,'aka'),object('cup','water-cup',660,345,1.8,'mizu'),label('みる ばしょを そろえる')]),
B('えんぴつを 目安にしてみよう','長さを比べる目安の鉛筆を紙上へ置く。',[place('pencil',220,260,.75),arrow([280,210],[280,420],'ながさの めやす')]),
B('角度と 全体の形も見るよ','傾きの線と二つの大きさの比較を表示する。',[pencil(line(160,495,450,440),{pressure:.3}),pencil(line(570,440,760,440),{pressure:.3}),label('かたむきも くらべる')]),
B('目安は 観察の手がかりだよ','絶対寸法の正解を要求しない言葉を表示する。',[label('ひりつの こたえは ひとつではない',120,70),label('めに ちかづけない',250,575)])],'none');
out['O-03']=script('O-03',[
B('頭と胴の つながりを見よう','人物の頭と胴を抽象図形で示し、手の絵は描かない。',[object('head','ellipse',330,180,.9,'momo'),object('body','rect',330,345,1.4,'ao'),label('あたまと どう')]),
B('曲がる所を 見つけよう','肘や膝の位置を円の注記、腕・脚は線のみで示す。',[pencil({subpaths:[[[265,290],[205,360],[240,420]],[[395,290],[450,350],[430,430]],[[290,410],[265,475],[280,550]],[[370,410],[395,475],[380,550]]]}),A('note.circle',{at:[205,360],r:18}),A('note.circle',{at:[395,475],r:18}),label('かんせつ')]),
B('姿勢で 見える長さが変わるね','別の姿勢を線と胴の矩形で示す。',[object('head2','ellipse',720,225,.9,'momo'),object('body2','rect',710,355,1.2,'midori',{rotation:18}),pencil({subpaths:[[[675,400],[625,455],[650,535]],[[740,400],[800,415],[860,450]],[[655,295],[600,260],[575,320]],[[760,310],[810,350],[835,320]]]}),label('ひとや しせいで ちがう',500,90)]),
B('その人らしい 姿勢を見よう','比率の固定解を作らない説明を置く。',[label('ひとの ちがいを だいじに',210,585)])],'none');
out['O-04']=script('O-04',[
B('頭と体の向きを 線でかこう','走る姿の骨組みを丸と線で描く。',[pencil(oval(390,190,42,48)),pencil({subpaths:[[[390,235],[440,335],[485,410]],[[440,315],[340,340],[290,280]],[[440,315],[520,275],[580,320]],[[485,410],[410,470],[365,550]],[[485,410],[585,450],[640,410]]]}),label('うごきの ほねぐみ')]),
B('関節の 曲がりを見よう','肘、膝の曲がる位置を丸で注記する。',[A('note.circle',{at:[340,340],r:21}),A('note.circle',{at:[410,470],r:21}),A('note.circle',{at:[585,450],r:21}),label('どこが まがる？')]),
B('体の広さや服を 足してみよう','胴の傾いた矩形と服の色面だけを加え、手形を描かない。',[object('shirt','rect',442,325,1.3,'aka',{rotation:-27}),paint(line(405,265,475,370),'aka',{width:40}),label('せんから めんへ')]),
B('どの瞬間を 表したい？','傾きと動きの方向を注記する。',[arrow([680,130],[535,240],'うごく むき'),label('ひりつは しせいで かわる',210,580)])],'none');
out['O-05']=script('O-05',[
B('顔全体の形を 見てみよう','顔全体の楕円と中心の補助線を描く。',[pencil(oval(360,310,145,190)),A('grid.show',{kind:'center'}),label('ぜんたいの かたち')]),
B('目・鼻・口の位置を くらべよう','正面の位置関係を例として線と点で示す。',[pencil({subpaths:[[[285,270],[315,270]],[[405,270],[435,270]],[[360,280],[345,350],[370,355]],[[305,405],[360,415],[415,405]]]}),label('いちの てがかり')]),
B('向きを変えると どう見える？','横向きに近い顔を置き、隠れや見える面を示す。',[object('side','face',730,320,2.1,'momo',{rotation:10}),A('grid.hide'),label('むきで かくれる ところ',570,80)]),
B('その人の違いを 観察しよう','同じ比率を求めず個人差、年齢、向きを明示する。',[label('ひと・ねんれい・むきで ちがう',110,570)])],'none');
out['O-06']=script('O-06',[
B('大きい部分を 見つけよう','ユーザー方針により手のイラストは出さず、互いに離れた抽象的な丸・四角の観察ガイドを置く。',[object('guide-a','ellipse',230,320,1.8,'mizu'),object('guide-b','rect',740,320,1.8,'kiiro'),label('じつぶつを みて くらべよう')]),
B('細長い部分の 長さをくらべよう','互いに離した横棒三つを鉛筆で描き、構造の比較だけを示す。',[pencil(line(120,190,370,190),{width:12}),pencil(line(420,330,770,330),{width:12}),pencil(line(250,490,450,490),{width:12}),label('ながさは どう ちがう？')]),
B('曲がる所を 実物で見つけよう','抽象的な折れ線の曲がり位置を円で注記する。手形や指、手袋を描かない。',[pencil(points([700,140],[800,250],[720,390])),A('note.circle',{at:[800,250],r:30}),label('まがる ところの てがかり')]),
B('向きを変えると 何がかくれる？','独立した図形の重なりへ注目し、実物を観察して言葉にする。',[object('guide-a','ellipse',360,320,1.8,'mizu'),object('guide-b','rect',460,320,1.8,'kiiro'),label('アニメは かんさつの ガイド',170,575)])],'none');

export const animations = out;
