import { createHash } from 'node:crypto';
import { other } from '../engine.ts';
import type { Player } from '../engine';
import { createSeededRandom } from './seeded.ts';
import { simulateRound, strategyPolicy } from './simulation.ts';
import type { BotPolicy, RoundResult } from './simulation';
import type { PreRollState } from './types';

export type SelfPlayRound = {
  format:'mahbusa-self-play-round'; version:1; index:number; result:RoundResult;
  examples:{state:PreRollState;target:-1|1}[];
};
/** Outcome-labelled pre-roll positions. This generates data; it does not train a model. */
export function generateSelfPlayRound(options:{seed:string;index:number;maxTurns?:number;policy?:BotPolicy}):SelfPlayRound {
  const {seed,index,maxTurns}=options,policy=options.policy??strategyPolicy;
  createSeededRandom(seed,'validate');
  if(!Number.isSafeInteger(index)||index<0)throw new Error('Invalid self-play round index.');
  const roundSeed=createHash('sha256').update(JSON.stringify(['self-play-v1',seed,index])).digest('hex');
  const states:PreRollState[]=[];
  const result=simulateRound({seed:roundSeed,aColor:(index%2) as Player,policies:[policy,policy],maxTurns,onPreRoll:s=>states.push(s)});
  const winnerColor=result.winner===0?result.aColor:other(result.aColor);
  return {format:'mahbusa-self-play-round',version:1,index,result,
    examples:result.status==='complete'?states.map(state=>({state,target:state.active===winnerColor?1:-1})):[]};
}
