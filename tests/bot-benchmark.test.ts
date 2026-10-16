import { describe, expect, it } from 'vitest';
import { runBenchmark, summarizePairs } from '../src/lib/bot/benchmark';
import { firstPolicy } from '../src/lib/bot/simulation';
import type { RoundResult } from '../src/lib/bot/simulation';
function round(aColor:0|1,winner:0|1|null):RoundResult{return{
  seed:'pair',aColor,policies:['a','b'],status:winner===null?'turn-limit':'complete',winner,
  score:winner===0?[3,1]:winner===1?[1,3]:[1,1],turns:20,games:2,passes:1,motherLosses:[0,1],
  diceHash:'d',traceHash:'t',timing:{decisionMs:[1,2],maxDecisionMs:[.5,.7]},
};}
describe('paired benchmark metrics',()=>{
  it('uses equal pair weights, sums diagnostics, and gives a bounded conservative interval',()=>{
    const pairs:[RoundResult,RoundResult][]=Array.from({length:100},(_,i)=>[round(0,0),round(1,i<50?0:1)]);
    const metrics=summarizePairs(pairs);
    expect(metrics).toMatchObject({completedRounds:200,truncatedRounds:0,roundsWon:[150,50],points:[500,300],motherLosses:[0,200],winRateA:.75,totalTurns:4000});
    const margin=Math.sqrt(Math.log(40)/200);
    expect(metrics.interval95A?.[0]).toBeCloseTo(.75-margin,12);
    expect(metrics.interval95A?.[1]).toBeCloseTo(.75+margin,12);
  });
  it('suppresses strength statistics if any round was truncated',()=>{
    const metrics=summarizePairs([[round(0,0),round(1,null)]]);
    expect(metrics).toMatchObject({completedRounds:1,truncatedRounds:1,winRateA:null,interval95A:null});
  });
  it('rejects mismatched color/seed/policy pairs',()=>{
    expect(()=>summarizePairs([[round(0,0),round(0,1)]])).toThrow();
    expect(()=>summarizePairs([[round(0,0),{...round(1,1),seed:'different'}]])).toThrow();
    expect(()=>summarizePairs([[round(0,0),{...round(1,1),policies:['x','y']}]])).toThrow();
  });
  it('runs repeatable color-swapped pairs, excluding clocks from determinism claims',()=>{
    const options={seed:'paired-smoke',pairs:2,maxTurns:2000,policies:[firstPolicy,firstPolicy] as [typeof firstPolicy,typeof firstPolicy]};
    const a=runBenchmark(options),b=runBenchmark(options);
    expect(a.metrics.winRateA).toBe(.5);
    expect(a.results.map(pair=>pair.map(r=>[r.aColor,r.seed,r.winner,r.diceHash,r.traceHash])))
      .toEqual(b.results.map(pair=>pair.map(r=>[r.aColor,r.seed,r.winner,r.diceHash,r.traceHash])));
    expect(a.results.every(p=>p[0].seed===p[1].seed && p[0].aColor===0 && p[1].aColor===1)).toBe(true);
    expect(new Set(a.results.map(p=>p[0].seed)).size).toBe(2);
  });
  it('rejects invalid counts and accepts a full-length root seed',()=>{
    for(const pairs of [0,501,.1])expect(()=>runBenchmark({seed:'x',pairs,policies:[firstPolicy,firstPolicy]})).toThrow();
    expect(runBenchmark({seed:'x'.repeat(256),pairs:1,maxTurns:1,policies:[firstPolicy,firstPolicy]}).metrics.winRateA).toBeNull();
  });
});
