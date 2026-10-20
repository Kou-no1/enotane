// Original examples vary in motif, placement and mark-making, not only color.
const E=(id,title,motif,colors,layout,techniques,description)=>({id,title,image:`assets/challenges/${id}.svg`,motif,colors,layout,techniques,description});
export const challenges=[
{id:'fireworks',title:'ひっかき絵の花火',lessons:['C-05','C-09'],invitation:'線や下の色を選んで、自分の夜の景色をつくろう。写す必要はないよ。',materials:['クレヨン','黒いパス','紙','先の丸い割りばし'],safety:['道具を人に向けない','削ったかすを口に入れない'],examples:[
E('fireworks-garden','空いっぱいの花','大きさの違う放射状の花火',['あか','きいろ','あお'],'上へ大きく3つ、下へ小さく2つ',['明るい色の下地','放射状のスクラッチ'],'異なる長さの線で、花が開くような夜空にした例。'),
E('fireworks-river','川にうつる光','花火と水面の波',['ももいろ','みずいろ','しろ'],'上に一つの花火、下半分に横長の波',['重ねぬり','曲線と点のスクラッチ'],'水面の曲線を重ね、花火だけでない景色をつくった例。'),
E('fireworks-path','光の道','ぐるぐるの花火と斜めの道',['きみどり','むらさき','だいだい'],'左の渦から右下へ流れる斜めの配置',['渦巻きのスクラッチ','短い線と点'],'ぐるぐるの線や点をつないで、動く光を表した例。')],},
{id:'night-sky',title:'にじみの夜空',lessons:['W-11','M-05'],invitation:'にじみの広がりと点の間を選んで、感じた夜空をつくろう。',materials:['水彩絵の具','丸筆','紙','水','網','ブラシ','養生材'],safety:['水をこぼしたらふく','点は紙へ向け、人へ向けない','顔を近づけない'],examples:[
E('night-sky-cloud','広がる雲の夜','横長の色の雲とまばらな星',['あお','むらさき','しろ'],'横長の雲を中央、点は上側',['水の上のにじみ','小さいスパッタリング'],'大きくにじむ空と、はなれた小さい点を合わせた例。'),
E('night-sky-moon','月の周りの空','白を残した丸い月と丸いにじみ',['みずいろ','あお','きいろ'],'月を右上、丸い色の広がりを左下',['にじみ','白ぬき','少数の大きな点'],'紙の白を月に見立て、静かな空きを残した例。'),
E('night-sky-wind','風の通る空','斜めの帯とたくさんの点',['ももいろ','あお','しろ'],'斜めのにじみ帯を3本、点を下側へ密に',['にじみの重なり','点の密度の変化'],'点の密度と斜めの流れで、風のある夜を表した例。')],},
{id:'forest',title:'森の奥行き',lessons:['Z-05','Z-07','W-10'],invitation:'重なりや色、空きの場所を変えて、自分の森の感じをつくろう。',materials:['水彩絵の具','筆','紙','水'],safety:['水をこぼしたらふく'],examples:[
E('forest-river','川の奥へ続く森','川と三層の木',['みどり','みずいろ','あお'],'中央に川の空き、左右に木の重なり',['色のグラデーション','重なり','遠景の淡い色'],'川に沿う空きを作り、近い木と遠い木を重ねた昼の例。'),
E('forest-clearing','広い空きのある森','小さい遠景の木と近くの一本',['きみどり','むらさき','ちゃいろ'],'大きい木は左だけ、右半分に空きを残す',['遠景の淡い色','余白','少ない重なり'],'木を増やすことだけを目標にせず、広い空間を選んだ例。'),
E('forest-hill','斜面に広がる森','山と斜めに重なる木',['みどり','きいろ','あお'],'左下から右上の斜面に木を並べる',['重なり','異なる水量の面','三角の配置'],'斜面の条件を添え、地面の形と木の重なりを組み合わせた例。')],},
{id:'creature',title:'ふしぎな生き物',lessons:['M-01','P-02'],invitation:'写った形から見つけた生き物に、自分の線を足してみよう。',materials:['絵の具','紙','筆','えんぴつ','ぞうきん'],safety:['絵の具を口に入れない','終わったら手を洗う'],examples:[
E('creature-wing','大きい羽の生き物','左右に広い羽と長い触角',['あか','あお','きいろ'],'中央の小さい体から左右へ広がる形',['縦折りの転写','長い曲線'],'合わせ絵の広い形を羽に見立て、曲線で触角を足した例。'),
E('creature-island','島を歩く生き物','横長の体とぎざぎざの足',['みどり','むらさき','だいだい'],'体を左下、空きを右上に残す',['横折りの転写','ぎざぎざと点'],'写った形の向きを変え、ぎざぎざの足で歩く感じにした例。'),
E('creature-floating','ふわふわ浮く生き物','丸い体と渦巻く長い尾',['ももいろ','みずいろ','きいろ'],'小さい体を右上、長い尾を左へ伸ばす',['転写の一部を使う','渦巻きの線','点の模様'],'写った形を全部使わず、長い尾を足して空間を広げた例。')],},
{id:'autumn-leaves',title:'秋の葉っぱ',lessons:['C-10','C-11'],invitation:'葉のすじやはじく線を使い、葉の大きさや並びも選ぼう。',materials:['葉','薄めの紙','クレヨン','水彩絵の具','筆','水'],safety:['とがったものを紙の下に置かない','水をこぼしたらふく'],examples:[
E('autumn-leaves-path','道に並ぶ葉','大きさの違う葉脈',['だいだい','きいろ','ちゃいろ'],'左から右へ大小の葉をゆるく並べる',['葉のフロッタージュ','水彩の面'],'葉のすじをこすり出し、道のような並びを選んだ例。'),
E('autumn-leaves-one','一枚を大きく見る','大きい葉と残る白いすじ',['あか','むらさき','しろ'],'一枚を中央へ大きく、周りに空きを残す',['クレヨンの抵抗','水彩の重なり'],'大きく見た葉のすじをクレヨンで残し、水彩を重ねた例。'),
E('autumn-leaves-wind','風に重なる葉','回転した三枚と飛ぶ点',['きみどり','だいだい','あお'],'斜めに重なった葉、右上へ小さい点',['フロッタージュ','はじき絵','ななめの配置'],'葉の向きと重なりを変え、風で動く感じを試した例。')],},
{id:'sports-day',title:'動きのある運動会',lessons:['O-04','Z-09'],invitation:'関節や傾き、見せたい瞬間を選んで、自分の場面を表そう。',materials:['えんぴつ','色の画材','紙'],safety:['無理なポーズをしない','画材を口に入れない'],examples:[
E('sports-day-run','走り出す瞬間','傾いた走る人と斜めのレーン',['あか','あお','きいろ'],'人を左寄りに大きく、道を右へ伸ばす',['関節の骨組み','斜めの線','大きい主役'],'顔や手の細部を描かず、体と脚の傾きで動く感じを表した例。'),
E('sports-day-jump','跳ぶ瞬間','曲がった脚と高い空き',['むらさき','みどり','だいだい'],'人を中央上側、地面を下側へ離す',['骨組みから面','三角の形','余白'],'地面との空きや脚の曲がりで跳ぶ瞬間を表した例。'),
E('sports-day-group','みんなで動く場面','異なる姿勢の三人',['みずいろ','ももいろ','きみどり'],'人を三角に配置して重ねる',['姿勢の違い','重なり','三角の配置'],'人数や姿勢を変え、同じ比率の正解にせず集まる動きを表した例。')],},
];

const colors={あか:'#E8382F',きいろ:'#FFD93B',あお:'#1F5FBF',ももいろ:'#F58BB0',みずいろ:'#5EC3EA',しろ:'#FFFFFF',きみどり:'#A6D84A',むらさき:'#7B4BA8',だいだい:'#FF9A2E',みどり:'#2E9E4F',ちゃいろ:'#8A5A33'};
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const poly=(p,color)=>`<polygon points="${p}" fill="${color}"/>`;
const tree=(x,y,s,c)=>`<g transform="translate(${x} ${y}) scale(${s})"><rect x="-8" y="0" width="16" height="100" fill="#8A5A33"/>${poly('-70,25 0,-120 70,25',c)}${poly('-80,65 0,-85 80,65',c)}</g>`;
const star=(x,y,r,c)=>Array.from({length:14},(_,i)=>{const a=i*Math.PI/7;return`<path d="M ${x+Math.cos(a)*r*.22} ${y+Math.sin(a)*r*.22} L ${x+Math.cos(a)*r} ${y+Math.sin(a)*r}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;}).join('');
const leaf=(x,y,angle,s,c,white=false)=>`<g transform="translate(${x} ${y}) rotate(${angle}) scale(${s})"><path d="M0,-90 C95,-45 85,45 0,100 C-85,45 -95,-45 0,-90" fill="${c}"/><path d="M0,-75 L0,115 M0,-40 L50,-10 M0,-10 L-55,20 M0,25 L48,55 M0,55 L-35,78" fill="none" stroke="${white?'#FFFFFF':'#8A5A33'}" stroke-width="6" stroke-linecap="round"/></g>`;
const person=(x,y,angle,shirt,pose)=>`<g transform="translate(${x} ${y}) rotate(${angle})"><circle cx="0" cy="-75" r="19" fill="#F2C9A9" stroke="#4B5563" stroke-width="3"/><path d="M-13,-52 L-27,15 L25,15 L13,-52 Z" fill="${shirt}" stroke="#4B5563" stroke-width="3"/><path d="${pose==='jump'?'M-10,12 L-50,42 L-80,15 M12,12 L50,35 L75,5':'M-10,12 L-42,48 L-65,88 M12,12 L55,35 L80,6'}" fill="none" stroke="#4B5563" stroke-width="12" stroke-linecap="round"/><path d="M-20,-38 L-58,-15 L-72,-48 M20,-38 L58,-65 L77,-42" fill="none" stroke="#4B5563" stroke-width="10" stroke-linecap="round"/></g>`;
export function exampleSvg(example){
 const [c1,c2,c3]=example.colors.map(c=>colors[c]);let body='';const id=example.id;
 if(id.startsWith('fireworks-')){
  body='<rect width="800" height="500" fill="#232937"/>';
  if(id.endsWith('garden'))body+=star(220,170,125,c1)+star(560,130,100,c2)+star(520,345,95,c3)+star(130,390,50,c2)+star(735,310,55,c1);
  if(id.endsWith('river'))body+=star(450,130,105,c1)+Array.from({length:8},(_,i)=>`<path d="M100 ${320+i*19} Q270 ${300+i*19} 430 ${320+i*19} T730 ${320+i*19}" stroke="${i%2?c2:c3}" stroke-width="5" fill="none"/>`).join('');
  if(id.endsWith('path'))body+=`<path d="M260 200 C230 80 85 125 140 240 S370 325 320 175 C280 70 85 75 90 225" stroke="${c1}" stroke-width="7" fill="none"/>`+Array.from({length:20},(_,i)=>`<circle cx="${330+i*20}" cy="${220+i*10}" r="${4+i%4}" fill="${i%2?c2:c3}"/>`).join('');
 }else if(id.startsWith('night-sky-')){
  body='<rect width="800" height="500" fill="#233D72"/>';
  if(id.endsWith('cloud'))body+=Array.from({length:9},(_,i)=>`<ellipse cx="${150+i*65}" cy="${260+Math.sin(i)*35}" rx="130" ry="90" fill="${i%2?c1:c2}" opacity=".2"/>`).join('');
  if(id.endsWith('moon'))body+=`<circle cx="620" cy="125" r="58" fill="#FBF8F1"/>`+Array.from({length:6},(_,i)=>`<circle cx="${200+i*35}" cy="${330+i%2*35}" r="100" fill="${i%2?c1:c2}" opacity=".2"/>`).join('');
  if(id.endsWith('wind'))body+=Array.from({length:3},(_,i)=>`<path d="M-50 ${410-i*95} Q350 ${80-i*45} 850 ${190-i*70}" fill="none" stroke="${i%2?c1:c2}" stroke-width="75" opacity=".25"/>`).join('');
  body+=Array.from({length:id.endsWith('wind')?100:35},(_,i)=>`<circle cx="${(i*137+31)%780+10}" cy="${id.endsWith('wind')?250+(i*67)%230:(i*67)%250+10}" r="${1+i%3}" fill="${c3}" opacity=".85"/>`).join('');
 }else if(id.startsWith('forest-')){
  body='<rect width="800" height="500" fill="url(#sky)"/>';
  if(id.endsWith('river'))body+=`<path d="M400 220 Q600 350 310 500 L550 500 Q750 360 430 220" fill="#BFE3F2"/>`+tree(130,350,.5,c3)+tree(680,320,.55,c3)+tree(210,365,.9,c1)+tree(650,385,1,c1)+tree(80,340,1.8,c1)+tree(750,365,1.55,c1);
  if(id.endsWith('clearing'))body+=tree(540,350,.4,c2)+tree(655,345,.45,c2)+tree(165,320,1.9,c3)+`<ellipse cx="570" cy="440" rx="230" ry="55" fill="${c1}" opacity=".28"/>`;
  if(id.endsWith('hill'))body+=poly('0,500 800,250 800,500',c2)+tree(110,390,1.2,c1)+tree(340,345,1.05,c1)+tree(560,300,.85,c3)+tree(735,255,.65,c3);
 }else if(id.startsWith('creature-')){
  if(id.endsWith('wing'))body+=`<path d="M400 265 C190 70 50 200 165 350 C260 420 350 355 400 265 C450 355 540 420 635 350 C750 200 610 70 400 265" fill="${c1}" opacity=".8"/><ellipse cx="400" cy="280" rx="35" ry="105" fill="${c2}"/><path d="M380 200 Q320 100 285 130 M420 200 Q480 100 515 130" fill="none" stroke="#4B5563" stroke-width="6"/>`;
  if(id.endsWith('island'))body+=`<path d="M110 290 Q200 155 470 250 Q510 310 470 380 Q190 440 110 290" fill="${c1}"/><path d="M170 365 L160 435 L210 410 L215 460 M300 365 L310 440 L360 410 L375 465 M420 340 L440 400 L470 365 L500 420" fill="none" stroke="${c2}" stroke-width="9"/>`;
  if(id.endsWith('floating'))body+=`<ellipse cx="600" cy="170" rx="110" ry="90" fill="${c1}"/><path d="M505 180 C310 90 200 230 320 340 C380 380 410 300 320 280 C160 230 60 390 220 450" stroke="${c2}" stroke-width="16" fill="none"/>`;
  body+=Array.from({length:7},(_,i)=>`<circle cx="${id.endsWith('floating')?550+i*17:250+i*45}" cy="${id.endsWith('floating')?175:270+i%2*20}" r="8" fill="${c3}"/>`).join('');
 }else if(id.startsWith('autumn-leaves-')){
  if(id.endsWith('path'))body+=leaf(140,320,-20,.85,c1)+leaf(355,275,30,1.2,c2)+leaf(610,330,-35,1,c3);
  if(id.endsWith('one'))body+=`<rect width="800" height="500" fill="${c2}" opacity=".25"/>`+leaf(400,250,0,2.1,c1,true);
  if(id.endsWith('wind'))body+=leaf(210,345,-40,1.1,c1)+leaf(395,260,10,1.2,c2,true)+leaf(580,190,55,.85,c3)+Array.from({length:16},(_,i)=>`<circle cx="${650+i*7}" cy="${100+i%4*18}" r="3" fill="${c2}"/>`).join('');
 }else if(id.startsWith('sports-day-')){
  body='<rect y="365" width="800" height="135" fill="#DADBB5"/>';
  if(id.endsWith('run'))body+=`<path d="M0 430 L800 320 M0 480 L800 370" stroke="#FFFFFF" stroke-width="8"/>`+person(280,295,-22,c1,'run');
  if(id.endsWith('jump'))body+=person(400,245,-8,c1,'jump')+`<path d="M240 420 L560 420" stroke="${c2}" stroke-width="8"/>`;
  if(id.endsWith('group'))body+=person(380,255,15,c1,'jump')+person(205,340,-18,c2,'run')+person(595,340,-12,c3,'run');
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" role="img" aria-label="${esc(example.title)}"><title>${esc(example.title)}</title><desc>${esc(example.description)}</desc><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#BFE3F2"/><stop offset="1" stop-color="#FBF8F1"/></linearGradient></defs><rect width="800" height="500" fill="#FBF8F1"/>${body}</svg>\n`;
}
