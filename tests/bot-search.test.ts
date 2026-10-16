import {describe,expect,it} from 'vitest';
import * as E from '../src/lib/engine';
import {continuationAfterTurn} from '../src/lib/bot/continuation';
import {searchTurns,DICE_OUTCOMES} from '../src/lib/bot/search';
import type {SearchOptions,SearchUpdate} from '../src/lib/bot/search';
import {rankStrategyTurns} from '../src/lib/bot/rank-strategy';
import {strategyEvaluator} from '../src/lib/bot/strategy';
import type {PositionEvaluator} from '../src/lib/bot/types';
import {botFixtures,mirrored,turnFixture} from './helpers/bot-fixtures';
import {searchOracle} from './helpers/search-oracle';

const zero:PositionEvaluator={id:'zero',evaluate:()=>({kind:'heuristic',value:0})};
const pinRace=()=>({...turnFixture([[20,1,1,1]],[14,14],[1,2]),score:[2,2] as E.Pair});
const race=()=>({...turnFixture([[4,2,0],[19,0,2]],[13,13],[1,2]),score:[1,1] as E.Pair});
const stable=(r:ReturnType<typeof searchTurns>)=>({...r,stats:{...r.stats,elapsedMs:0}});

describe('shared whole-turn continuation',()=>{
  it.each(Object.entries(botFixtures))('matches public handover/reset/round rules for %s',(_,fixture)=>{
    const input={...fixture(),score:[1,2] as E.Pair};
    for(const plan of E.generateTurns(input)){
      let game:E.Game={...E.createGame(),...structuredClone(input),phase:'moving'};
      for(const move of plan.moves)game=E.applyMove(game,move);
      const result=continuationAfterTurn(input,plan);
      if(game.phase==='roundOver')expect(result).toEqual({kind:'round-win',state:null,winner:game.outcome!.winner});
      else{
        const next=game.phase==='gameOver'?E.nextGame(game):E.endTurn(game);
        expect(result).toEqual({kind:game.phase==='gameOver'?'next-game':'handover',winner:null,
          state:{position:next.position,active:next.active,score:next.score}});
      }
    }
  });
});
describe('dice-aware complete-turn search',()=>{
  it('represents all ordered roll mass with legal doubles expansion',()=>{
    expect(DICE_OUTCOMES).toHaveLength(21);
    expect(DICE_OUTCOMES.reduce((n,r)=>n+r.weight,0)).toBe(36);
    expect(new Set(DICE_OUTCOMES.map(r=>r.dice.join(','))).size).toBe(21);
    for(const r of DICE_OUTCOMES){
      expect(r.weight).toBe(r.dice.length===4?1:2);
      expect(r.dice.length===4?new Set(r.dice).size===1:r.dice[0]<r.dice[1]).toBe(true);
    }
  });
  it.each([0,1] as const)('weights immediate opponent wins, forced passes and deeper recoveries for color %i',active=>{
    const input=active===0?pinRace():{...mirrored(pinRace()),score:[2,2] as E.Pair};
    const shallow=searchTurns(input,{maxDepth:1,maxNodes:10000,evaluator:zero});
    // Dark bears its only checker off on every ordered roll except1,2 and2,1.
    expect(shallow.value.value).toBeCloseTo(-17/18,13);
    expect(shallow.stats.completedDepth).toBe(1);expect(shallow.plan.moves).toEqual([]);
    const deeper=searchTurns(input,{maxDepth:2,maxNodes:10000,evaluator:zero});
    // After Dark misses, Light can win its next turn only with double6.
    expect(deeper.value.value).toBeCloseTo(-611/648,13);
    expect(deeper.stats.completedDepth).toBe(2);
  });
  it.each([0,1] as const)('matches independent public-engine36-roll max/min oracle for color %i',active=>{
    const input=active===0?race():{...mirrored(race()),score:[1,1] as E.Pair};
    const result=searchTurns(input,{maxDepth:1,maxNodes:100000});
    expect(result.stats.completedDepth).toBe(1);
    expect(result.value.value).toBeCloseTo(searchOracle(input,1,strategyEvaluator),12);
    let game:E.Game={...E.createGame(),...structuredClone(input),phase:'moving'};
    for(const move of result.plan.moves)game=E.applyMove(game,move);
    expect(game.position).toEqual(result.plan.position);expect(E.availableMoves(game)).toEqual([]);
  });
  it('scores a game once and retains winner perspective when the next game starts',()=>{
    const input={...botFixtures.bearOff(),score:[1,0] as E.Pair};
    const evaluator:PositionEvaluator={id:'score',evaluate:s=>({kind:'heuristic',value:(s.score[s.active]-s.score[E.other(s.active)])/3})};
    const result=searchTurns(input,{maxDepth:1,maxNodes:10000,evaluator});
    expect(result.value.value).toBeCloseTo(2/3,13);
    expect(result.value.value).toBeCloseTo(searchOracle(input,1,evaluator),13);
  });
  it('separates otherwise identical next-game boards with different awards in its cache',()=>{
    const input={...turnFixture([[1,1,0],[0,0,1]],[14,14],[1,2]),score:[0,0] as E.Pair};
    const evaluator:PositionEvaluator={id:'score',evaluate:s=>({kind:'heuristic',value:(s.score[s.active]-s.score[E.other(s.active)])/3})};
    const result=searchTurns(input,{maxDepth:1,maxNodes:10000,evaluator});
    expect(result.plan.outcome?.points).toBe(2);
    expect(result.value.value).toBeCloseTo(2/3,13);
    expect(result.value.value).toBeCloseTo(searchOracle(input,1,evaluator),13);
  });
  it('returns an immediate round win without speculative work',()=>{
    const input={...botFixtures.motherCapture(),score:[1,2] as E.Pair};
    const result=searchTurns(input,{maxDepth:4,maxNodes:1});
    expect(result.stopReason).toBe('round-win');expect(result.value).toEqual({kind:'round-win-expectation',value:1});
    expect(result.plan.outcome?.reason).toBe('mother');expect(result.stats.nodes).toBe(0);
  });
  it.each(Object.entries(botFixtures))('depth0 retains frozen greedy behavior for %s',(_,fixture)=>{
    const input={...fixture(),score:[0,0] as E.Pair};
    const result=searchTurns(input,{maxDepth:0});
    expect(result.plan).toEqual(rankStrategyTurns(input)[0].plan);
    expect(result.value.value).toBeCloseTo(rankStrategyTurns(input)[0].value.value,13);
  });
});
describe('bounded completed-depth publication',()=>{
  it('does not publish a partly evaluated root iteration',()=>{
    const input=race(),updates:SearchUpdate[]=[];
    const complete=searchTurns(input,{maxDepth:1,maxNodes:100000,cacheEntries:0});
    const limited=searchTurns(input,{maxDepth:1,maxNodes:complete.stats.nodes-1,cacheEntries:0,onUpdate:u=>updates.push(u)});
    expect(limited.stopReason).toBe('nodes');expect(limited.stats.completedDepth).toBe(0);
    expect(limited.plan).toEqual(searchTurns(input,{maxDepth:0}).plan);
    expect(updates.map(u=>u.stats.completedDepth)).toEqual([0]);
    expect(limited.stats.nodes).toBe(complete.stats.nodes-1);
  });
  it('keeps the last complete depth when a deeper iteration is cut short',()=>{
    const input=pinRace();let clock=0;const updates:SearchUpdate[]=[];
    const result=searchTurns(input,{maxDepth:3,budgetMs:10,now:()=>clock,evaluator:zero,onUpdate:u=>{
      updates.push(u);if(u.stats.completedDepth===1)clock=11;
    }});
    expect(result.stopReason).toBe('time');expect(result.stats.completedDepth).toBe(1);
    expect(result.value.value).toBeCloseTo(-17/18,13);expect(updates.map(u=>u.stats.completedDepth)).toEqual([0,1]);
  });
  it('always establishes its legal baseline even if that mandatory work exceeds time',()=>{
    let clock=0;
    const result=searchTurns(race(),{budgetMs:1,now:()=>clock,onUpdate:()=>{clock=100;}});
    expect(result.stopReason).toBe('time');expect(result.stats.completedDepth).toBe(0);
    expect(result.plan).toEqual(rankStrategyTurns(race())[0].plan);
  });
  it('caches only within the call, respects capacity, and agrees with uncached values',()=>{
    const input=pinRace(),options={maxDepth:2,maxNodes:100000,evaluator:zero};
    const off=searchTurns(input,{...options,cacheEntries:0}),on=searchTurns(input,{...options,cacheEntries:1000});
    expect(on.plan).toEqual(off.plan);expect(on.value).toEqual(off.value);
    expect(on.stats.cacheHits).toBeGreaterThan(0);expect(off.stats.cacheHits).toBe(0);
    expect(searchTurns(input,{...options,cacheEntries:2}).stats.cacheSize).toBeLessThanOrEqual(2);
    expect(stable(on)).toEqual(stable(searchTurns(input,{...options,cacheEntries:1000})));
    // Calls with different score/active/top/off cannot inherit previous entries.
    for(const state of [race(),{...race(),score:[0,2] as E.Pair},{...mirrored(race()),score:[1,1] as E.Pair}]){
      expect(searchTurns(state,{maxDepth:1,maxNodes:100000}).value.value).toBeCloseTo(searchOracle(state,1,strategyEvaluator),12);
    }
  });
  it('isolates evaluator and progress mutation from caller, subsequent updates and final result',()=>{
    const input=race(),before=structuredClone(input),baseline=searchTurns(input,{maxDepth:1,maxNodes:100000,evaluator:zero});
    const evaluator:PositionEvaluator={id:'mutator',evaluate:s=>{
      s.score[0]=99;s.position.off[0]=99;s.position.points[0].count[0]=99;return {kind:'heuristic',value:0};
    }};
    const result=searchTurns(input,{maxDepth:1,maxNodes:100000,evaluator,onUpdate:u=>{
      u.plan.position.off[0]=88;u.plan.moves.splice(0);u.value.value=99;u.stats.completedDepth=99;
    }});
    expect(stable(result)).toEqual(stable(baseline));expect(input).toEqual(before);
    result.plan.position.off[0]=77;expect(input).toEqual(before);
  });
  it('rejects invalid controls, scores, evaluator values and callback failures',()=>{
    const bad:SearchOptions[]=[{maxDepth:-1},{maxDepth:5},{maxDepth:.5},{maxNodes:0},{maxNodes:Infinity},{cacheEntries:-1},{cacheEntries:50001},{budgetMs:0},{budgetMs:Infinity},{budgetMs:60001}];
    for(const options of bad)expect(()=>searchTurns(race(),options)).toThrow();
    expect(()=>searchTurns({...race(),score:[3,0]})).toThrow(/score/);
    for(const value of [NaN,Infinity,-1.1,1.1])expect(()=>searchTurns(race(),{evaluator:{id:'bad',evaluate:()=>({kind:'heuristic',value})}})).toThrow(/value/);
    expect(()=>searchTurns(race(),{onUpdate:()=>{throw Error('observer');}})).toThrow(/observer/);
  });
});
