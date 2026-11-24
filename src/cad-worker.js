import {LibreDwg} from '@mlightcad/libredwg-web';
import {parseDrawing} from './model.js';
import {decodeDwg} from './dwg.js';
let libPromise;
const engine=()=>libPromise??=LibreDwg.create(new URL('./',self.location.href).href).catch(e=>{libPromise=null;throw e;});
self.onmessage=async({data})=>{
 const id=data.id;
 if(data.type==='warmup'){try{await engine();self.postMessage({warm:true});}catch(e){self.postMessage({id,error:e.message||String(e)});}return;}
 try{
  const {buffer,name,encoding}=data;let text,repairs=0,version='DXF',timings={};const start=performance.now();
  const stage=s=>self.postMessage({id,stage:s});
  if(/\.dwg$/i.test(name)){
   stage('準備本機 DWG 引擎');const lib=await engine();
   const result=decodeDwg(lib,buffer,stage);text=result.text;repairs=result.repairs;timings=result.timings;version=new TextDecoder().decode(buffer.slice(0,6));
  }else{
   const bytes=new Uint8Array(buffer);if(new TextDecoder().decode(bytes.slice(0,22)).startsWith('AutoCAD Binary DXF'))throw Error('目前只支援文字 DXF；請先在 CAD 另存 ASCII DXF。');
   let codec=encoding==='auto'?'utf-8':encoding;
   if(encoding==='auto'){try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{codec='big5';}}
   text=new TextDecoder(codec).decode(bytes);
  }
  stage('準備圖面與精確鎖點');const t=performance.now();
  const model=parseDrawing(text,{retainSource:false});model.inputVersion=version;model.metadataRepairs=repairs;
  model.timings={...timings,modelMs:performance.now()-t,workerMs:performance.now()-start};
  if(data.inspectOnly){const p=model.primitives.find(p=>model.entities.find(e=>e.id===p.owner)?.type==='LINE'&&p.points.length===2),a=p?.points[0],b=p?.points[1];self.postMessage({id,inspection:{version:version==='DXF'?model.version:version,entities:model.entities.length,primitives:model.primitives.length,layers:model.layers.length,unit:model.unit,timings:model.timings,firstLine:a?[a.x,a.y,b.x,b.y]:null,firstLineLength:a?Math.hypot(b.x-a.x,b.y-a.y):null,warnings:model.warnings}});return;}
  const rawBuffer=new TextEncoder().encode(text).buffer;model.raw='';
  self.postMessage({id,model,rawBuffer},[rawBuffer]);
 }catch(e){self.postMessage({id,error:e.message||String(e)});}
};
