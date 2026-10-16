import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { simulateRound, RULES_VERSION } from './simulation.ts';
import type { BotPolicy, RoundResult } from './simulation';
import { createSeededRandom, RNG_VERSION } from './seeded.ts';
import type { Pair } from '../engine';
export type PairResult = [RoundResult,RoundResult];
export function summarizePairs(results:PairResult[]) {
  const roundsWon:Pair=[0,0],points:Pair=[0,0],motherLosses:Pair=[0,0],decisionMs:Pair=[0,0],maxDecisionMs:Pair=[0,0];
  let completedRounds=0,truncatedRounds=0,totalTurns=0,games=0,passes=0;
  for(const pair of results){
    if(pair.length!==2||pair[0].aColor!==0||pair[1].aColor!==1||pair[0].seed!==pair[1].seed
      ||JSON.stringify(pair[0].policies)!==JSON.stringify(pair[1].policies)
      ||JSON.stringify(pair[0].policies)!==JSON.stringify(results[0][0].policies))throw new Error('Mismatched benchmark pair.');
    for(const round of pair){
      if(round.status==='complete'){
        if(round.winner!==0&&round.winner!==1)throw new Error('Completed round has no winner.');
        roundsWon[round.winner]++;completedRounds++;
      }else{if(round.winner!==null)throw new Error('Truncated round cannot have a winner.');truncatedRounds++;}
      totalTurns+=round.turns;games+=round.games;passes+=round.passes;
      for(const role of [0,1]){
        points[role]+=round.score[role];motherLosses[role]+=round.motherLosses[role];
        decisionMs[role]+=round.timing.decisionMs[role];maxDecisionMs[role]=Math.max(maxDecisionMs[role],round.timing.maxDecisionMs[role]);
      }
    }
  }
  const winRateA=results.length&&!truncatedRounds?roundsWon[0]/(results.length*2):null;
  const margin=results.length?Math.sqrt(Math.log(40)/(2*results.length)):0;
  const interval95A:Pair|null=winRateA===null?null:[Math.max(0,winRateA-margin),Math.min(1,winRateA+margin)];
  return {completedRounds,truncatedRounds,roundsWon,points,motherLosses,winRateA,interval95A,totalTurns,games,passes,timing:{decisionMs,maxDecisionMs}};
}
export type BenchmarkOptions={seed:string;pairs:number;maxTurns?:number;policies:[BotPolicy,BotPolicy];onPair?:(finished:number,result:PairResult)=>void};
export function runBenchmark(options:BenchmarkOptions){
  const {seed,pairs,policies}=options,maxTurns=options.maxTurns??2000;
  createSeededRandom(seed,'validate');
  if(!Number.isInteger(pairs)||pairs<1||pairs>500)throw new Error('Pairs must be an integer from 1 to 500.');
  const started=performance.now(),results:PairResult[]=[];
  for(let i=0;i<pairs;i++){
    const pairSeed=createHash('sha256').update(JSON.stringify([seed,i])).digest('hex');
    const pair:PairResult=[simulateRound({seed:pairSeed,aColor:0,policies,maxTurns}),simulateRound({seed:pairSeed,aColor:1,policies,maxTurns})];
    results.push(pair);
    // Logging receives owned results and cannot alter reported metrics.
    options.onPair?.(i+1,structuredClone(pair));
  }
  return {format:'mahbusa-benchmark',version:1,rngVersion:RNG_VERSION,rulesVersion:RULES_VERSION,seed,pairs,maxTurns,
    samePolicy:policies[0].id===policies[1].id,comparison:policies[0].id===policies[1].id?'self-play':'control',
    policies:[policies[0].id,policies[1].id],results,metrics:summarizePairs(results),timing:{wallMs:performance.now()-started}};
}
