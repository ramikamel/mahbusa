import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { endTurn, generateTurns, nextGame, openingRoll, other, roll as rollGame, startGame, startRound } from '../engine.ts';
import type { Pair, Player } from '../engine';
import type { PreRollState, TurnInput, TurnPlan } from './types';
import { rankStrategyTurns } from './rank-strategy.ts';
import { createSeededRandom } from './seeded.ts';
import type { SeededRandom } from './seeded';
export {RULES_VERSION} from './versions.ts';
export type BotPolicy = { id: string; choose(input: TurnInput & {score: Pair}, random: SeededRandom): TurnPlan };
export const firstPolicy: BotPolicy = {id:'first-legal-v1',choose:input=>generateTurns(input)[0]};
export const randomPolicy: BotPolicy = {id:'random-legal-v1',choose(input,random){
  const plans=generateTurns(input);return plans[random.int(plans.length)];
}};
export const strategyPolicy: BotPolicy = {id:'strategy-v1-greedy',choose:input=>rankStrategyTurns(input)[0].plan};
export type RoundResult = {
  seed:string; aColor:Player; policies:[string,string]; status:'complete'|'turn-limit';
  winner:Player|null; score:Pair; turns:number; games:number; passes:number;
  motherLosses:Pair; diceHash:string; traceHash:string;
  timing:{decisionMs:Pair;maxDecisionMs:Pair};
};
export type RoundOptions = { seed:string; aColor:Player; policies:[BotPolicy,BotPolicy]; maxTurns?:number; onPreRoll?:(state:PreRollState)=>void; onTurn?:(input:TurnInput & {score:Pair})=>void };

import { replayPlan } from './replay.ts';
export { replayPlan } from './replay.ts';

export function simulateRound(options:RoundOptions):RoundResult {
  const {seed,aColor,policies}=options,maxTurns=options.maxTurns??2000;
  if(aColor!==0 && aColor!==1)throw new Error('Invalid entrant color.');
  if(!Number.isInteger(maxTurns)||maxTurns<1||maxTurns>100000)throw new Error('Invalid turn limit.');
  if(policies.length!==2||policies.some(p=>!p.id||p.id.length>80||typeof p.choose!=='function'))throw new Error('Invalid policies.');
  const dice=createSeededRandom(seed,'dice'),actions=[createSeededRandom(seed,'action:a'),createSeededRandom(seed,'action:b')];
  const diceTrace=createHash('sha256'),trace=createHash('sha256');
  function roll():Pair{const pair:Pair=[dice.int(6)+1,dice.int(6)+1];diceTrace.update(JSON.stringify(pair));return pair;}
  let game=startRound(),turns=0,games=0,passes=0;
  const motherLosses:Pair=[0,0],decisionMs:Pair=[0,0],maxDecisionMs:Pair=[0,0];
  // Opening ties must use the same rules as the UI. Bound only pathological streams.
  for(let contests=0;game.phase==='opening';contests++){
    if(contests>=1000)throw new Error('Opening contest limit exceeded.');
    const pair=roll();game=openingRoll(openingRoll(game,0,pair[0]),1,pair[1]);
  }
  function observe(){
    options.onPreRoll?.({position:structuredClone(game.position),active:game.active,score:[...game.score] as Pair});
  }
  observe();
  game=startGame(game,roll());
  const role=(color:Player):Player=>color===aColor?0:1;
  while(turns<maxTurns){
    const actor=role(game.active);
    const input={position:structuredClone(game.position),active:game.active,score:[...game.score] as Pair,remaining:[...game.remaining]};
    options.onTurn?.(structuredClone(input));
    const started=performance.now(),plan=policies[actor].choose(input,actions[actor]);
    const elapsed=performance.now()-started;decisionMs[actor]+=elapsed;maxDecisionMs[actor]=Math.max(maxDecisionMs[actor],elapsed);
    game=replayPlan(game,plan);turns++;
    trace.update(JSON.stringify([game.active,game.score,game.position,game.remaining,plan.moves,game.outcome]));
    if(!plan.moves.length)passes++;
    if(game.outcome){games++;if(game.outcome.reason==='mother')motherLosses[other(role(game.outcome.winner))]++;}
    if(game.phase==='roundOver'||turns===maxTurns)break;
    game=game.phase==='gameOver'?nextGame(game):endTurn(game);
    observe();
    game=rollGame(game,roll());
  }
  const complete=game.phase==='roundOver';
  return {seed,aColor,policies:[policies[0].id,policies[1].id],status:complete?'complete':'turn-limit',
    winner:complete?role(game.outcome!.winner):null,score:[game.score[aColor],game.score[other(aColor)]],
    turns,games,passes,motherLosses,diceHash:diceTrace.digest('hex'),traceHash:trace.digest('hex'),
    timing:{decisionMs,maxDecisionMs}};
}
