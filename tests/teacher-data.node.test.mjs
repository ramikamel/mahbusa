import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPosition,other} from '../src/lib/engine.ts';
import {generateTurns} from '../src/lib/engine.ts';
import {continuationAfterTurn} from '../src/lib/bot/continuation.ts';
import {evaluateStrategy} from '../src/lib/bot/strategy.ts';
import {teacherAfterstates,teacherInputs,TEACHER} from '../scripts/lib/teacher-data.mjs';

test('teacher uses literal independent rolls and evenly spaced root selection',()=>{
  const state={position:initialPosition(),active:0,score:[0,0]};
  const row={result:{seed:'teacher-fixture'},examples:Array.from({length:9},()=>({state}))};
  const inputs=teacherInputs(row,3);
  assert.deepEqual(inputs.map(r=>r.index),[0,4,8]);
  assert.deepEqual(inputs.map(r=>r.input.remaining),[[2,1],[5,3],[6,2]]);
  assert.deepEqual(teacherInputs(row,3),inputs);
  assert.equal(TEACHER.id,'strategy-v1');
});
test('all teacher targets use the continuation active perspective for both colors',()=>{
  for(const active of [0,1]){
    const input={position:initialPosition(),active,score:[1,2],remaining:[2,4]};
    const examples=teacherAfterstates(input);
    assert.equal(examples.length,generateTurns(input).length);
    for(const [i,row] of examples.entries()){
      const next=continuationAfterTurn(input,generateTurns(input)[i]);
      assert.equal(next.state.active,other(active));
      assert.deepEqual(row.state,next.state);
      assert.equal(row.target,(evaluateStrategy(next.state).value+1)/2);
      assert.ok(row.target>0 && row.target<1);
    }
  }
});
test('game wins teach the updated score/start, exact round wins need no predictor',()=>{
  const points=Array.from({length:24},()=>({count:[0,0],top:null}));
  points[0]={count:[1,0],top:0};points[23]={count:[0,15],top:1};
  const input={position:{points,off:[14,0]},active:0,score:[0,0],remaining:[1]};
  const rows=teacherAfterstates(input);
  assert.equal(rows.length,1);assert.deepEqual(rows[0].state.score,[2,0]);
  assert.equal(rows[0].state.active,0);assert.deepEqual(rows[0].state.position,initialPosition());
  assert.deepEqual(teacherAfterstates({...input,score:[1,0]}),[]);
});
