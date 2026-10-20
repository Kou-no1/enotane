import type { PaintColor } from './types';
import { COLORS } from './textures';

/** Pigment approximation in optical-density space; water is dilution, never a pigment. */
export function mixPaint(colors:PaintColor[],amounts:number[]):string {
  if(!colors.length||colors.length!==amounts.length||amounts.some(v=>!Number.isFinite(v)||v<0))throw new Error('色と量を同じ数で指定してください');
  const total=amounts.reduce((sum,n)=>sum+n,0);if(total<=0||!Number.isFinite(total))throw new Error('色の量の合計は0より大きい有限値にしてください');
  const channels=[0,0,0];
  colors.forEach((color,i)=>{const hex=COLORS[color];if(!hex)throw new Error('未知の色です');for(let c=0;c<3;c++){const reflectance=parseInt(hex.slice(1+c*2,3+c*2),16)/255;channels[c]+=Math.log(Math.max(.025,reflectance))*amounts[i]/total;}});
  return '#'+channels.map(n=>Math.round(Math.exp(n)*255).toString(16).padStart(2,'0')).join('').toUpperCase();
}
