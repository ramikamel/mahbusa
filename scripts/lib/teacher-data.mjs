import {generateTurns} from '../../src/lib/engine.ts';
import {continuationAfterTurn} from '../../src/lib/bot/continuation.ts';
import {evaluateStrategy} from '../../src/lib/bot/strategy.ts';
import {createSeededRandom} from '../../src/lib/bot/seeded.ts';

export const TEACHER=Object.freeze({id:'strategy-v1',target:'strategy-soft-value-v1',sampling:'even-turns-independent-roll-v1'});
/** Sampling/rolls depend on round identity, never its eventual winner or future dice. */
export function teacherInputs(row,limit){
  if(!Number.isSafeInteger(limit)||limit<1||limit>128)throw Error('Teacher turns per round must be 1..128.');
  const n=row.examples.length,count=Math.min(n,limit);
  return Array.from({length:count},(_,i)=>{
    const index=count===1?0:Math.floor(i*(n-1)/(count-1));
    const random=createSeededRandom(row.result.seed,'teacher-roll-v1/'+index);
    const a=random.int(6)+1,b=random.int(6)+1;
    return {index,input:{...structuredClone(row.examples[index].state),remaining:a===b?[a,a,a,a]:[a,b]}};
  });
}
/** Labels describe the next active player. Search handles terminal round wins exactly. */
export function teacherAfterstates(input){
  return generateTurns(input).flatMap(plan=>{
    const next=continuationAfterTurn(input,plan);
    return next.kind==='round-win'?[]:[{state:next.state,target:(evaluateStrategy(next.state).value+1)/2}];
  });
}
