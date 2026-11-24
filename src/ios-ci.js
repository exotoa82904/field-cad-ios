// Compiled only for the dedicated cloud simulator build, never the installable app.
import {Capacitor} from '@capacitor/core';
import {Filesystem,Directory} from '@capacitor/filesystem';
import {Clipboard} from '@capacitor/clipboard';
import {probe} from './device-check.js';
import {parseDrawing} from './model.js';
import {exportPdf} from './pdf.js';
import {encodedChunks,base64} from './file-chunks.js';
const REPORT='field-cad-ci-result.json';
function insist(ok,message){if(!ok)throw Error(message);}
export async function runIOSChecks({showDrawing}){
 const report={version:'0.3.0',environment:'iOS Simulator via CI',runtime:Capacitor.getPlatform(),userAgent:navigator.userAgent,origin:location.origin,createdAt:new Date().toISOString(),status:'running',checks:{},notTested:['physical iPhone','Files document picker','airplane mode on a real device','share sheet delivery','real engineering drawings']};
 const persist=()=>Filesystem.writeFile({path:REPORT,directory:Directory.Documents,data:base64(new TextEncoder().encode(JSON.stringify(report,null,2))),recursive:true});
 await persist();
 let pdf,model;
 const steps=[
  ['NativeBridge',async()=>{insist(Capacitor.getPlatform()==='ios','Not running inside iOS');for(const name of ['Filesystem','Clipboard','Share'])insist(Capacitor.isPluginAvailable(name),'Native plugin missing: '+name);return {shareSheetTested:false};}],
  ['WASMWorker',()=>probe({type:'warmup'})],
  ['DXFFileAPI',async()=>{const r=await fetch('/fixtures/calibration.dxf');insist(r.ok,'DXF asset unavailable');const bytes=await r.arrayBuffer(),file=new File([bytes],'calibration.dxf');const result=await probe({name:file.name,buffer:await file.arrayBuffer(),encoding:'auto'});insist(result.unit===6&&Math.abs(result.firstLineLength-120)<1e-9,'DXF units or known 120-unit distance differs');model=parseDrawing(new TextDecoder().decode(bytes));showDrawing(model,bytes.byteLength);return result;}],
  ['DWG',async()=>{const r=await fetch('/fixtures/calibration.dwg');insist(r.ok,'DWG asset unavailable');const result=await probe({name:'calibration.dwg',buffer:await r.arrayBuffer(),encoding:'auto'});insist(result.version==='AC1032'&&result.firstLine?.[0]===300000&&result.firstLine?.[1]===2770000&&Math.abs(result.firstLineLength-120)<1e-9,'DWG WCS or known distance differs');return result;}],
  ['Canvas2D',async()=>{const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const c=canvas.getContext('2d');insist(!!c,'Canvas2D unavailable');c.fillStyle='#57dfc1';c.fillRect(5,5,10,10);const p=c.getImageData(10,10,1,1).data;insist(p[0]===87&&p[1]===223&&p[2]===193,'Canvas rendering readback differs');return {pixel:[...p]};}],
  ['VectorPDF',async()=>{insist(!!model,'DXF model unavailable');pdf=await exportPdf({primitives:model.primitives,entities:model.entities,visible:()=>true,range:{minX:300000,minY:2770000,maxX:300120,maxY:2770090},paper:'A4',orientation:'landscape'});insist(new TextDecoder().decode(pdf.bytes.slice(0,8)).startsWith('%PDF-'),'Invalid PDF');return {bytes:pdf.bytes.length,lines:pdf.lineCount,texts:pdf.textCount};}],
  ['NativePDFFileRoundtrip',async()=>{insist(!!pdf,'PDF unavailable');const path='ci-calibration.pdf';let first=true;for(const part of encodedChunks(pdf.bytes)){const options={path,directory:Directory.Documents,data:base64(part)};if(first){await Filesystem.writeFile(options);first=false;}else await Filesystem.appendFile(options);}const result=await Filesystem.readFile({path,directory:Directory.Documents});insist(typeof result.data==='string','Native read did not return base64');const raw=atob(result.data);insist(raw.length===pdf.bytes.length,'PDF byte count differs');for(let i=0;i<raw.length;i++)if(raw.charCodeAt(i)!==pdf.bytes[i])throw Error('Native PDF bytes differ at '+i);return {bytes:raw.length,exactBinaryMatch:true};}],
  ['NativeClipboard',async()=>{const value='300000.123456789,2770000.123456789';await Clipboard.write({string:value});const r=await Clipboard.read();insist(r.value===value,'Clipboard precision differs');return {exactMatch:true};}]
 ];
 for(const [name,run] of steps){const start=performance.now();try{report.checks[name]={status:'pass',...await run(),ms:Math.round(performance.now()-start)};}catch(e){report.checks[name]={status:'fail',error:e.message,ms:Math.round(performance.now()-start)};}await persist();}
 report.status=Object.values(report.checks).every(r=>r.status==='pass')?'pass':'fail';report.finishedAt=new Date().toISOString();await persist();console.info('FIELD_CAD_CI_COMPLETE '+report.status);
}
