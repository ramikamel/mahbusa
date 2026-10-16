import {applyMove,availableMoves} from '../engine.ts';
import type {Game,Move} from '../engine';
import {record,validatePosition} from './validation.ts';

/** Browser-safe checked replay of an unknown complete-turn proposal. */
export function replayPlan(source:Game,proposal:unknown):Game {
  if(source.phase!=='moving')throw new Error('Replay requires a moving game.');
  const plan=record(proposal);
  if(!Array.isArray(plan.moves)||plan.moves.length>4)throw new Error('Invalid plan moves.');
  let game=structuredClone(source);
  for(const raw of plan.moves){
    const value=record(raw);
    if(![value.from,value.to,value.die].every(Number.isInteger))throw new Error('Invalid move.');
    const move:Move={from:value.from as number,to:value.to as number,die:value.die as number};
    if(!availableMoves(game).some(m=>m.from===move.from&&m.to===move.to&&m.die===move.die))throw new Error('Policy proposed an illegal move.');
    game=applyMove(game,move);
  }
  if(availableMoves(game).length)throw new Error('Policy proposed an incomplete turn.');
  const position=plan.position;
  try{validatePosition(position);}catch(error){throw new Error('Invalid policy result position.',{cause:error});}
  const samePosition=game.position.off.every((n,i)=>n===position.off[i])
    &&game.position.points.every((p,i)=>p.top===position.points[i].top&&p.count.every((n,j)=>n===position.points[i].count[j]));
  const remaining=plan.remaining;
  const sameDice=Array.isArray(remaining)&&remaining.length===game.remaining.length
    &&[...game.remaining].sort((a,b)=>a-b).every((n,i)=>n===remaining[i]);
  const outcome=plan.outcome;
  const sameOutcome=game.outcome===null?outcome===null:!!outcome&&typeof outcome==='object'
    &&game.outcome.winner===(outcome as Record<string,unknown>).winner
    &&game.outcome.points===(outcome as Record<string,unknown>).points
    &&game.outcome.reason===(outcome as Record<string,unknown>).reason;
  if(!samePosition||!sameDice||!sameOutcome)throw new Error('Policy result does not match checked replay.');
  return game;
}
