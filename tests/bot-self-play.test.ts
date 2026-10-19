import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { initialPosition, other } from '../src/lib/engine';
import type { PreRollState } from '../src/lib/bot/types';
import { firstPolicy, simulateRound, strategyPolicy } from '../src/lib/bot/simulation';
import type { BotPolicy, RoundResult } from '../src/lib/bot/simulation';
import { generateSelfPlayRound } from '../src/lib/bot/self-play';

const stable = ({timing, ...result}:RoundResult) => result;
it('mixed policies keep entrant color mapping and completed-round outcome labels',()=>{
  for(const index of [0,1]){
    const round=generateSelfPlayRound({seed:'mixed-fixture',index,policies:[firstPolicy,strategyPolicy]});
    expect(round.result.status).toBe('complete');expect(round.result.policies).toEqual([firstPolicy.id,strategyPolicy.id]);
    const color=round.result.winner===0?index%2:1-index%2;
    expect(round.examples.length).toBe(round.result.turns);
    for(const example of round.examples)expect(example.target).toBe(example.state.active===color?1:-1);
  }
  expect(()=>generateSelfPlayRound({seed:'x',index:0,policy:firstPolicy,policies:[firstPolicy,strategyPolicy]})).toThrow();
});
describe('owned pre-roll observations', () => {
  it('observes every real turn before dice, including winner-started fresh games', () => {
    const states:PreRollState[]=[];
    const policy:BotPolicy={id:firstPolicy.id,choose(input,random){
      expect(states.at(-1)).toEqual({position:input.position,active:input.active,score:input.score});
      return firstPolicy.choose(input,random);
    }};
    const result=simulateRound({seed:'round-test-v1',aColor:0,policies:[policy,policy],onPreRoll:s=>states.push(s)});
    expect(states).toHaveLength(result.turns);
    expect(states[0].position).toEqual(initialPosition());
    expect(states[0].score).toEqual([0,0]);
    expect(states.every(s=>Object.keys(s).sort().join(',')==='active,position,score' && Math.max(...s.score)<3)).toBe(true);
    const resets=states.filter((s,i)=>i>0 && JSON.stringify(s.score)!==JSON.stringify(states[i-1].score));
    expect(resets).toHaveLength(result.games-1);
    expect(resets.length).toBeGreaterThan(0);
    for(const s of resets){
      const previous=states[states.indexOf(s)-1];
      expect(s.position).toEqual(initialPosition());
      expect(s.score[s.active]).toBeGreaterThan(previous.score[s.active]);
    }
    expect(result).toMatchObject({diceHash:'59dc4b3216677f367b6aaa987897cbb24d3aa6476c3ee4a0b9d1c4eabc7d5417',traceHash:'7c39c6d809d2151b70e277ddba39cc92a8469226524fd8a17e2ad42e927bf293'});
  });
  it('does not let observer mutation change game, randomness or earlier samples', () => {
    const options={seed:'isolation',aColor:0 as const,policies:[firstPolicy,firstPolicy] as [BotPolicy,BotPolicy],maxTurns:12};
    const baseline=simulateRound(options),seen:PreRollState[]=[];
    const observed=simulateRound({...options,onPreRoll:s=>{
      expect(s.position.off).toEqual([0,0]);
      seen.push(s);s.position.off[0]=99;s.position.points[0].count[1]=99;s.score[0]=99;s.active=other(s.active);
    }});
    expect(stable(observed)).toEqual(stable(baseline));
    expect(new Set(seen.map(s=>s.position))).toHaveProperty('size',12);
  });
});
describe('automatic self-play outcome data', () => {
  it.each([0,1])('labels completed round %i from each active color and repeats without future dice', index => {
    const options={seed:'training-test',index,policy:firstPolicy};
    const round=generateSelfPlayRound(options),repeat=generateSelfPlayRound(options);
    expect(round).toMatchObject({format:'mahbusa-self-play-round',version:1,index,result:{status:'complete',aColor:index}});
    expect(round.result.seed).toBe(createHash('sha256').update(JSON.stringify(['self-play-v1',options.seed,index])).digest('hex'));
    expect(round.examples).toHaveLength(round.result.turns);
    const winnerColor=round.result.winner===0?round.result.aColor:other(round.result.aColor);
    expect(new Set(round.examples.map(e=>e.state.active)).size).toBe(2);
    for(const example of round.examples){
      expect(example.target).toBe(example.state.active===winnerColor?1:-1);
      expect(Object.keys(example.state).sort()).toEqual(['active','position','score']);
      expect(Math.max(...example.state.score)).toBeLessThan(3);
    }
    expect(stable(round.result)).toEqual(stable(repeat.result));
    expect(round.examples).toEqual(repeat.examples);
    round.examples[0].state.position.off[0]=999;
    expect(repeat.examples[0].state.position.off[0]).toBe(0);
  });
  it('uses the strongest existing policy on both sides by default, and never labels cutoffs', () => {
    const round=generateSelfPlayRound({seed:'cutoff',index:2,maxTurns:1});
    expect(round.result).toMatchObject({status:'turn-limit',winner:null,policies:[strategyPolicy.id,strategyPolicy.id]});
    expect(round.examples).toEqual([]);
  });
  it('rejects invalid seed/index instead of creating ambiguous shards', () => {
    for(const index of [-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) expect(()=>generateSelfPlayRound({seed:'x',index,maxTurns:1})).toThrow();
    for(const seed of ['', 'x'.repeat(257)]) expect(()=>generateSelfPlayRound({seed,index:0,maxTurns:1})).toThrow();
  });
});
