import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildRoundPairs,teacherGroup} from '../scripts/lib/teacher-pairs.mjs';
import {initialPosition} from '../src/lib/engine.ts';

test('literal best-vs-all pair bytes preserve orientation and equal round weight',()=>{
  const group={examples:[.2,.6,.6].map(target=>({target})),signs:[-1,-1,-1],terminal:false};
  const result=buildRoundPairs([group],10);assert.equal(result.count,2);assert.equal(result.bytes.length,48);
  assert.deepEqual(result.metadata,[{signs:[-1,-1,-1],terminal:false}]);
  for(let i=0;i<2;i++){
    const b=result.bytes.subarray(i*24,(i+1)*24);
    assert.equal(b.readUInt32LE(0),10);assert.equal(b.readUInt32LE(4),11+i);
    assert.equal(b.readFloatLE(8),-1);assert.equal(b.readFloatLE(12),-1);
    assert.ok(Math.abs(b.readFloatLE(16)-.8)<1e-6);assert.equal(b.readFloatLE(20),.5);
  }
  const mixed=buildRoundPairs([{examples:[{target:.8},{target:.4}],signs:[1,-1],terminal:false}],0);
  assert.equal(mixed.count,1);assert.equal(mixed.bytes.readFloatLE(8),1);assert.equal(mixed.bytes.readFloatLE(12),-1);
  assert.ok(Math.abs(mixed.bytes.readFloatLE(16)-.4)<1e-6);
});
test('ties, singleton choices and exact round wins contribute no contradictory pairs',()=>{
  for(const group of [
    {examples:[{target:.5},{target:.5}],signs:[-1,-1],terminal:false},
    {examples:[{target:.2}],signs:[-1],terminal:false},
    {examples:[{target:.2},{target:.8}],signs:[-1,-1],terminal:true},
  ])assert.equal(buildRoundPairs([group],0).count,0);
  const ordinary=teacherGroup({position:initialPosition(),active:0,score:[0,0],remaining:[2,4]});
  assert.equal(ordinary.terminal,false);assert.ok(ordinary.signs.every(s=>s===-1));
  const points=Array.from({length:24},()=>({count:[0,0],top:null}));
  points[0]={count:[1,0],top:0};points[23]={count:[0,15],top:1};
  const terminal=teacherGroup({position:{points,off:[14,0]},active:0,score:[1,0],remaining:[1]});
  assert.equal(terminal.terminal,true);assert.deepEqual(terminal.examples,[]);
});
