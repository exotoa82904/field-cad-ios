import {PDFDocument,rgb,degrees,pushGraphicsState,popGraphicsState,rectangle,clip,endPath,moveTo,lineTo,stroke,setLineWidth,setStrokingColor} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {clipSegment,overlaps} from './geometry.js';
let fontBytes;
import {paperSize,pageTransform,plotColor} from './plot.js';
export {paperSize,pageTransform,plotColor} from './plot.js';
export async function exportPdf({primitives,entities,visible,range,paper,orientation,fontData}){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 fontBytes??=fontData||await fetch('/fonts/NotoSansTC.ttf').then(r=>{if(!r.ok)throw Error('PDF 字型載入失敗');return r.arrayBuffer();});
 // Keep original glyph IDs: subsetting this CJK face can drop composite digits.
 const font=await pdf.embedFont(fontBytes,{subset:false});
 const [w,h]=paperSize(paper,orientation),page=pdf.addPage([w,h]),t=pageTransform(range,w,h);const byId=new Map(entities.map(e=>[e.id,e]));
 page.pushOperators(pushGraphicsState(),rectangle(t.box.x,t.box.y,t.box.width,t.box.height),clip(),endPath());
 let lineCount=0,textCount=0;let ops=[];const flush=()=>{if(ops.length)page.pushOperators(...ops);ops=[];};
 for(const p of primitives){if(!visible(p))continue;const e=byId.get(p.owner),d=e?.offset||{x:0,y:0},local={minX:range.minX-d.x,maxX:range.maxX-d.x,minY:range.minY-d.y,maxY:range.maxY-d.y};if(!overlaps(p.bounds,local))continue;const hex=plotColor(p.color),n=parseInt(hex.slice(1),16),color=rgb(((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255);
  if(p.kind==='text'){flush();const text=p.text.replace(/\r/g,'');if(!text)continue;page.drawText(text,{x:t.x(p.origin.x+d.x),y:t.y(p.origin.y+d.y),size:Math.max(.01,p.height*t.scale),font,color,rotate:degrees(p.angle*180/Math.PI),lineHeight:p.height*t.scale*1.3});textCount++;}
  else if(p.points.length===1){const q=p.points[0];page.drawCircle({x:t.x(q.x+d.x),y:t.y(q.y+d.y),size:.6,color});lineCount++;}
  else{ops.push(setStrokingColor(color),setLineWidth(.45));for(let i=1;i<p.points.length;i++){const seg=clipSegment(p.points[i-1],p.points[i],local);if(!seg)continue;ops.push(moveTo(t.x(seg[0].x+d.x),t.y(seg[0].y+d.y)),lineTo(t.x(seg[1].x+d.x),t.y(seg[1].y+d.y)));lineCount++;}ops.push(stroke());if(ops.length>8000)flush();}
 }
 flush();page.pushOperators(popGraphicsState());pdf.setTitle('Field CAD');pdf.setSubject('Local CAD vector export · fit to page');pdf.setCreator('Field CAD / browser local');
 return {bytes:await pdf.save(),lineCount,textCount};
}
