import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
fs.mkdirSync('dist/assets',{recursive:true});
fs.copyFileSync('node_modules/@mlightcad/libredwg-web/wasm/libredwg-web.wasm','dist/assets/libredwg-web.wasm');
for(const f of ['LICENSE','THIRD_PARTY_NOTICES.txt'])if(fs.existsSync(f))fs.copyFileSync(f,path.join('dist',f));
fs.mkdirSync('dist/licenses',{recursive:true});
for(const name of ['@capacitor/core','@capacitor/ios','@capacitor/filesystem','@capacitor/share','@capacitor/clipboard','dialog-polyfill']){const base=path.join('node_modules',name),file=['LICENSE','LICENSE.md','LICENSE.txt'].find(f=>fs.existsSync(path.join(base,f)));if(file)fs.copyFileSync(path.join(base,file),path.join('dist/licenses',name.replaceAll('/','-')+'.txt'));}
const source=spawnSync(process.platform==='win32'?'python':'python3',['scripts/make-source.py'],{stdio:'inherit'});
if(source.status!==0)throw Error('Could not package corresponding application source.');
