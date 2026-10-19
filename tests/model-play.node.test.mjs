import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {sha,writeArtifact} from './helpers/model-artifact.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const run=(script,args)=>spawnSync(process.execPath,[join(root,'scripts',script),...args],{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024});
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),'mahbusa-model-play-'));try{const model=join(dir,'model'),artifact=await writeArtifact(model);await fn({dir,model,...artifact});}finally{await rm(dir,{recursive:true,force:true});}}
test('benchmark puts checked models on the selected entrant and records full hashes',async()=>fixture(async({dir,model,manifest})=>{
  const id='nn-greedy-v1/'+manifest.sha256;
  for(const role of ['a','b']){
    const args=['--pairs','1','--max-turns','1','--'+role,'model','--'+role+'-model',model];
    const result=run('benchmark-bot.mjs',args);assert.equal(result.status,2,result.stderr);
    const report=JSON.parse(result.stdout),index=role==='a'?0:1;
    assert.equal(report.policies[index],id);assert.equal(report.policies[1-index],'strategy-v1-greedy');
    assert.equal(report.modelArtifacts[index].weightsSha256,manifest.sha256);assert.equal(report.modelArtifacts[1-index],null);
    assert.equal(report.metrics.winRateA,null);assert.equal(report.metrics.truncatedRounds,2);
    assert.deepEqual(report.results[0].map(r=>r.aColor),[0,1]);
    const repeat=JSON.parse(run('benchmark-bot.mjs',args).stdout);
    assert.deepEqual(report.results[0].map(r=>r.traceHash),repeat.results[0].map(r=>r.traceHash));
  }
  const other=join(dir,'other'),weights=new Float32Array(30081);weights[30080]=1;
  const second=await writeArtifact(other,{weights,probes:[{features:Array(104).fill(0),value:2/(1+Math.exp(-1))-1}]});
  const result=run('benchmark-bot.mjs',['--pairs','1','--max-turns','1','--a','model','--a-model',model,'--b','model','--b-model',other]);
  assert.equal(result.status,2,result.stderr);const report=JSON.parse(result.stdout);
  assert.deepEqual(report.policies,[id,'nn-greedy-v1/'+second.manifest.sha256]);assert.equal(report.samePolicy,false);
  assert.deepEqual(report.modelArtifacts.map(m=>m.weightsSha256),[manifest.sha256,second.manifest.sha256]);
}));
test('same frozen model completes paired mirrors with complementary results',async()=>fixture(async({model})=>{
  const result=run('benchmark-bot.mjs',['--seed','model-mirror-smoke','--pairs','1','--a','model','--a-model',model,'--b','model','--b-model',model]);
  assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);
  assert.equal(report.samePolicy,true);assert.equal(report.comparison,'self-play');assert.deepEqual(report.metrics.roundsWon,[1,1]);
  assert.equal(report.metrics.winRateA,.5);assert.equal(report.metrics.truncatedRounds,0);
}));
test('model self-play labels completed rounds and produces valid round-separated shards',async()=>fixture(async({dir,model,manifest})=>{
  const out=join(dir,'dataset'),result=run('self-play-bot.mjs',['--seed','prep-fixture','--rounds','6','--policy','model','--model',model,'--out',out]);
  assert.equal(result.status,0,result.stderr);
  const saved=JSON.parse(await readFile(join(out,'manifest.json'),'utf8')),data=await readFile(join(out,'rounds.jsonl'));
  assert.deepEqual(JSON.parse(result.stdout),saved);assert.equal(saved.policy,'nn-greedy-v1/'+manifest.sha256);
  assert.equal(saved.modelArtifact.weightsSha256,manifest.sha256);assert.equal(saved.dataset.sha256,sha(data));
  assert.equal(saved.completedRounds,6);
  const rounds=data.toString().trim().split('\n').map(JSON.parse);
  assert.equal(rounds.length,6);
  for(const round of rounds){
    assert.deepEqual(round.result.policies,[saved.policy,saved.policy]);
    const winnerColor=round.result.winner===0?round.result.aColor:1-round.result.aColor;
    assert.equal(round.result.status,'complete');assert.equal(round.examples.length,round.result.turns);
    for(const example of round.examples)assert.equal(example.target,example.state.active===winnerColor?1:-1);
  }
  const prepared=run('prepare-training.mjs',['--dataset',out,'--out',join(dir,'prepared'),'--seed','fixture-split']);
  assert.equal(prepared.status,0,prepared.stderr);
  const p=JSON.parse(prepared.stdout);assert.equal(p.status,'complete');assert.equal(p.sourceDataset.modelArtifact.weightsSha256,manifest.sha256);
  assert.deepEqual(p.rounds.filter(r=>r.split==='validation').map(r=>r.index),[4,5]);
}));
test('model cutoffs never generate outcome targets',async()=>fixture(async({dir,model})=>{
  const out=join(dir,'cutoff'),result=run('self-play-bot.mjs',['--rounds','1','--max-turns','1','--policy','model','--model',model,'--out',out]);
  assert.equal(result.status,2,result.stderr);const m=JSON.parse(result.stdout);assert.equal(m.status,'incomplete');assert.equal(m.examples,0);
  assert.equal((await readFile(join(out,'rounds.jsonl'))).length,0);
}));
test('invalid model flags and artifacts fail before writing benchmark or self-play output',async()=>fixture(async({dir,model})=>{
  const out=join(dir,'never-created');
  for(const args of [['--a','model'],['--b','model'],['--a-model',model],['--b-model',model],['--a','model','--a-model',model+'-missing']]){
    assert.equal(run('benchmark-bot.mjs',[...args,'--pairs','1','--out',out]).status,1);await assert.rejects(access(out));
  }
  for(const args of [['--policy','model'],['--model',model],['--policy','search','--model',model],['--policy','model','--model',model+'-missing']]){
    assert.equal(run('self-play-bot.mjs',[...args,'--rounds','1','--out',out]).status,1);await assert.rejects(access(out));
  }
  const parity=JSON.parse(await readFile(join(model,'parity.json'),'utf8'));parity.probes[0].value=.5;
  await writeFile(join(model,'parity.json'),JSON.stringify(parity));
  for(const [script,args] of [['benchmark-bot.mjs',['--pairs','1','--a','model','--a-model',model]],['self-play-bot.mjs',['--rounds','1','--policy','model','--model',model]]]){
    const result=run(script,[...args,'--out',out]);assert.equal(result.status,1);assert.match(result.stderr,/parity/i);await assert.rejects(access(out));
  }
}));
