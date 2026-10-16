import {expect,it} from 'vitest';
import {createGame} from '../src/lib/engine';
import {createSearchPolicy} from '../src/lib/bot/search-policy';
import {createSeededRandom} from '../src/lib/bot/seeded';
import {replayPlan,strategyPolicy} from '../src/lib/bot/simulation';
import {botFixtures} from './helpers/bot-fixtures';

it('repeats checked legal plans without consuming or depending on action randomness',()=>{
  const policy=createSearchPolicy(),input={...botFixtures.opening(),score:[0,0] as [number,number]};
  const random=createSeededRandom('policy-test','action'),untouched=createSeededRandom('policy-test','action');
  const plan=policy.choose(input,random);
  expect(policy.choose(input,createSeededRandom('different','action'))).toEqual(plan);
  expect(random.uint32()).toBe(untouched.uint32());
  expect(replayPlan({...createGame(),...input,phase:'moving'},plan).position).toEqual(plan.position);
  expect(policy.id).not.toBe(strategyPolicy.id);expect(policy.id.length).toBeLessThanOrEqual(80);
});
it('freezes effective search configuration in unique policy identities and validates limits early',()=>{
  const a=createSearchPolicy(),b=createSearchPolicy({maxDepth:1,maxNodes:1000,cacheEntries:10000});
  expect(a.id).toBe(b.id);
  expect(new Set([a.id,createSearchPolicy({maxDepth:2}).id,createSearchPolicy({maxNodes:2000}).id,createSearchPolicy({cacheEntries:0}).id]).size).toBe(4);
  for(const options of [{maxDepth:-1},{maxDepth:5},{maxNodes:0},{maxNodes:Infinity},{cacheEntries:50001}])expect(()=>createSearchPolicy(options)).toThrow();
});
