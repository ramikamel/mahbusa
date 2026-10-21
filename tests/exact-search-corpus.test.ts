import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import corpus from './fixtures/exact-search-v1.json';
import * as E from '../src/lib/engine';
import type {TurnInput} from '../src/lib/bot/types';
import {searchTurns} from '../src/lib/bot/search';
import {rankStrategyTurns} from '../src/lib/bot/rank-strategy';
import {replayPlan} from '../src/lib/bot/replay';
import {referenceTurns} from './helpers/reference-turns';

const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const shape=(plans:ReturnType<typeof E.generateTurns>)=>plans.map(p=>JSON.stringify([p.position,p.remaining,p.outcome])).sort();

describe('frozen exact-search development corpus',()=>{
  it.each(corpus.roots)('preserves complete legal turns and frozen search choices: $name',row=>{
    const input=row.input as TurnInput & {score:E.Pair},before=structuredClone(input);
    const turns=E.generateTurns(input);
    expect(turns).toHaveLength(row.expected.turnCount);
    // Includes representative move order, dice, pins, outcomes and board ownership.
    expect(hash(turns)).toBe(row.expected.turnsSha256);
    expect(hash(rankStrategyTurns(input)[0].plan)).toBe(row.expected.greedyPlanSha256);
    for(const plan of turns){
      const result=replayPlan({...E.createGame(),...structuredClone(input),phase:'moving'},plan);
      expect(result.position).toEqual(plan.position);
      expect(result.outcome).toEqual(plan.outcome);
    }
    for(const nodes of [1000,20000] as const){
      const result=searchTurns(input,{maxDepth:1,maxNodes:nodes,cacheEntries:10000});
      const wanted=nodes===1000?row.expected.search1000:row.expected.search20000;
      expect(hash(result.plan)).toBe(wanted.planSha256);
      expect(result.value.kind).toBe(wanted.value.kind);
      expect(result.value.value).toBeCloseTo(wanted.value.value,12);
      expect({...result.stats,elapsedMs:0}).toEqual(wanted.stats);
      expect(result.stopReason).toBe(wanted.stopReason);
    }
    expect(input).toEqual(before);
  },30000);

  it('agrees with independent public-rule enumeration on the real exposing turns',()=>{
    for(const row of corpus.roots.filter(r=>r.name.startsWith('mother-'))){
      const input=row.input as TurnInput & {score:E.Pair};
      expect(shape(E.generateTurns(input))).toEqual(shape(referenceTurns(input)));
    }
  });

  it('keeps all recorded mother-history decisions legal',()=>{
    for(const history of corpus.histories)for(const event of history.events){
      for(const entry of event.decisions){
        const position=E.emptyPosition();position.off=[...entry.input.off] as E.Pair;
        for(const [i,a,b,top] of entry.input.stacks)position.points[i!]={count:[a!,b!],top:top as E.Player};
        const input={position,active:entry.input.active as E.Player,remaining:entry.input.remaining,score:entry.input.score as E.Pair};
        const selected=E.generateTurns(input).find(plan=>JSON.stringify(plan.moves)===JSON.stringify(entry.moves));
        expect(selected).toBeDefined();
        replayPlan({...E.createGame(),...structuredClone(input),phase:'moving'},selected!);
      }
    }
  });
});
