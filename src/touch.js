export const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
export function pinchCamera(camera,size,a,b,nextA,nextB){
 const first=midpoint(a,b),next=midpoint(nextA,nextB),initial=gap(a,b);if(initial<1)return {...camera};
 const anchor={x:camera.cx+(first.x-size.w/2)/camera.scale,y:camera.cy-(first.y-size.h/2)/camera.scale};
 const scale=Math.max(1e-10,Math.min(1e10,camera.scale*gap(nextA,nextB)/initial));
 return {scale,cx:anchor.x-(next.x-size.w/2)/scale,cy:anchor.y+(next.y-size.h/2)/scale};
}
export function installTouch(view,canvas,api){
 const contacts=new Map();let start=null,pinch=null,suppress=false;
 const local=e=>{const r=view.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 function accept(e){if(e.pointerType!=='touch'&&!(api.mouse&&e.pointerType==='mouse'&&e.button<=0))return false;if(e.type==='pointerdown'&&e.target!==canvas&&e.target!==view)return false;if(e.type!=='pointerdown'&&!contacts.has(e.pointerId))return false;e.preventDefault();e.stopImmediatePropagation();return true;}
 function down(e){if(!accept(e))return;view.focus();const p=local(e);contacts.set(e.pointerId,p);view.setPointerCapture(e.pointerId);
  if(contacts.size>=2){const [a,b]=contacts.values();pinch={camera:{...api.camera()},a:{...a},b:{...b}};suppress=true;api.clearBox();return;}
  suppress=false;const kind=api.kind();start={p,camera:{...api.camera()},kind};if(kind==='box')api.box(p,p);else if(kind==='aim')api.aim({x:p.x,y:Math.max(8,p.y-56)});
 }
 function move(e){if(!accept(e))return;const p=local(e);contacts.set(e.pointerId,p);
  if(contacts.size>=2&&pinch){const [a,b]=contacts.values();api.setCamera(pinchCamera(pinch.camera,api.size(),pinch.a,pinch.b,a,b));return;}
  if(suppress||!start)return;
  if(start.kind==='pan')api.setCamera({...start.camera,cx:start.camera.cx-(p.x-start.p.x)/start.camera.scale,cy:start.camera.cy+(p.y-start.p.y)/start.camera.scale});
  else if(start.kind==='box')api.box(start.p,p);else api.aim({x:p.x,y:Math.max(8,p.y-56)});
 }
 function up(e){if(!accept(e))return;const p=local(e);contacts.delete(e.pointerId);const cancelled=e.type==='pointercancel';
  if(cancelled||suppress){api.clearBox();if(!contacts.size){suppress=false;pinch=null;start=null;}return;}
  if(start?.kind==='box'){api.clearBox();gap(start.p,p)>6?api.finishBox(start.p,p):api.pick(p);}
  start=null;pinch=null;
 }
 const listeners=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up]];
 for(const [name,fn] of listeners)view.addEventListener(name,fn,{capture:true,passive:false});
 return ()=>{contacts.clear();start=null;pinch=null;suppress=false;api.clearBox();};
}
