export function fitCamera(b,w,h){
 if(!Number.isFinite(b.minX)||!Number.isFinite(b.minY)||!Number.isFinite(b.maxX)||!Number.isFinite(b.maxY))return null;
 return {cx:b.minX+(b.maxX-b.minX)/2,cy:b.minY+(b.maxY-b.minY)/2,scale:Math.max(1e-10,Math.min(Math.max(w-80,40)/Math.max(b.maxX-b.minX,1),Math.max(h-160,40)/Math.max(b.maxY-b.minY,1)))};
}
// Only change the camera: every object remains selectable and exportable.
export function primaryBounds(boxes){
 const union=bs=>bs.reduce((b,p)=>({minX:Math.min(b.minX,p.minX),minY:Math.min(b.minY,p.minY),maxX:Math.max(b.maxX,p.maxX),maxY:Math.max(b.maxY,p.maxY)}),{minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity});
 let kept=boxes;
 for(const axis of ['X','Y']){
  if(kept.length<10)break;
  const center=b=>(b['min'+axis]+b['max'+axis])/2,sorted=[...kept].sort((a,b)=>center(a)-center(b));
  let index=0,gap=0;for(let i=1;i<sorted.length;i++){const d=center(sorted[i])-center(sorted[i-1]);if(d>gap){gap=d;index=i;}}
  const side=index>=sorted.length/2?sorted.slice(0,index):sorted.slice(index),b=union(side);
  if(side.length>=boxes.length*.8&&side.length>=6&&gap>8*Math.max(b['max'+axis]-b['min'+axis],1))kept=side;
 }
 return {bounds:union(kept),outside:boxes.length-kept.length};
}
export class MiddleDoubleClick {
 constructor(){this.last=null;}
 click(time,p,moved){if(moved){this.last=null;return false;}const hit=this.last&&time-this.last.time<=400&&time>=this.last.time&&Math.hypot(p.x-this.last.x,p.y-this.last.y)<=6;this.last=hit?null:{time,...p};return !!hit;}
}
