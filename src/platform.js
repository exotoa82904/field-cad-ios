import {Capacitor} from '@capacitor/core';
import {encodedChunks,base64,safeFilename} from './file-chunks.js';
export const nativeIOS=Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios';
export async function copyText(text){if(nativeIOS){const {Clipboard}=await import('@capacitor/clipboard');await Clipboard.write({string:text});}else await navigator.clipboard.writeText(text);}
export async function saveFile(data,name,type){
 if(nativeIOS){
  const [{Filesystem,Directory},{Share}]=await Promise.all([import('@capacitor/filesystem'),import('@capacitor/share')]);
  const path='exports/'+Date.now()+'-'+safeFilename(name);let first=true;
  for(const part of encodedChunks(data)){const options={path,directory:Directory.Cache,data:base64(part)};if(first){await Filesystem.writeFile({...options,recursive:true});first=false;}else await Filesystem.appendFile(options);}
  if(first)await Filesystem.writeFile({path,directory:Directory.Cache,data:'',recursive:true});
  const {uri}=await Filesystem.getUri({path,directory:Directory.Cache});
  // The iOS sheet includes Save to Files. Keep cache files until the OS purges them;
  // removing a file while its share extension is reading would truncate the export.
  await Share.share({title:name,files:[uri],dialogTitle:'儲存或分享 '+name});
  return 'shared';
 }
 const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);return 'downloaded';
}
