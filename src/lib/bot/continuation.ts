import {initialPosition,other} from '../engine.ts';
import type {Pair,Player} from '../engine';
import type {PreRollState,TurnInput,TurnPlan} from './types';

export type TurnContinuation =
  | {kind:'round-win';state:null;winner:Player}
  | {kind:'handover'|'next-game';state:PreRollState;winner:null};

/** Caller supplies an engine-generated complete turn. Does not roll dice.
 * Keep this score boundary checked against public move replay in tests. */
export function continuationAfterTurn(input:TurnInput & {score:Pair},plan:TurnPlan):TurnContinuation {
  const score:Pair=[...input.score];
  if(plan.outcome){
    const {winner,points}=plan.outcome;score[winner]+=points;
    if(score[winner]>=3)return {kind:'round-win',state:null,winner};
    return {kind:'next-game',winner:null,state:{position:initialPosition(),active:winner,score}};
  }
  return {kind:'handover',winner:null,state:{position:plan.position,active:other(input.active),score}};
}
