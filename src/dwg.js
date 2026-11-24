import {Dwg_File_Type,Dwg_Object_Type,dwgCodePageToEncoding} from '@mlightcad/libredwg-web';
import {restoreDwgMetadata} from './dxf.js';

// Collect layer references without duplicating all native geometry and xdata.
export function readDwgLayers(lib,data){
 const layers=new Map(),refs=[],decoder=new TextDecoder(dwgCodePageToEncoding(lib.dwg_get_codepage(data)));
 for(let i=0,n=lib.dwg_get_num_objects(data);i<n;i++){
  const o=lib.dwg_get_object(data,i);if(!o)continue;
  const handle=lib.dwg_obj_get_handle_value(o).toString(16).toUpperCase();
  if(lib.dwg_object_get_fixedtype(o)===Dwg_Object_Type.DWG_TYPE_LAYER){
   const field=lib.dwg_dynapi_entity_value(lib.dwg_object_to_object_tio(o),'name');
   const name=field.bin?decoder.decode(field.bin):field.data;
   if(typeof name==='string')layers.set(handle,name);
  }else if(lib.dwg_object_get_supertype(o)===0){
   const e=lib.dwg_object_to_entity(o),ref=lib.dwg_object_entity_get_layer_object_ref(e);
   refs.push([handle,(ref.absolute_ref||ref.handleref?.value||0n).toString(16).toUpperCase()]);
  }
 }
 return new Map(refs.map(([id,layer])=>[id,layers.get(layer)||'0']));
}
export function decodeDwg(lib,buffer,onStage=()=>{}){
 const timings={},start=performance.now();let t=start;
 onStage('讀取 DWG 圖層參照');
 const ptr=lib.dwg_read_data(buffer,Dwg_File_Type.DWG);if(!ptr)throw Error('DWG 無法解析，請提供其他儲存版本或 DXF。');
 let layers;try{layers=readDwgLayers(lib,ptr);}finally{lib.dwg_free(ptr);}
 timings.referencesMs=performance.now()-t;t=performance.now();
 onStage('轉換本機 DXF 編輯資料');
 const raw=lib.dwg_write_dxf(buffer);if(!raw)throw Error('DWG 已讀取，但無法建立 DXF 編輯資料。');
 timings.conversionMs=performance.now()-t;t=performance.now();
 const repaired=restoreDwgMetadata(new TextDecoder().decode(raw),layers);
 timings.repairMs=performance.now()-t;timings.totalMs=performance.now()-start;
 return {...repaired,timings};
}
