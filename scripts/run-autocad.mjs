import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const [input,script,log]=process.argv.slice(2);
if(!input||!script||!log)throw Error('Usage: node scripts/run-autocad.mjs input.dxf check.scr log.txt');
const allowed=path.resolve('../private-validation')+path.sep;
if(!path.resolve(input).startsWith(allowed)||!path.resolve(script).startsWith(allowed))throw Error('AutoCAD validation is restricted to workspace private-validation copies.');
const result=spawnSync('C:/Program Files/Autodesk/AutoCAD 2027/accoreconsole.exe',['/i',input,'/s',script,'/l','en-US'],{windowsHide:true,timeout:60000,maxBuffer:16*1024*1024});
const output=Buffer.concat([result.stdout||Buffer.alloc(0),result.stderr||Buffer.alloc(0)]).toString('utf16le');fs.writeFileSync(log,output);console.log(output.slice(-5000));process.exitCode=result.status??1;
