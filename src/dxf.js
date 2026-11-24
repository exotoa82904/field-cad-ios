import {CALIBRATION_DXF} from './calibration.js';
import {ANNOTATION_LAYER, annotationPrimitives} from './model.js';
import {I,point,multiply} from './geometry.js';
export const pairs=text=>{const lines=text.replace(/\r/g,'').split('\n');const out=[];for(let i=0;i+1<lines.length;i+=2)out.push([Number(lines[i].trim()),lines[i+1]]);return out;};
export const stringify=p=>p.map(([c,v])=>c+'\n'+v+'\n').join('');
export function records(p){const out=[];let rec=[];for(const v of p){if(v[0]===0&&rec.length){out.push(rec);rec=[];}rec.push(v);}if(rec.length)out.push(rec);return out;}
const get=(r,c)=>r.find(p=>p[0]===c)?.[1];
const set=(r,c,v)=>{const p=r.find(p=>p[0]===c);if(p)p[1]=String(v);else r.push([c,String(v)]);};
export function restoreDwgMetadata(raw,db){
 // LibreDWG's DXF writer can replace some layer references with layer 0.
 // Restore references from the original decoded DWG database before rendering/export.
 const lookup=db instanceof Map?db:new Map();
 if(!(db instanceof Map)){for(const e of db.entities||[])lookup.set(e.handle,e.layer);for(const b of db.tables.BLOCK_RECORD.entries)for(const e of b.entities||[])lookup.set(e.handle,e.layer);}
 let repairs=0,cursor=0;const output=[];
 for(const record of scanRecords(raw)){
  let handle,layer,layerStart,layerEnd;
  for(const g of scanGroups(raw,record.start,record.end)){
   if(g.code===5)handle=g.value;
   if(g.code===8){layer=g.value;layerStart=g.valueStart;layerEnd=g.valueEnd;break;}
  }
  const expected=lookup.get(handle),repairLayer=layer!==undefined&&expected!==undefined&&expected!==layer;
  if(record.type==='DIMENSION'){
   const r=pairs(raw.slice(record.start,record.end));
   if(repairLayer){set(r,8,expected);repairs++;}
   let changed=repairLayer;
   for(let c=10;c<=16;c++)if(get(r,c)!==undefined&&get(r,c+10)!==undefined&&get(r,c+20)===undefined){const i=r.findIndex(p=>p[0]===c+10);r.splice(i+1,0,[c+20,'0.0']);changed=true;}
   for(let i=r.length-1;i>=0;i--)if((r[i][0]===50||r[i][0]===52)&&Number(r[i][1])===0){r.splice(i,1);changed=true;}
   if(changed){output.push(raw.slice(cursor,record.start),stringify(r));cursor=record.end;}
  }else if(repairLayer){output.push(raw.slice(cursor,layerStart),expected);cursor=layerEnd;repairs++;}
 }
 return {text:output.length?[...output,raw.slice(cursor)].join(''):raw,repairs};
}
function* scanGroups(text,start=0,end=text.length){let i=start;while(i<end){const codeEnd=text.indexOf('\n',i);if(codeEnd<0||codeEnd>=end)break;const valueStart=codeEnd+1;let next=text.indexOf('\n',valueStart);if(next<0||next>end)next=end;const valueEnd=next>valueStart&&text[next-1]==='\r'?next-1:next;yield {code:Number(text.slice(i,codeEnd).trim()),value:text.slice(valueStart,valueEnd),start:i,valueStart,valueEnd,end:next+1};i=next+1;}}
function* scanRecords(text){let start=0,type='';for(const g of scanGroups(text)){if(g.code!==0)continue;if(g.start>start)yield {start,end:g.start,type};start=g.start;type=g.value;}if(start<text.length)yield {start,end:text.length,type};}
function transformRecord(r,m){const type=r[0][1];let xs=[10];if(['LINE','TEXT','ATTRIB','ATTDEF','SOLID','3DFACE','DIMENSION'].includes(type))xs=[10,11,12,13,14,15,16,17,18];if(type==='HATCH')return;
 if(Number(get(r,230)??1)===-1&&!['LINE','DIMENSION'].includes(type))m=multiply([-1,0,0,1,0,0],multiply(m,[-1,0,0,1,0,0]));
 function transformCode(code,vector=false){for(let i=0;i<r.length;i++){if(r[i][0]!==code)continue;let j=i+1;while(j<r.length&&r[j][0]!==code&&r[j][0]!==code+10)j++;if(j>=r.length||r[j][0]!==code+10)continue;const q=point({x:Number(r[i][1]),y:Number(r[j][1])},vector?[m[0],m[1],m[2],m[3],0,0]:m);r[i][1]=String(q.x);r[j][1]=String(q.y);}}
 for(const c of xs)transformCode(c);if(['ELLIPSE','MTEXT'].includes(type))transformCode(11,true);
 const angle=Math.atan2(m[1],m[0])*180/Math.PI;
 if(Math.abs(angle)>1e-12){if(['INSERT','TEXT','ATTRIB','ATTDEF','ARC'].includes(type))set(r,50,Number(get(r,50)||0)+angle);if(type==='ARC')set(r,51,Number(get(r,51)||0)+angle);if(type==='DIMENSION'&&r.some(p=>p[0]===100&&p[1]==='AcDbRotatedDimension'))set(r,50,Number(get(r,50)||0)+angle);if(type==='MTEXT'&&get(r,50)!==undefined)set(r,50,Number(get(r,50))+angle*Math.PI/180);}
}
export function exportDxf(model,unit=model.unit){
 const rs=records(pairs(model.raw));const byId=new Map(model.entities.filter(e=>!e.annotation).map(e=>[String(e.id),e]));let max=0;
 for(const r of rs){const h=get(r,5);if(h)max=Math.max(max,parseInt(h,16)||0);}let next=()=> (++max).toString(16).toUpperCase();
 let section='',table='',poly=null,deleteSequence=false;const newBlocks=[],blockRecords=[],deletedRecords=new Set();let modelOwner='';
 const blockDefs=new Map();let activeBlock=null;
 for(const r of rs){if(r[0][1]==='BLOCK'){activeBlock={name:get(r,2),records:[r]};}else if(activeBlock){activeBlock.records.push(r);if(r[0][1]==='ENDBLK'){blockDefs.set(activeBlock.name,activeBlock);activeBlock=null;}}}
 const cloneBlock=(name,m)=>{const b=blockDefs.get(name);if(!b)return name;const fresh='*U_FIELD_'+next(),owner=next();blockRecords.push([[0,'BLOCK_RECORD'],[5,owner],[100,'AcDbSymbolTableRecord'],[100,'AcDbBlockTableRecord'],[2,fresh],[70,0],[280,1],[281,0]]);for(const old of b.records){const r=old.map(p=>[...p]);set(r,5,next());set(r,330,owner);if(r[0][1]==='BLOCK'){set(r,2,fresh);set(r,3,fresh);}else if(r[0][1]!=='ENDBLK')transformRecord(r,m);newBlocks.push(r);}return fresh;};
 for(const r of rs){const type=r[0]?.[1];if(type==='SECTION')section=get(r,2);if(type==='TABLE')table=get(r,2);if(type==='ENDTAB')table='';
  if(section==='HEADER'){for(let i=0;i<r.length-1;i++)if(r[i][0]===9&&r[i][1]==='$INSUNITS')r[i+1][1]=String(unit);}
  if(section==='TABLES'&&table==='LAYER'&&type==='LAYER'){const l=model.layers.find(l=>l.name===get(r,2));if(l){set(r,62,(l.visible?1:-1)*Math.max(1,Math.abs(Number(get(r,62)||7))));const flags=Number(get(r,70)||0);set(r,70,l.visible?flags&~1:flags);}}
  if(section==='TABLES'&&table==='BLOCK_RECORD'&&get(r,2)==='*Model_Space')modelOwner=get(r,5);
  if(section!=='ENTITIES')continue;
  if(deleteSequence){if(['VERTEX','ATTRIB','SEQEND'].includes(type)){deletedRecords.add(r);if(type==='SEQEND')deleteSequence=false;continue;}deleteSequence=false;}
  const deleted=byId.get(get(r,5))||(type==='ATTRIB'?byId.get(get(r,330)):null);
  if(deleted?.deleted){deletedRecords.add(r);deleteSequence=type==='POLYLINE'||(type==='INSERT'&&Number(get(r,66))===1);poly=null;continue;}
  if(type==='VERTEX'&&poly){transformRecord(r,poly);continue;}if(type==='SEQEND'){poly=null;continue;}poly=null;
  const e=byId.get(get(r,5))||(type==='ATTRIB'?byId.get(get(r,330)):null);if(!e||(!e.offset.x&&!e.offset.y&&!e.matrix))continue;const m=multiply([1,0,0,1,e.offset.x,e.offset.y],e.matrix||I);
  if(type==='POLYLINE'){poly=m;continue;}
  if(type==='DIMENSION'){const n=cloneBlock(get(r,2),m);set(r,2,n);}
  transformRecord(r,m);
 }
 const ann=model.entities.filter(e=>e.annotation&&!e.deleted);
 const layerTable=rs.find(r=>r[0][1]==='TABLE'&&get(r,2)==='LAYER');
 const blockTable=rs.find(r=>r[0][1]==='TABLE'&&get(r,2)==='BLOCK_RECORD');
 const templateLayer=rs.find(r=>r[0][1]==='LAYER');
 const layerExists=model.layers.some(l=>l.name===ANNOTATION_LAYER)&&rs.some(r=>r[0][1]==='LAYER'&&get(r,2)===ANNOTATION_LAYER);
 const newEntities=[];
 const common=(type,id)=>[[0,type],[5,id],[330,modelOwner||'1F'],[100,'AcDbEntity'],[8,ANNOTATION_LAYER],[62,30]];
 const xyz=(code,p)=>[[code,p.x],[code+10,p.y],[code+20,p.z||0]];
 const addGeometry=(e,forBlock=false,owner='')=>{
  const ps=annotationPrimitives(e),out=[],m=multiply([1,0,0,1,e.offset.x,e.offset.y],e.matrix||I);for(const p of ps){if(p.kind==='path'){for(let i=1;i<p.points.length;i++){const a=point(p.points[i-1],m),b=point(p.points[i],m);const r=common('LINE',next());if(owner)set(r,330,owner);out.push([...r,[100,'AcDbLine'],...xyz(10,a),...xyz(11,b)]);}}else{const r=common('TEXT',next());if(owner)set(r,330,owner);out.push([...r,[100,'AcDbText'],...xyz(10,point(p.origin,m)),[40,p.height],[1,escapeDxfText(p.text)],[50,(p.angle+Math.atan2(m[1],m[0]))*180/Math.PI],[7,'Standard'],[100,'AcDbText'],[73,0]]);}}return out;};
 for(const e of ann){
  if(e.type!=='DIMENSION'){newEntities.push(...addGeometry(e));continue;}
  const name='*D_FIELD_'+next(),owner=next(),begin=next(),end=next(),id=next();
  blockRecords.push([[0,'BLOCK_RECORD'],[5,owner],[100,'AcDbSymbolTableRecord'],[100,'AcDbBlockTableRecord'],[2,name],[70,0],[280,1],[281,0]]);
  newBlocks.push([[0,'BLOCK'],[5,begin],[330,owner],[100,'AcDbEntity'],[8,ANNOTATION_LAYER],[100,'AcDbBlockBegin'],[2,name],[70,1],...xyz(10,{x:0,y:0}),[3,name],[1,'']],...addGeometry(e,true,owner),[[0,'ENDBLK'],[5,end],[330,owner],[100,'AcDbEntity'],[8,ANNOTATION_LAYER],[100,'AcDbBlockEnd']]);
  const m=multiply([1,0,0,1,e.offset.x,e.offset.y],e.matrix||I),[a,b,c]=e.points.map(p=>point(p,m));const line=annotationPrimitives(e)[2].points[1];const anchor=point(line,m);
  newEntities.push([...common('DIMENSION',id),[100,'AcDbDimension'],[2,name],...xyz(10,anchor),...xyz(11,{x:(a.x+b.x)/2,y:(a.y+b.y)/2}),[70,33],[42,Math.hypot(b.x-a.x,b.y-a.y)],[1,escapeDxfText(e.text||'<>')],[3,'Standard'],[100,'AcDbAlignedDimension'],...xyz(13,a),...xyz(14,b)]);
 }
 const out=[];section='';table='';let addedLayer=false;
 for(const r of rs){const type=r[0][1];if(type==='SECTION')section=get(r,2);if(type==='TABLE')table=get(r,2);
  if(deletedRecords.has(r))continue;
  if(type==='ENDTAB'&&table==='LAYER'&&!layerExists&&ann.length){const r=[[0,'LAYER'],[5,next()],[330,get(layerTable||[],5)||'2'],[100,'AcDbSymbolTableRecord'],[100,'AcDbLayerTableRecord'],[2,ANNOTATION_LAYER],[70,0],[62,model.layers.find(l=>l.name===ANNOTATION_LAYER)?.visible===false?-30:30],[6,'Continuous'],[290,1],[370,-3]];if(get(templateLayer||[],390))r.push([390,get(templateLayer,390)]);out.push(r);addedLayer=true;}
  if(type==='ENDTAB'&&table==='BLOCK_RECORD'){for(const b of blockRecords)set(b,330,get(blockTable||[],5)||'1');out.push(...blockRecords);}
  if(type==='ENDSEC'&&section==='BLOCKS')out.push(...newBlocks);
  if(type==='ENDSEC'&&section==='ENTITIES')out.push(...newEntities);
  out.push(r);if(type==='ENDTAB')table='';
 }
 // HANDSEED must exceed newly allocated handles. Table counts are advisory but kept correct.
 for(const r of out){for(let i=0;i<r.length-1;i++)if(r[i][0]===9&&r[i][1]==='$HANDSEED')r[i+1][1]=next();if(r[0][1]==='TABLE'&&get(r,2)==='LAYER'&&addedLayer)set(r,70,Number(get(r,70)||0)+1);if(r[0][1]==='TABLE'&&get(r,2)==='BLOCK_RECORD')set(r,70,Number(get(r,70)||0)+blockRecords.length);}
 return stringify(out.flat());
}
export function escapeDxfText(s){return String(s).replace(/\r?\n/g,' ').replace(/[^\x20-\x7e]/g,c=>'\\U+'+c.charCodeAt(0).toString(16).toUpperCase().padStart(4,'0'));}
export function demoDxf(){return CALIBRATION_DXF;}
