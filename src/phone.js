import './phone.css';
import {installTouch} from './touch.js';
export function mountPhoneUI(api){
 const $=id=>document.getElementById(id),enabled=api.native||new URLSearchParams(location.search).get('layout')==='phone'||(matchMedia('(max-width: 700px)').matches&&navigator.maxTouchPoints>0);
 if(!enabled)return {enabled:false,refresh(){},resetPoint(){},renderAim(){},get adding(){return false;}};
 document.body.classList.add('phone-ui');$('sidebar').hidden=true;$('expand-layers').hidden=false;$('empty-open').textContent='從「檔案」開啟';$('filemeta').textContent='DWG / DXF · 裝置端處理';document.querySelector('#empty p:nth-of-type(2)').innerHTML='從「檔案」選擇已下載的 DWG／DXF。<br>離線查座標、量測、標註與出圖。';document.querySelector('.pdf-note').innerHTML='向量 PDF · 白底 · 適合頁面<br>依可見圖層出圖，包含範圍內標註。<br>關閉預覽後不留框線。';
 const controls=document.createElement('section');controls.id='phone-controls';controls.setAttribute('aria-label','手機操作確認');
 controls.innerHTML='<div id="phone-stage"></div><div id="phone-window"><button id="phone-inside" aria-pressed="true">全包</button><button id="phone-crossing" aria-pressed="false">相交</button><button id="phone-add" aria-pressed="false">加選</button></div><div id="phone-coordinates">拖動圖上的準星，放大確認鎖點</div><div class="phone-confirm-row"><button id="phone-confirm" class="primary" disabled>確認此點</button><button id="phone-area-done">完成面積</button><button id="phone-back">撤回點</button><button id="phone-params">參數</button><button id="phone-cancel">取消</button></div>';
 $('viewport').append(controls);
 const loupe=document.createElement('canvas');loupe.id='phone-loupe';loupe.width=240;loupe.height=240;loupe.hidden=true;loupe.setAttribute('aria-label','鎖點局部放大');$('viewport').append(loupe);
 const undo=document.createElement('div');undo.id='phone-history';undo.innerHTML='<button id="phone-undo">復原</button><button id="phone-redo">重做</button>';$('viewport').append(undo);
 const more=document.createElement('button');more.id='phone-more';more.innerHTML='<span>•••</span>更多';document.querySelector('.toolbar').append(more);
 const extra=document.createElement('div');extra.id='phone-extra';extra.hidden=true;extra.innerHTML='<button id="phone-save">另存 DXF</button><button id="phone-delete">刪除選取</button><button id="phone-check">裝置檢查</button>';$('viewport').append(extra);
 let adding=false,crossing=false,candidate=null,aimScreen=null,lastMode='',resetGesture=()=>{};
 const selectable=s=>s.mode==='select'||(s.mode==='move'&&!s.points&&(!s.selection||adding));
 const kind=()=>{const s=api.state();return !s.loaded||s.mode==='pan'?'pan':s.mode==='pdf-window'||selectable(s)?'box':'aim';};
 const fmt=n=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:6}):'—';
 function refresh(){const s=api.state();controls.hidden=!s.loaded;undo.hidden=!s.loaded;$('phone-save').disabled=!s.loaded;$('phone-delete').disabled=!s.selection;
  $('phone-undo').disabled=!s.undo;$('phone-redo').disabled=!s.redo;
  if(s.mode!==lastMode){document.body.classList.toggle('phone-params',['text','arrow','dimension'].includes(s.mode));lastMode=s.mode;}
  const aiming=kind()==='aim';$('phone-window').hidden=!selectable(s);$('phone-confirm').hidden=!aiming;$('phone-coordinates').hidden=!aiming;$('phone-confirm').disabled=!candidate;
  if(candidate)$('phone-coordinates').textContent=(candidate.kind||'未鎖點')+' · X '+fmt(candidate.x)+' · Y '+fmt(candidate.y)+' '+s.unit;
  $('phone-area-done').hidden=s.mode!=='area';$('phone-area-done').disabled=s.points<3;$('phone-back').hidden=!s.points;
  $('phone-params').hidden=!['move','rotate','text','arrow','dimension'].includes(s.mode);
  const hints={pan:'單指拖曳平移；雙指隨時縮放與平移',select:'點選或拖曳窗選；先選「全包」或「相交」',coord:'拖動準星到物件，確認鎖點後按「確認此點」',distance:s.points?'確認距離終點':'確認距離起點',area:'已確認 '+s.points+' 點；至少三點後按「完成面積」',move:!s.selection?'點選或窗選物件，接著指定基準點':s.points?'確認目標點，即可完成移動':'確認移動基準點；也可開啟參數輸入位移',rotate:['確認旋轉中心','確認參考方向','確認旋轉後方向'][s.points]||'確認旋轉位置',text:'先輸入文字與字高，再確認放置位置',arrow:s.points?'確認箭尾位置':'確認箭頭指向位置',dimension:['確認尺寸第一端點','確認尺寸第二端點','確認尺寸線位置'][s.points]||'確認尺寸位置','pdf-window':'單指拖曳橘色出圖框；雙指可縮放與平移'};
  $('phone-stage').textContent=adding&&selectable(s)?'加選中；完成後按「完成加選」再指定基準點':hints[s.mode];document.body.dataset.phoneMode=s.mode;
  loupe.hidden=!aiming||!candidate;if(!aiming){candidate=null;aimScreen=null;}
 }
 function aim(p){const size=api.size();aimScreen={x:Math.max(4,Math.min(size.w-4,p.x)),y:Math.max(4,Math.min(size.h-4,p.y))};candidate=api.snap(aimScreen);api.hover(candidate);$('phone-coordinates').textContent=(candidate.kind||'未鎖點')+' · X '+fmt(candidate.x)+' · Y '+fmt(candidate.y)+' '+api.state().unit;$('phone-confirm').disabled=false;loupe.hidden=false;api.schedule();}
 function renderAim(){if(!candidate||kind()!=='aim')return;const p=api.screen(candidate),canvas=$('drawing'),dpr=api.size().dpr,c=loupe.getContext('2d');c.fillStyle='#0d1722';c.fillRect(0,0,240,240);c.drawImage(canvas,(p.x-30)*dpr,(p.y-30)*dpr,60*dpr,60*dpr,0,0,240,240);c.strokeStyle=candidate.kind?'#ffe587':'#a1eada';c.lineWidth=2;c.beginPath();c.moveTo(100,120);c.lineTo(140,120);c.moveTo(120,100);c.lineTo(120,140);c.stroke();
  const ox=$('overlay').getContext('2d');ox.save();ox.setTransform(dpr,0,0,dpr,0,0);ox.strokeStyle=candidate.kind?'#ffe587':'#8bf1dc';ox.lineWidth=1.5;ox.beginPath();ox.arc(p.x,p.y,12,0,Math.PI*2);ox.moveTo(p.x-20,p.y);ox.lineTo(p.x+20,p.y);ox.moveTo(p.x,p.y-20);ox.lineTo(p.x,p.y+20);ox.stroke();ox.restore();
 }
 $('phone-confirm').onclick=()=>{if(!candidate)return;const p={...candidate};candidate=null;aimScreen=null;api.point(p);api.schedule();refresh();};
 $('phone-cancel').onclick=()=>{resetGesture();adding=false;candidate=null;aimScreen=null;api.cancel();refresh();};
 $('phone-area-done').onclick=()=>{api.completeArea();candidate=null;aimScreen=null;api.schedule();refresh();};$('phone-back').onclick=()=>{api.back();candidate=null;aimScreen=null;api.schedule();refresh();};
 $('phone-inside').onclick=()=>{crossing=false;$('phone-inside').setAttribute('aria-pressed','true');$('phone-crossing').setAttribute('aria-pressed','false');};
 $('phone-crossing').onclick=()=>{crossing=true;$('phone-inside').setAttribute('aria-pressed','false');$('phone-crossing').setAttribute('aria-pressed','true');};
 $('phone-add').onclick=()=>{adding=!adding;$('phone-add').setAttribute('aria-pressed',String(adding));$('phone-add').textContent=adding?'完成加選':'加選';refresh();};
 $('phone-params').onclick=()=>document.body.classList.toggle('phone-params');more.onclick=()=>{const on=document.body.classList.toggle('phone-more');extra.hidden=!on;more.setAttribute('aria-expanded',String(on));};
 for(const button of document.querySelectorAll('.toolbar [data-tool]'))button.addEventListener('click',()=>{document.body.classList.remove('phone-more');extra.hidden=true;more.setAttribute('aria-expanded','false');});
 for(const [target,source] of [['phone-save','save'],['phone-delete','delete'],['phone-undo','undo'],['phone-redo','redo']])$(target).onclick=()=>$(source).click();
 $('phone-check').onclick=api.check;
 resetGesture=installTouch($('viewport'),$('drawing'),{mouse:true,camera:api.camera,size:api.size,kind,setCamera(c){api.setCamera(c);if(aimScreen)aim(aimScreen);},box:api.box,clearBox:api.clearBox,aim,finishBox:(a,b)=>api.finishBox(a,b,crossing,adding),pick:p=>api.pick(p,adding)});
 refresh();return {enabled:true,refresh,renderAim,resetPoint(){candidate=null;aimScreen=null;adding=false;$('phone-add').setAttribute('aria-pressed','false');$('phone-add').textContent='加選';$('phone-coordinates').textContent='拖動圖上的準星，放大確認鎖點';resetGesture();loupe.hidden=true;},get adding(){return adding;}};
}
