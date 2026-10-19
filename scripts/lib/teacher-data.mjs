import {openingRoll,startRound,generateTurns} from '../../src/lib/engine.ts';
import {continuationAfterTurn} from '../../src/lib/bot/continuation.ts';
import {evaluateStrategy} from '../../src/lib/bot/strategy.ts';
import {createSeededRandom} from '../../src/lib/bot/seeded.ts';

export const TEACHER=Object.freeze({id:'strategy-v1',target:'strategy-soft-value-v1',sampling:'even-turns-independent-roll-v1'});
export function teacherDice(seed,index){
  const random=createSeededRandom(seed,'teacher-roll-v1/'+index);
  const a=random.int(6)+1,b=random.int(6)+1;
  return a===b?[a,a,a,a]:[a,b];
}
/** Reproduce the simulation's roll stream through public opening-contest rules. */
export function playedRolls(seed,count){
  if(!Number.isSafeInteger(count)||count<1||count>100000)throw Error('Invalid recorded turn count.');
  const random=createSeededRandom(seed,'dice'),pair=()=>[random.int(6)+1,random.int(6)+1];
  let game=startRound();
  for(let i=0;game.phase==='opening';i++){
    if(i>=1000)throw Error('Opening contest limit exceeded.');
    const p=pair();game=openingRoll(openingRoll(game,0,p[0]),1,p[1]);
  }
  return Array.from({length:count},()=>{const [a,b]=pair();return a===b?[a,a,a,a]:[a,b];});
}
export function validateRecordedTurns(row){
  if(row.version!==2||!Array.isArray(row.turns)||row.turns.length!==row.examples.length||row.turns.length!==row.result.turns)throw Error('Invalid recorded turns.');
  const rolls=playedRolls(row.result.seed,row.turns.length);
  for(const [i,input]of row.turns.entries()){
    const {remaining,...state}=input??{};
    if(JSON.stringify(state)!==JSON.stringify(row.examples[i].state)||JSON.stringify(remaining)!==JSON.stringify(rolls[i]))throw Error('Recorded state/dice mismatch.');
  }
}
/** Sampling/rolls depend on round identity, never its eventual winner or future dice. */
export function teacherInputs(row,limit){
  if(!Number.isSafeInteger(limit)||limit<1||limit>128)throw Error('Teacher turns per round must be 1..128.');
  const n=row.examples.length,count=Math.min(n,limit);
  return Array.from({length:count},(_,i)=>{
    const index=count===1?0:Math.floor(i*(n-1)/(count-1));
    return {index,input:row.version===2?structuredClone(row.turns[index]):{...structuredClone(row.examples[index].state),remaining:teacherDice(row.result.seed,index)}};
  });
}
/** Labels describe the next active player. Search handles terminal round wins exactly. */
export function teacherAfterstates(input){
  return generateTurns(input).flatMap(plan=>{
    const next=continuationAfterTurn(input,plan);
    return next.kind==='round-win'?[]:[{state:next.state,target:(evaluateStrategy(next.state).value+1)/2}];
  });
}
