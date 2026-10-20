import type { Path, Point, Region, RegionShape, Script, Pressure } from './types';

export interface Bounds { x: number; y: number; w: number; h: number }
export interface Sample { x: number; y: number; angle: number; p: number; move: boolean }
export function resolveRegion(region: Region, script: Script): RegionShape {
  if ('ref' in region) { const result = script.regions[region.ref]; if (!result) throw new Error(`未知の領域: ${region.ref}`); return result; }
  return region;
}
export function regionBounds(r: RegionShape): Bounds {
  if (r.shape === 'rect') return { x:r.x, y:r.y, w:r.w, h:r.h };
  if (r.shape === 'circle') return { x:r.cx-r.r, y:r.cy-r.r, w:r.r*2, h:r.r*2 };
  if (r.shape === 'ellipse') return { x:r.cx-r.rx, y:r.cy-r.ry, w:r.rx*2, h:r.ry*2 };
  const xs=r.points.map(p=>p[0]), ys=r.points.map(p=>p[1]);
  return { x:Math.min(...xs), y:Math.min(...ys), w:Math.max(...xs)-Math.min(...xs), h:Math.max(...ys)-Math.min(...ys) };
}
export function regionPath(r: RegionShape): Path2D {
  const p=new Path2D();
  if(r.shape==='rect') p.rect(r.x,r.y,r.w,r.h);
  else if(r.shape==='circle') p.arc(r.cx,r.cy,r.r,0,Math.PI*2);
  else if(r.shape==='ellipse') p.ellipse(r.cx,r.cy,r.rx,r.ry,0,0,Math.PI*2);
  else { r.points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y)); p.closePath(); }
  return p;
}
export function pointInRegion(r:RegionShape,x:number,y:number):boolean {
  if(r.shape==='rect')return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;
  if(r.shape==='circle')return (x-r.cx)**2+(y-r.cy)**2<=r.r*r.r;
  if(r.shape==='ellipse')return ((x-r.cx)/r.rx)**2+((y-r.cy)/r.ry)**2<=1;
  let inside=false;for(let i=0,j=r.points.length-1;i<r.points.length;j=i++){const [xi,yi]=r.points[i],[xj,yj]=r.points[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;
}
const dist=(a:Point,b:Point)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const mid=(a:Point,b:Point):Point=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
function deviation(p:Point,a:Point,b:Point):number { const d=dist(a,b);return d?Math.abs((b[0]-a[0])*(a[1]-p[1])-(a[0]-p[0])*(b[1]-a[1]))/d:dist(a,p); }
function cubic(a:Point,b:Point,c:Point,d:Point,out:Point[],depth=0):void {
  if(depth>12||Math.max(deviation(b,a,d),deviation(c,a,d))<0.5){out.push(d);return;}
  const ab=mid(a,b),bc=mid(b,c),cd=mid(c,d),abc=mid(ab,bc),bcd=mid(bc,cd),m=mid(abc,bcd);
  cubic(a,ab,abc,m,out,depth+1);cubic(m,bcd,cd,d,out,depth+1);
}
function svgPaths(d:string):Point[][] {
  const tokens=d.match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)||[];
  let i=0,command='',current:Point=[0,0],start:Point=[0,0],out:Point[][]=[],line:Point[]=[];
  const pair=():Point=>{const p:Point=[Number(tokens[i++]),Number(tokens[i++])];if(!p.every(Number.isFinite))throw new Error('SVGパスの座標が不正です');return p;};
  while(i<tokens.length){
    if(/^[A-Za-z]$/.test(tokens[i])) command=tokens[i++];
    if(!['M','L','C','Q','Z'].includes(command))throw new Error(`未対応のSVGパス命令: ${command}`);
    if(command==='Z'){line.push([...start]);current=[...start];command='';continue;}
    if(command==='M'){if(line.length)out.push(line);current=pair();start=[...current];line=[current];command='L';}
    else if(command==='L'){current=pair();line.push(current);}
    else if(command==='C'){const b=pair(),c=pair(),end=pair();cubic(current,b,c,end,line);current=end;}
    else {const b=pair(),end=pair();const c1:Point=[current[0]+2/3*(b[0]-current[0]),current[1]+2/3*(b[1]-current[1])];const c2:Point=[end[0]+2/3*(b[0]-end[0]),end[1]+2/3*(b[1]-end[1])];cubic(current,c1,c2,end,line);current=end;}
  }
  if(line.length)out.push(line);return out;
}
export function pathLines(path:Path):Point[][] {
  if('points'in path)return [path.points];if('subpaths'in path)return path.subpaths;if('d'in path)return svgPaths(path.d);
  if(path.gen==='rectangle')return [[[path.x,path.y],[path.x+path.w,path.y],[path.x+path.w,path.y+path.h],[path.x,path.y+path.h],[path.x,path.y]]];
  if(path.gen==='leaf')return [Array.from({length:161},(_,i)=>{const angle=i/160*Math.PI*2;return [path.cx+Math.sin(angle)*Math.abs(Math.sin(angle))*path.rx,path.cy+Math.cos(angle)*path.ry] as Point;})];
  if(path.gen==='line')return [[[path.x1,path.y1],[path.x2,path.y2]]];
  if(path.gen==='dots')return Array.from({length:path.count},(_,i)=>[[path.x+path.w*i/Math.max(1,path.count-1),path.y] as Point]);
  if(path.gen==='burst')return Array.from({length:path.rays},(_,i)=>[[path.cx,path.cy],[path.cx+Math.cos(i/path.rays*Math.PI*2)*path.r,path.cy+Math.sin(i/path.rays*Math.PI*2)*path.r]] as Point[]);
  if(path.gen==='zigzag'){const n=Math.max(2,Math.round(path.cycles*2));return [Array.from({length:n+1},(_,i)=>[path.x+path.w*i/n,path.y+(i===0||i===n?0:(i%2?-path.amplitude:path.amplitude))] as Point)];}
  const n=path.gen==='spiral'?Math.max(64,Math.ceil(path.turns*80)):path.gen==='ellipse'?160:Math.max(80,Math.ceil(path.cycles*60));
  return [Array.from({length:n+1},(_,i)=>{const p=i/n;
    if(path.gen==='wave')return [path.x+path.w*p,path.y+Math.sin(p*path.cycles*Math.PI*2)*path.amplitude] as Point;
    if(path.gen==='spiral')return [path.cx+Math.cos(p*path.turns*Math.PI*2)*path.r*p,path.cy+Math.sin(p*path.turns*Math.PI*2)*path.r*p] as Point;
    return [path.cx+Math.cos(p*Math.PI*2)*path.rx,path.cy+Math.sin(p*Math.PI*2)*path.ry] as Point;
  })];
}
/** Equal arc-length stamps, with disconnected subpaths kept disconnected. */
export function sampleLines(lines:Point[][],spacing=2):Sample[]{
  const lengths=lines.map(line=>Math.max(1,line.slice(1).reduce((sum,p,i)=>sum+dist(line[i],p),0))),total=lengths.reduce((s,l)=>s+l,0);
  const out:Sample[]=[];let prefix=0;
  lines.forEach((line,k)=>{
    if(line.length===1){out.push({x:line[0][0],y:line[0][1],angle:0,p:prefix/total,move:true});prefix+=lengths[k];return;}
    const cumulative=[0];for(let i=1;i<line.length;i++)cumulative.push(cumulative[i-1]+dist(line[i-1],line[i]));
    const length=cumulative[cumulative.length-1],n=Math.max(1,Math.ceil(length/spacing));let segment=1;
    for(let j=0;j<=n;j++){const at=length*j/n;while(segment<cumulative.length-1&&cumulative[segment]<at)segment++;
      const a=line[segment-1],b=line[segment],f=(at-cumulative[segment-1])/Math.max(0.0001,cumulative[segment]-cumulative[segment-1]);
      out.push({x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),p:(prefix+at)/total,move:j===0});
    }prefix+=lengths[k];
  });return out;
}
export function sampleAt(samples:Sample[],p:number):Point {
  if(!samples.length)return [500,310];let lo=0,hi=samples.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(samples[m].p<=p)lo=m;else hi=m-1;}
  const a=samples[lo],b=samples[Math.min(lo+1,samples.length-1)];if(b.move||b.p===a.p)return [a.x,a.y];const f=Math.max(0,Math.min(1,(p-a.p)/(b.p-a.p)));return [a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f];
}
export function pressureAt(curve:Pressure|undefined,p:number):number {
  if(curve===undefined)return 0.6;if(typeof curve==='number')return curve;
  for(let i=1;i<curve.length;i++)if(p<=curve[i][0]){const a=curve[i-1],b=curve[i];return a[1]+(b[1]-a[1])*(p-a[0])/(b[0]-a[0]);}return curve[curve.length-1][1];
}
export function sweepLines(region:RegionShape,rowHeight=45):Point[][] {
  const b=regionBounds(region),rows=Math.max(1,Math.ceil(b.h/rowHeight)),out:Point[][]=[];
  for(let i=0;i<rows;i++){const y=b.y+(i+.5)*b.h/rows;out.push(i%2?[[b.x+b.w,y],[b.x,y]]:[[b.x,y],[b.x+b.w,y]]);}return out;
}
