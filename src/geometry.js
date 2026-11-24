export const I=[1,0,0,1,0,0];
export const point=(p,m=I)=>({x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5],z:p.z||0});
export const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
export const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
export function bounds(points){const b={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};for(const p of points){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;b.minX=Math.min(b.minX,p.x);b.minY=Math.min(b.minY,p.y);b.maxX=Math.max(b.maxX,p.x);b.maxY=Math.max(b.maxY,p.y);}return b;}
export const rect=(a,b)=>({minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minY:Math.min(a.y,b.y),maxY:Math.max(a.y,b.y)});
export const inside=(p,r)=>p.x>=r.minX&&p.x<=r.maxX&&p.y>=r.minY&&p.y<=r.maxY;
export const overlaps=(a,b)=>a.minX<=b.maxX&&a.maxX>=b.minX&&a.minY<=b.maxY&&a.maxY>=b.minY;
export const contains=(r,b)=>inside({x:b.minX,y:b.minY},r)&&inside({x:b.maxX,y:b.maxY},r);
export function clipSegment(a,b,r){let t0=0,t1=1;const dx=b.x-a.x,dy=b.y-a.y;for(const [p,q] of [[-dx,a.x-r.minX],[dx,r.maxX-a.x],[-dy,a.y-r.minY],[dy,r.maxY-a.y]]){if(p===0){if(q<0)return null;}else{const t=q/p;if(p<0)t0=Math.max(t0,t);else t1=Math.min(t1,t);if(t0>t1)return null;}}return [{x:a.x+t0*dx,y:a.y+t0*dy},{x:a.x+t1*dx,y:a.y+t1*dy}];}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return distance(p,{x:a.x+t*dx,y:a.y+t*dy});}
export function area(points){if(points.length<3)return 0;const o=points[0];let a=0;for(let i=1;i<points.length-1;i++)a+=(points[i].x-o.x)*(points[i+1].y-o.y)-(points[i+1].x-o.x)*(points[i].y-o.y);return Math.abs(a)/2;}
export function bulgeArc(a,b,bulge){const chord=distance(a,b);if(!bulge||!chord)return null;const h=chord*(1-bulge*bulge)/(4*bulge);const c={x:(a.x+b.x)/2-(b.y-a.y)/chord*h,y:(a.y+b.y)/2+(b.x-a.x)/chord*h};const start=Math.atan2(a.y-c.y,a.x-c.x),sweep=4*Math.atan(bulge);return {c,r:distance(c,a),start,sweep};}
export function arcPoints(c,rx,ry,start,sweep,rotation=0,n){n??=Math.max(12,Math.ceil(Math.abs(sweep)*32));const out=[];for(let i=0;i<=n;i++){const t=start+sweep*i/n,x=rx*Math.cos(t),y=ry*Math.sin(t);out.push({x:c.x+x*Math.cos(rotation)-y*Math.sin(rotation),y:c.y+x*Math.sin(rotation)+y*Math.cos(rotation)});}return out;}
export function translatedBounds(b,d){return {minX:b.minX+d.x,maxX:b.maxX+d.x,minY:b.minY+d.y,maxY:b.maxY+d.y};}
export function windowSelect(entities,primitives,r,crossing,visible){const hit=new Set();const groups=new Map();for(const p of primitives){if(!visible(p))continue;let g=groups.get(p.owner);if(!g)groups.set(p.owner,g=[]);g.push(p);}for(const e of entities){if(!e.editable||e.deleted)continue;const parts=groups.get(e.id);if(!parts?.length)continue;const d=e.offset||{x:0,y:0};const local={minX:r.minX-d.x,maxX:r.maxX-d.x,minY:r.minY-d.y,maxY:r.maxY-d.y};if(!crossing){if(parts.every(p=>contains(local,p.bounds)))hit.add(e.id);}else if(parts.some(p=>overlaps(p.bounds,local)&&(p.kind==='text'?overlaps(p.bounds,local):p.points.length===1?inside(p.points[0],local):p.points.some((q,i)=>i&&clipSegment(p.points[i-1],q,local)))))hit.add(e.id);}return hit;}
export class History {
 constructor(){this.undoStack=[];this.redoStack=[];}
 execute(action){action.redo();this.undoStack.push(action);this.redoStack=[];}
 undo(){const a=this.undoStack.pop();if(a){a.undo();this.redoStack.push(a);}return !!a;}
 redo(){const a=this.redoStack.pop();if(a){a.redo();this.undoStack.push(a);}return !!a;}
}
export function moveAction(entities,ids,dx,dy){const items=entities.filter(e=>ids.has(e.id));const prior=items.map(e=>({...e.offset}));return {redo(){items.forEach((e,i)=>e.offset={x:prior[i].x+dx,y:prior[i].y+dy});},undo(){items.forEach((e,i)=>e.offset={...prior[i]});}};}
export function rotationMatrix(center,degrees){const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [c,s,-s,c,center.x-c*center.x+s*center.y,center.y-s*center.x-c*center.y];}
export function transformPrimitive(p,m){const points=p.points.map(q=>point(q,m));return {...p,points,snaps:p.snaps.map(q=>({...point(q,m),kind:q.kind})),bounds:bounds(points),...(p.origin?{origin:point(p.origin,m),angle:p.angle+Math.atan2(m[1],m[0])}:{})};}
export function rotationAction(model,ids,center,degrees){const original=model.primitives,items=model.entities.filter(e=>ids.has(e.id)),prior=new Map(items.map(e=>[e.id,{matrix:e.matrix?[...e.matrix]:I,offset:{...e.offset}}])),r=rotationMatrix(center,degrees),matrices=new Map(items.map(e=>{const d=prior.get(e.id).offset;return [e.id,multiply(r,[1,0,0,1,d.x,d.y])];}));const rotated=original.map(p=>matrices.has(p.owner)?transformPrimitive(p,matrices.get(p.owner)):p);return {redo(){model.primitives=rotated;for(const e of items){e.matrix=multiply(matrices.get(e.id),prior.get(e.id).matrix);e.offset={x:0,y:0};}},undo(){model.primitives=original;for(const e of items){e.matrix=[...prior.get(e.id).matrix];e.offset={...prior.get(e.id).offset};}}};}
export function deleteAction(model,ids){const items=model.entities.filter(e=>ids.has(e.id)&&e.editable&&!e.deleted);return {label:`刪除 ${items.length} 個圖元`,count:items.length,redo(){for(const e of items)e.deleted=true;},undo(){for(const e of items)e.deleted=false;}};}
