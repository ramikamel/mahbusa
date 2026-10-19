import { createHash } from 'node:crypto';
import { other } from '../engine.ts';
import type { Pair,Player } from '../engine';
import { createSeededRandom } from './seeded.ts';
import { simulateRound, strategyPolicy } from './simulation.ts';
import type { BotPolicy, RoundResult } from './simulation';
import type { PreRollState,TurnInput } from './types';

export type SelfPlayRound = {
  format:'mahbusa-self-play-round'; version:1|2; turns?:(TurnInput & {score:Pair})[]; index:number; result:RoundResult;
  examples:{state:PreRollState;target:-1|1}[];
};
/** Outcome-labelled pre-roll positions. This generates data; it does not train a model. */
export function generateSelfPlayRound(options:{seed:string;index:number;maxTurns?:number;recordTurns?:boolean;policy?:BotPolicy;policies?:[BotPolicy,BotPolicy]}):SelfPlayRound {
  const {seed,index,maxTurns}=options,policy=options.policy??strategyPolicy;
  createSeededRandom(seed,'validate');
  if(!Number.isSafeInteger(index)||index<0)throw new Error('Invalid self-play round index.');
  if(options.policy&&options.policies)throw new Error('Choose a mirror policy or two entrant policies.');
  const roundSeed=createHash('sha256').update(JSON.stringify(['self-play-v1',seed,index])).digest('hex');
  const states:PreRollState[]=[],turns:(TurnInput & {score:Pair})[]=[];
  const result=simulateRound({seed:roundSeed,aColor:(index%2) as Player,policies:options.policies??[policy,policy],maxTurns,onPreRoll:s=>states.push(s),...(options.recordTurns?{onTurn:t=>turns.push(t)}:{})});
  const winnerColor=result.winner===0?result.aColor:other(result.aColor);
  return {format:'mahbusa-self-play-round',version:options.recordTurns?2:1,index,result,...(options.recordTurns?{turns:result.status==='complete'?turns:[]}:{}),
    examples:result.status==='complete'?states.map(state=>({state,target:state.active===winnerColor?1:-1})):[]};
}
