import {expect,it} from 'vitest';
import {createGame,generateTurns} from '../src/lib/engine';
import {loadDenseModel} from '../src/lib/bot/dense-model';
import {createModelPolicy} from '../src/lib/bot/model-policy';
import {createSeededRandom} from '../src/lib/bot/seeded';
import {replayPlan} from '../src/lib/bot/replay';
import {makeArtifact} from './helpers/model-artifact.mjs';
import {botFixtures,mirrored,turnFixture} from './helpers/bot-fixtures';

async function policyForFeature(feature?:number){
  const weights=new Float32Array(30081);
  if(feature!==undefined){weights[feature]=1;weights[13440]=1;weights[29952]=1;}
  const {bytes,manifest}=makeArtifact(weights);
  return createModelPolicy(await loadDenseModel(manifest,bytes),manifest.sha256);
}
const random=()=>createSeededRandom('model-policy','action');
it('negates handover value instead of maximizing the opponent prediction',async()=>{
  const policy=await policyForFeature(97),input={...turnFixture([[0,1,0],[1,1,0],[12,0,15]],[13,0],[1]),score:[0,0] as [number,number]};
  expect(generateTurns(input)).toHaveLength(2);
  expect(policy.choose(input,random()).moves).toEqual([{from:1,to:0,die:1}]);
  expect(policy.choose({...mirrored(input),score:[0,0]},random()).moves).toEqual([{from:22,to:23,die:1}]);
});
it('uses the updated winner-started game score and prefers exact round wins',async()=>{
  const input={...turnFixture([[1,1,0],[0,0,1]],[14,14],[1,2]),score:[0,0] as [number,number]};
  expect((await policyForFeature(100)).choose(input,random()).outcome?.points).toBe(2);
  // Even a model that favors the one-point continuation cannot reject a round win.
  expect((await policyForFeature(99)).choose({...input,score:[1,0]},random()).outcome?.points).toBe(2);
});
it('owns choices, repeats ties in generator order, and leaves the action stream untouched',async()=>{
  const policy=await policyForFeature(),input={...botFixtures.opening(),score:[0,0] as [number,number]},before=structuredClone(input),rng=random();
  const plan=policy.choose(input,rng);
  expect(plan).toEqual(generateTurns(input)[0]);expect(rng.uint32()).toBe(random().uint32());
  plan.position.off[0]=99;expect(policy.choose(input,random())).toEqual(generateTurns(input)[0]);expect(input).toEqual(before);
  expect(policy.id).toMatch(/^nn-greedy-v1\/[0-9a-f]{64}$/);expect(policy.id.length).toBeLessThanOrEqual(80);
});
it('replays model choices through public rules across pins, passes, doubles and both colors',async()=>{
  const policy=await policyForFeature();
  for(const fixture of Object.values(botFixtures))for(const base of [fixture(),mirrored(fixture())]){
    const input={...base,score:[1,0] as [number,number]},plan=policy.choose(input,random());
    expect(replayPlan({...createGame(),...input,phase:'moving'},plan).position).toEqual(plan.position);
  }
});
it('rejects ambiguous digest/model identities before creating a policy',async()=>{
  const {bytes,manifest}=makeArtifact(),model=await loadDenseModel(manifest,bytes);
  for(const hash of ['',manifest.sha256.toUpperCase(),'0'.repeat(64)])expect(()=>createModelPolicy(model,hash)).toThrow();
});
