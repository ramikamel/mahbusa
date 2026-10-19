import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadModelArtifact} from '../scripts/lib/model-artifact.mjs';
import {resolvePolicy} from '../scripts/lib/resolve-policy.mjs';
import {sha,writeArtifact} from './helpers/model-artifact.mjs';
async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'mahbusa-model-loader-'));try{const dir=join(root,'model'),artifact=await writeArtifact(dir);await fn({dir,root,...artifact});}finally{await rm(root,{recursive:true,force:true});}}
test('loaded policy owns checked weights and hashes the exact consumed model files',async()=>fixture(async({dir,manifest,files})=>{
  const loaded=await loadModelArtifact(dir),resolved=await resolvePolicy('model',dir);
  assert.equal(loaded.model.predict(new Float32Array(104)),0);
  assert.equal(resolved.policy.id,'nn-greedy-v1/'+manifest.sha256);
  assert.deepEqual(resolved.modelArtifact,loaded.provenance);
  assert.equal(loaded.provenance.weightsSha256,sha(files['weights.bin']));
  assert.equal(loaded.provenance.manifestSha256,sha(files['model.json']));
  assert.equal(loaded.provenance.trainingReportSha256,sha(files['training.json']));
  assert.equal(loaded.provenance.paritySha256,sha(files['parity.json']));
  assert.equal(loaded.parityResult.status,'passed');assert.equal(loaded.parityResult.count,2);
  await writeFile(join(dir,'weights.bin'),Buffer.alloc(4));
  assert.equal(loaded.model.predict(new Float32Array(104)),0);
  await assert.rejects(loadModelArtifact(dir));
}));
test('model gate refuses unfinished, mismatched, corrupt and parity-failing exports',async()=>{
  const mutations=[
    async dir=>writeFile(join(dir,'training.json'),JSON.stringify({status:'running'})),
    async dir=>{const t=JSON.parse(await readFile(join(dir,'training.json'),'utf8'));t.modelSha256='0'.repeat(64);await writeFile(join(dir,'training.json'),JSON.stringify(t));},
    async dir=>{const b=await readFile(join(dir,'weights.bin'));b[0]=1;await writeFile(join(dir,'weights.bin'),b);},
    async dir=>{const p=JSON.parse(await readFile(join(dir,'parity.json'),'utf8'));p.tolerance=99;p.probes[0].value=.1;await writeFile(join(dir,'parity.json'),JSON.stringify(p));},
    async dir=>rm(join(dir,'parity.json')),
    async dir=>writeFile(join(dir,'model.json'),'null'),
  ];
  for(const mutate of mutations)await fixture(async({dir})=>{await mutate(dir);await assert.rejects(resolvePolicy('model',dir));});
});
test('resolver requires paths only for model entrants and keeps existing policy identities',async()=>fixture(async({dir})=>{
  for(const [name,want] of [['strategy','strategy-v1-greedy'],['search','expectimax-v1/strategy-v1/d1/n1000/c10000'],['random','random-legal-v1'],['first','first-legal-v1']]){
    const resolved=await resolvePolicy(name);assert.equal(resolved.policy.id,want);assert.equal(resolved.modelArtifact,null);
    await assert.rejects(resolvePolicy(name,dir));
  }
  for(const [name,path] of [['model',undefined],['model',''],['unknown',undefined],['model',dir+'-missing']])await assert.rejects(resolvePolicy(name,path));
}));
