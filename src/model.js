import DxfParser from 'dxf-parser';
import aci from 'dxf-parser/dist/AutoCadColorIndex.js';
import {I,point,multiply,bounds,bulgeArc,arcPoints} from './geometry.js';
export const ANNOTATION_LAYER='FIELD_ANNOTATIONS';
const COLORS=['#ffffff','#ff6066','#ffda68','#6be19b','#65dbea','#759eff','#d995ff','#e8edf5','#909cad','#c5cbd6'];
export function aciColor(i){return '#'+(aci[Math.abs(i||7)]??0xffffff).toString(16).padStart(6,'0');}
export function cleanText(t=''){return t.replace(/\\U\+([0-9a-f]{4})/gi,(_,s)=>String.fromCharCode(parseInt(s,16))).replace(/%%d/gi,'°').replace(/%%p/gi,'±').replace(/%%c/gi,'⌀').replace(/\\P/g,'\n').replace(/\\[fFhHwWcCaAqQtT][^;]*;/g,'').replace(/\\[LlOoKk]/g,'').replace(/[{}]/g,'');}
export function parseDrawing(text,options={}){const doc=new DxfParser().parseSync(text);if(!doc?.entities)throw Error('無法辨識 DXF 模型空間。');const model=buildModel(doc,text,options);const skipped=new Map();for(const m of text.matchAll(/(?:^|\n)\s*0\r?\n(HATCH|IMAGE|OLE2FRAME|WIPEOUT|3DSOLID|REGION|ACAD_PROXY_ENTITY|MULTILEADER)\r?\n/g))skipped.set(m[1],(skipped.get(m[1])||0)+1);for(const [type,count] of skipped)model.warnings.push({message:type+' 未顯示（原始 DXF 資料另存保留）',count});return model;}
export function buildModel(doc,raw='',{retainSource=true}={}) {
 const layers=Object.values(doc.tables?.layer?.layers||{}).map(l=>({name:l.name,visible:l.visible!==false&&!l.frozen,locked:!!l.locked,color:aciColor(l.colorIndex),count:0}));
 if(!layers.some(l=>l.name==='0'))layers.unshift({name:'0',visible:true,color:aciColor(7),count:0});
 const layerMap=new Map(layers.map(l=>[l.name,l]));
 const entities=[],primitives=[],warnings=new Map();let serial=0;
 const warn=(s)=>warnings.set(s,(warnings.get(s)||0)+1);
 function emit(e,owner,m,inherited,chain=[],depth=0){
  if(depth>20){warn('圖塊巢狀超過 20 層');return;}
  if(e.inPaperSpace||e.visible===false)return;
  const layer=e.layer==='0'&&inherited?inherited:e.layer||'0';
  if(!layerMap.has(layer)){const l={name:layer,visible:true,color:aciColor(7),count:0};layers.push(l);layerMap.set(layer,l);}
  const extrusion=e.extrusionDirection;
  let mat=m;
  if(extrusion&&(extrusion.x||extrusion.y)){warn('傾斜 OCS 圖元暫不顯示');return;}
  if(extrusion?.z===-1&&e.type!=='LINE')mat=multiply(m,[-1,0,0,1,0,0]);
  const color=e.colorIndex&&e.colorIndex!==256?(Number.isFinite(e.color)?'#'+e.color.toString(16).padStart(6,'0'):aciColor(e.colorIndex)):layerMap.get(layer).color;
  function add(points,snaps=[],kind='path',extra={}){points=points.map(p=>point(p,mat));if(!points.length||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return;const p={owner,layer,chain,color,kind,points,snaps:snaps.map(s=>({...point(s,mat),kind:s.kind})),...extra};p.bounds=bounds(points);primitives.push(p);layerMap.get(layer).count++;}
  const end=p=>({...p,kind:'端點'}),mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:((a.z||0)+(b.z||0))/2,kind:'中點'});
  if(e.type==='INSERT'||e.type==='DIMENSION'){
   const b=doc.blocks?.[e.type==='DIMENSION'?e.block:e.name];if(!b){warn('缺少圖塊或外部參照：'+(e.name||e.block));return;}
   if(chain.includes('block:'+b.name)){warn('循環圖塊');return;}
   let trans=I;
   if(e.type==='INSERT'){const r=(e.rotation||0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r),sx=e.xScale??1,sy=e.yScale??1,bp=b.position||{x:0,y:0},pos=e.position||{x:0,y:0};trans=[c*sx,s*sx,-s*sy,c*sy,pos.x-c*sx*bp.x+s*sy*bp.y,pos.y-s*sx*bp.x-c*sy*bp.y];}
   for(let row=0;row<Math.min(e.rowCount||1,100);row++)for(let col=0;col<Math.min(e.columnCount||1,100);col++){
    const t=[...trans];t[4]+=trans[0]*col*(e.columnSpacing||0)+trans[2]*row*(e.rowSpacing||0);t[5]+=trans[1]*col*(e.columnSpacing||0)+trans[3]*row*(e.rowSpacing||0);
    for(const sub of b.entities||[])emit(sub,owner,multiply(mat,t),layer,[...chain,layer,'block:'+b.name],depth+1);
   }return;
  }
  if(e.type==='LINE'||e.type==='LWPOLYLINE'||e.type==='POLYLINE'){
   if(e.is3dPolygonMesh||e.isPolyfaceMesh){warn('網格圖元暫不顯示');return;}
   const v=e.vertices||[];let pts=[],snaps=[];if(v.length===1)pts=[v[0]];
   for(let i=0;i<v.length-(e.shape?0:1);i++){const a=v[i],b=v[(i+1)%v.length],arc=bulgeArc(a,b,a.bulge||0);snaps.push(end(a),end(b));if(arc){const ap=arcPoints(arc.c,arc.r,arc.r,arc.start,arc.sweep);pts.push(...(i?ap.slice(1):ap));const a2=arc.start+arc.sweep/2;snaps.push({x:arc.c.x+arc.r*Math.cos(a2),y:arc.c.y+arc.r*Math.sin(a2),kind:'中點'},{...arc.c,kind:'圓心'});}else{if(!pts.length)pts.push(a);pts.push(b);snaps.push(mid(a,b));}}
   add(pts,snaps);return;
  }
  if(e.type==='CIRCLE'||e.type==='ARC'){
   const c=e.center,r=e.radius;if(!c||!Number.isFinite(r))return;const start=e.startAngle||0;let sweep=e.type==='CIRCLE'?Math.PI*2:(e.endAngle-start);while(sweep<=0)sweep+=Math.PI*2;const pts=arcPoints(c,r,r,start,sweep);const snaps=[{...c,kind:'圓心'}];if(e.type==='ARC')snaps.push(end(pts[0]),end(pts.at(-1)),{x:c.x+r*Math.cos(start+sweep/2),y:c.y+r*Math.sin(start+sweep/2),kind:'中點'});add(pts,snaps);return;
  }
  if(e.type==='ELLIPSE'){const a=e.majorAxisEndPoint,r=Math.hypot(a.x,a.y),angle=Math.atan2(a.y,a.x);add(arcPoints(e.center,r,r*e.axisRatio,e.startAngle||0,(e.endAngle??Math.PI*2)-(e.startAngle||0),angle),[{...e.center,kind:'圓心'}]);return;}
  if(e.type==='POINT'){add([e.position],[end(e.position)],'point');return;}
  if(['SOLID','3DFACE'].includes(e.type)){const p=e.points||e.vertices||[];add([...p,p[0]],p.map(end));return;}
  if(e.type==='TEXT'||e.type==='MTEXT'||e.type==='ATTRIB'||e.type==='ATTDEF'){
   const p=e.startPoint||e.position;if(!p)return;const h=e.textHeight||e.height||1,text=cleanText(e.text||''),r=e.type==='MTEXT'?(e.directionVector?Math.atan2(e.directionVector.y,e.directionVector.x):(e.rotation||0)):(e.rotation||0)*Math.PI/180;
   const angle=Math.atan2(mat[1],mat[0])+r,height=h*Math.hypot(mat[2],mat[3]),origin=point(p,mat),width=Math.max(...text.split('\n').map(s=>s.length),1)*h*.65;
   const c=Math.cos(r),s=Math.sin(r),corners=[[0,-h*.3],[width,-h*.3],[width,h*1.1],[0,h*1.1]].map(([x,y])=>({x:p.x+x*c-y*s,y:p.y+x*s+y*c}));
   add(corners,[end(p)],'text',{text,origin,height,angle,attachment:e.attachmentPoint||0});return;
  }
  warn(e.type+' 暫不顯示（另存保留原始 DXF 資料）');
 }
 for(const e of doc.entities){if(e.inPaperSpace)continue;const id=e.handle||'E'+(++serial),entity={id,type:e.type,layer:e.layer||'0',offset:{x:0,y:0},editable:!layerMap.get(e.layer)?.locked,...(retainSource?{source:e}:{})};const before=primitives.length;emit(e,id,I,null);if(primitives.length===before)entity.editable=false;entities.push(entity);}
 const counts=new Map();for(const p of primitives)counts.set(p.owner,(counts.get(p.owner)||0)+1);
 const unit=doc.header?.$INSUNITS||0;
 return {entities,primitives,layers,warnings:[...warnings].map(([message,count])=>({message,count})),raw,unit,version:doc.header?.$ACADVER||'DXF',primitiveCount:primitives.length,header:doc.header};
}
export function makeAnnotation(type,points,text,height,id){
 const e={id,type,layer:ANNOTATION_LAYER,offset:{x:0,y:0},editable:true,annotation:true,points:points.map(p=>({...p})),text,height};
 return e;
}
export function annotationPrimitives(e){
 const p=e.points,h=e.height||1,c='#ff9a62',base={owner:e.id,layer:ANNOTATION_LAYER,chain:[],color:c,snaps:[]};
 const path=points=>({...base,kind:'path',points,bounds:bounds(points)});
 const label=(origin,text,angle=0)=>({...base,kind:'text',origin,text,height:h,angle,points:[origin,{x:origin.x+h*.65*text.length,y:origin.y+h}],bounds:bounds([origin,{x:origin.x+h*.65*text.length,y:origin.y+h}])});
 if(e.type==='TEXT')return [label(p[0],e.text)];
 const [a,b]=p,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
 const arrow=(tip,dir)=>path([{x:tip.x+dir*ux*h-uy*h*.35,y:tip.y+dir*uy*h+ux*h*.35},tip,{x:tip.x+dir*ux*h+uy*h*.35,y:tip.y+dir*uy*h-ux*h*.35}]);
 if(e.type==='ARROW')return [path([a,b]),arrow(a,1)];
 const off=p[2]?((p[2].x-a.x)*-uy+(p[2].y-a.y)*ux):h*3,a2={x:a.x-uy*off,y:a.y+ux*off},b2={x:b.x-uy*off,y:b.y+ux*off};
 const dimArrow=(tip,dir)=>path([{x:tip.x+dir*ux*h-uy*h*.35,y:tip.y+dir*uy*h+ux*h*.35},tip,{x:tip.x+dir*ux*h+uy*h*.35,y:tip.y+dir*uy*h-ux*h*.35}]);
 return [path([a,a2]),path([b,b2]),path([a2,b2]),dimArrow(a2,1),dimArrow(b2,-1),label({x:(a2.x+b2.x)/2-uy*h*.5,y:(a2.y+b2.y)/2+ux*h*.5},e.text||len.toFixed(3),Math.atan2(dy,dx))];
}
