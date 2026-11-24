export function* encodedChunks(data,limit=192*1024){
 if(typeof data==='string'){
  const encoder=new TextEncoder();
  for(let start=0;start<data.length;){let end=Math.min(start+limit,data.length);const c=data.charCodeAt(end-1);if(end<data.length&&c>=0xd800&&c<=0xdbff)end--;yield encoder.encode(data.slice(start,end));start=end;}
 }else{
  const bytes=data instanceof Uint8Array?data:new Uint8Array(data);for(let i=0;i<bytes.length;i+=limit)yield bytes.subarray(i,i+limit);
 }
}
export function base64(bytes){let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
export function safeFilename(name){return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').slice(-160)||'drawing';}
