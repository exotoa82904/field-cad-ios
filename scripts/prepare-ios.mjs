import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const ci=process.argv.includes('--ci'),mode=ci?'ios-ci':'ios';
const python=spawnSync(process.platform==='win32'?'python':'python3',['scripts/configure-ios.py'],{stdio:'inherit'});if(python.status!==0)process.exit(python.status||1);
// Capacitor update also copies web assets: build them before a clean Mac checkout updates plugins.
for(const args of [['node_modules/vite/bin/vite.js','build','--mode',mode],['scripts/package-assets.mjs']]){const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
fs.writeFileSync('dist/field-cad-build.json',JSON.stringify({version:'0.3.0',target:mode,testing:ci}));
const update=spawnSync(process.execPath,['node_modules/@capacitor/cli/bin/capacitor','update','ios'],{stdio:'inherit'});if(update.status!==0)process.exit(update.status||1);
// Keep Swift package references portable between the pnpm checkout on Windows and Mac.
const file='ios/App/CapApp-SPM/Package.swift';let s=fs.readFileSync(file,'utf8');s=s.replace(/path: "[^"\n]*node_modules\/@capacitor\/(filesystem|share|clipboard)"/g,(_,name)=>'path: "../../../node_modules/@capacitor/'+name+'"');fs.writeFileSync(file,s);
const copy=spawnSync(process.execPath,['node_modules/@capacitor/cli/bin/capacitor','copy','ios'],{stdio:'inherit'});if(copy.status!==0)process.exit(copy.status||1);
const r=spawnSync(process.execPath,['scripts/check-ios.mjs',...(ci?['--ci']:[])],{stdio:'inherit'});process.exitCode=r.status||0;
