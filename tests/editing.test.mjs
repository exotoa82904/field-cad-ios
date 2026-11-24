import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDrawing,makeAnnotation,annotationPrimitives,ANNOTATION_LAYER} from '../src/model.js';
import {demoDxf,exportDxf} from '../src/dxf.js';
import {History,deleteAction,rotationAction,moveAction} from '../src/geometry.js';
import {fitCamera,MiddleDoubleClick,primaryBounds} from '../src/view.js';
test('delete original text and added dimensions, undo and redo, preserve DXF deletion',()=>{
 const m=parseDrawing(demoDxf()),original=m.entities.find(e=>e.type==='TEXT'),ann=makeAnnotation('DIMENSION',[{x:300000,y:2770000},{x:300003,y:2770004},{x:300000,y:2770005}],'5.000',1,'ANN');
 m.entities.push(ann);m.primitives.push(...annotationPrimitives(ann));m.layers.push({name:ANNOTATION_LAYER,visible:true});
 const h=new History(),ids=new Set([original.id,ann.id]);h.execute(moveAction(m.entities,ids,3,-2));h.execute(rotationAction(m,ids,{x:300000,y:2770000},90));h.execute(deleteAction(m,ids));
 let out=parseDrawing(exportDxf(m));assert.ok(!out.entities.some(e=>e.type==='TEXT'||e.type==='DIMENSION'));
 h.undo();out=parseDrawing(exportDxf(m));assert.ok(out.entities.some(e=>e.type==='TEXT'));assert.ok(out.entities.some(e=>e.type==='DIMENSION'));
 h.redo();assert.ok(!parseDrawing(exportDxf(m)).entities.some(e=>e.type==='DIMENSION'));h.undo();h.undo();h.undo();assert.deepEqual(original.offset,{x:0,y:0});assert.equal(original.deleted,false);
});
test('deleted POLYLINE vertex records are removed without affecting following entities',()=>{
 const raw=demoDxf().replace('0\nSECTION\n2\nENTITIES\n','0\nSECTION\n2\nENTITIES\n0\nPOLYLINE\n5\nAAAA\n8\n0\n66\n1\n70\n0\n0\nVERTEX\n5\nAAAB\n8\n0\n10\n300000\n20\n2770000\n0\nVERTEX\n5\nAAAC\n8\n0\n10\n300010\n20\n2770000\n0\nSEQEND\n5\nAAAD\n');
 const m=parseDrawing(raw);deleteAction(m,new Set(['AAAA'])).redo();const out=exportDxf(m);for(const id of ['AAAA','AAAB','AAAC','AAAD'])assert.ok(!out.includes('\n'+id+'\n'));assert.equal(parseDrawing(out).entities.length,11);
});
test('fit uses original large coordinates and keeps small viewports positive',()=>{const b={minX:300000,minY:2770000,maxX:300100,maxY:2770050};const c=fitCamera(b,1000,700);assert.equal(c.cx,300050);assert.equal(c.cy,2770025);assert.ok(c.scale*100<=920);assert.ok(c.scale*50<=540);assert.ok(fitCamera(b,60,80).scale>0);assert.equal(fitCamera({minX:Infinity},1000,700),null);});
test('middle button double click recognizes only nearby clicks without panning',()=>{const d=new MiddleDoubleClick();assert.equal(d.click(100,{x:10,y:10},false),false);assert.equal(d.click(400,{x:12,y:12},false),true);assert.equal(d.click(500,{x:10,y:10},true),false);assert.equal(d.click(600,{x:10,y:10},false),false);assert.equal(d.click(700,{x:40,y:40},false),false);assert.equal(d.click(1200,{x:40,y:40},false),false);});
test('primary camera finds distant outliers without cropping normal drawing extents',()=>{const bs=Array.from({length:100},(_,i)=>({minX:280000+i,minY:2780000,maxX:280001+i,maxY:2780100}));assert.equal(primaryBounds(bs).outside,0);const remote={minX:3,minY:280000,maxX:4,maxY:280001},result=primaryBounds([...bs,remote]);assert.equal(result.outside,1);assert.equal(result.bounds.minX,280000);assert.equal(bs.length,100);});
