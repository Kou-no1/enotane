import type { SceneObject, GridState } from './snapshots';
import { COLORS } from './textures';
import { drawToolOverlay } from './tools';
import { TOOLS } from './schema';

/** Original diagram motifs made from ordinary Canvas shapes; no glove or hand assets. */
export function drawScene(ctx:CanvasRenderingContext2D,objects:SceneObject[],front:boolean):void {
  for(const o of [...objects].sort((a,b)=>a.z-b.z)){
    if((o.z>=0)!==front)continue;ctx.save();ctx.translate(...o.at);ctx.rotate(o.rotation*Math.PI/180);ctx.scale(o.scale,o.scale);ctx.globalAlpha=o.opacity;ctx.strokeStyle='#4B5563';ctx.lineWidth=3;ctx.lineJoin='round';ctx.lineCap='round';ctx.fillStyle=o.color?COLORS[o.color]:'#B8DAB5';
    if(o.light){const dx=o.at[0]-o.light[0],dy=o.at[1]-o.light[1],len=Math.max(1,Math.hypot(dx,dy));ctx.save();ctx.translate(dx/len*45,dy/len*35+48);ctx.fillStyle='rgba(45,49,55,.17)';ctx.beginPath();ctx.ellipse(0,0,72,20,0,0,Math.PI*2);ctx.fill();ctx.restore();}
    const s=o.sprite;
    const ellipse=(x:number,y:number,rx:number,ry=rx)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();};
    const polygon=(points:number[][])=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke();};
    const rect=(x:number,y:number,w:number,h:number,r=8)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke();};
    if((TOOLS as readonly string[]).includes(s)){drawToolOverlay(ctx,{tip:[-65,35],tool:s as typeof TOOLS[number],color:o.color?COLORS[o.color]:'#3978C5',lift:0});}
    else if(s==='circle'||s==='ellipse')ellipse(0,0,70,s==='ellipse'?46:70);
    else if(s==='square'||s==='rectangle'||s==='rect')rect(-70,-50,140,100,4);
    else if(s==='triangle'||s==='mountain'){polygon([[-95,60],[0,-75],[95,60]]);if(s==='mountain'){ctx.fillStyle='#FAF8F0';polygon([[-28,-32],[0,-75],[28,-32],[10,-40],[0,-24],[-10,-40]]);}}
    else if(s==='apple'){ctx.fillStyle=o.color?COLORS[o.color]:COLORS.aka;ellipse(-25,0,48,58);ellipse(25,0,48,58);ctx.strokeStyle='#6B4C35';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(0,-53);ctx.lineTo(8,-83);ctx.stroke();ctx.fillStyle=COLORS.midori;ctx.beginPath();ctx.ellipse(29,-72,23,10,-.4,0,Math.PI*2);ctx.fill();}
    else if(s==='tree'){ctx.fillStyle='#966744';rect(-12,-8,24,94,3);ctx.fillStyle=o.color?COLORS[o.color]:'#5DAB6C';ellipse(-37,-34,42);ellipse(36,-32,43);ellipse(0,-65,52);}
    else if(s==='leaf'){ctx.beginPath();ctx.ellipse(0,0,45,77,.45,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#56744E';ctx.beginPath();ctx.moveTo(-28,63);ctx.lineTo(28,-63);ctx.stroke();}
    else if(s==='house'){ctx.fillStyle=o.color?COLORS[o.color]:'#F2D7A1';rect(-65,-5,130,95,2);ctx.fillStyle='#CA785E';polygon([[-88,-5],[0,-78],[88,-5]]);ctx.fillStyle='#DFF0F5';rect(-46,18,32,33,2);ctx.fillStyle='#9F7858';rect(19,35,28,55,2);}
    else if(s==='flower'){ctx.fillStyle=o.color?COLORS[o.color]:COLORS.momo;for(let i=0;i<6;i++)ellipse(Math.cos(i*Math.PI/3)*34,Math.sin(i*Math.PI/3)*34,23);ctx.fillStyle=COLORS.kiiro;ellipse(0,0,19);}
    else if(s==='cloud'){ctx.fillStyle=o.color?COLORS[o.color]:'#FFFFFF';ellipse(-47,13,39,27);ellipse(0,-8,47,36);ellipse(46,15,40,27);}
    else if(s==='sun'){ctx.fillStyle=o.color?COLORS[o.color]:COLORS.kiiro;ellipse(0,0,47);for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(Math.cos(a)*58,Math.sin(a)*58);ctx.lineTo(Math.cos(a)*79,Math.sin(a)*79);ctx.stroke();}}
    else if(s==='person'){ctx.fillStyle=o.color?COLORS[o.color]:'#F0C9A4';ellipse(0,-67,22);ctx.strokeStyle='#546C86';ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(0,-40);ctx.lineTo(0,25);ctx.moveTo(-47,-4);ctx.lineTo(0,-28);ctx.lineTo(44,8);ctx.moveTo(-35,80);ctx.lineTo(0,25);ctx.lineTo(40,78);ctx.stroke();}
    else if(s==='face'){ctx.fillStyle=o.color?COLORS[o.color]:'#F0D3B1';ellipse(0,0,53,66);ctx.fillStyle='#4B5563';ellipse(-19,-10,3);ellipse(19,-10,3);ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(-4,18);ctx.lineTo(5,18);ctx.stroke();ctx.beginPath();ctx.moveTo(-17,34);ctx.quadraticCurveTo(0,42,17,34);ctx.stroke();}
    else if(s==='dog'){ctx.fillStyle=o.color?COLORS[o.color]:'#DAB685';ellipse(-20,5,68,35);ellipse(51,-27,34);ctx.fillStyle='#9B7451';polygon([[36,-49],[10,-64],[18,-21]]);ctx.fillStyle='#4B5563';ellipse(62,-31,3);ellipse(83,-20,5);ctx.strokeStyle='#A88760';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(-59,24);ctx.lineTo(-64,67);ctx.moveTo(21,28);ctx.lineTo(29,67);ctx.moveTo(-80,-5);ctx.lineTo(-105,-38);ctx.stroke();}
    else if(s==='palette'){ctx.fillStyle='#F5E7CB';ellipse(0,0,93,62);const colors=['aka','kiiro','ao','midori','shiro'] as const;colors.forEach((color,i)=>{ctx.fillStyle=COLORS[color];ellipse(-65+i*31,-16+(i%2)*35,12);});}
    else if(s==='water-cup'||s==='tray'){ctx.fillStyle=o.color?COLORS[o.color]:'#DBEAF1';rect(-65,-45,130,90,16);ctx.beginPath();ctx.moveTo(-22,-45);ctx.lineTo(-22,45);ctx.moveTo(22,-45);ctx.lineTo(22,45);ctx.stroke();}
    else if(s==='paper'){ctx.fillStyle='#FBF8F1';rect(-100,-63,200,126,0);}
    else if(s==='cloth'){ctx.fillStyle=o.color?COLORS[o.color]:'#D1D5DB';rect(-70,-40,140,80,4);ctx.strokeStyle='#9CA3AF';for(let y=-28;y<40;y+=13){ctx.beginPath();ctx.moveTo(-65,y);ctx.lineTo(65,y);ctx.stroke();}}
    else if(s==='tube'||s==='paint-tube'){ctx.fillStyle=o.color?COLORS[o.color]:COLORS.aka;rect(-25,-55,50,100,4);ctx.fillStyle='#D1D5DB';rect(-18,45,36,16,2);ctx.fillStyle='#FAFAFA';rect(-20,-10,40,23,2);}
    else if(s==='net'){ctx.fillStyle='#DFE7EC';rect(-60,-40,120,80,3);ctx.strokeStyle='#8A969E';ctx.lineWidth=1;for(let x=-50;x<60;x+=10){ctx.beginPath();ctx.moveTo(x,-40);ctx.lineTo(x,40);ctx.stroke();}for(let y=-30;y<40;y+=10){ctx.beginPath();ctx.moveTo(-60,y);ctx.lineTo(60,y);ctx.stroke();}}
    else if(s==='brush'){drawToolOverlay(ctx,{tip:[-65,45],tool:'brush-round',color:o.color?COLORS[o.color]:COLORS.aka,lift:0});}
    else if(s==='straw'){ctx.strokeStyle='#DBA983';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-70,40);ctx.lineTo(70,-40);ctx.stroke();}
    ctx.restore();
  }
}

export function drawGrid(ctx:CanvasRenderingContext2D,grid?:GridState):void {
  if(!grid)return;ctx.save();ctx.strokeStyle='rgba(75,85,99,.55)';ctx.lineWidth=2;ctx.setLineDash([9,7]);ctx.beginPath();
  if(grid.kind==='thirds'){for(const x of [1000/3,2000/3]){ctx.moveTo(x,0);ctx.lineTo(x,625);}for(const y of [625/3,1250/3]){ctx.moveTo(0,y);ctx.lineTo(1000,y);}}
  else if(grid.kind==='center'){ctx.moveTo(500,0);ctx.lineTo(500,625);ctx.moveTo(0,312.5);ctx.lineTo(1000,312.5);}
  else {const [vx,vy]=grid.vanishing??[500,240];ctx.moveTo(0,vy);ctx.lineTo(1000,vy);for(const [x,y] of [[0,0],[1000,0],[0,625],[1000,625],[200,625],[800,625]]){ctx.moveTo(vx,vy);ctx.lineTo(x,y);}}
  ctx.stroke();ctx.restore();
}
