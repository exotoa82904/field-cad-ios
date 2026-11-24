import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {LibreDwg} from '@mlightcad/libredwg-web';
import {decodeDwg} from '../src/dwg.js';
import {parseDrawing} from '../src/model.js';
const lib=await LibreDwg.create(path.resolve('node_modules/@mlightcad/libredwg-web/wasm')+'/');
for(const ext of ['dwg','dxf']){const bytes=fs.readFileSync('public/fixtures/calibration.'+ext);const text=ext==='dwg'?decodeDwg(lib,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)).text:bytes.toString('utf8');const m=parseDrawing(text);assert.equal(m.unit,6);assert.equal(m.entities.length,11);const line=m.primitives.find(p=>p.points.length===2&&m.entities.find(e=>e.id===p.owner)?.type==='LINE');assert.equal(line.points[0].x,300000);assert.equal(line.points[0].y,2770000);assert.equal(Math.hypot(line.points[1].x-line.points[0].x,line.points[1].y-line.points[0].y),120);console.log(ext.toUpperCase()+' calibration: '+bytes.length+' bytes; 11 entities; WCS and 120 m verified.');}
