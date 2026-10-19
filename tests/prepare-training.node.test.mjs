import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {generateSelfPlayRound} from '../src/lib/bot/self-play.ts';
import {firstPolicy} from '../src/lib/bot/simulation.ts';
const cli=fileURLToPath(new URL('../scripts/prepare-training.mjs',import.meta.url));
const run=args=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:20000});
const originals=Array.from({length:6},(_,index)=>generateSelfPlayRound({seed:'prep-fixture',index,policy:firstPolicy}));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fixture(fn,mutate=()=>{}){
  const dir=await mkdtemp(join(tmpdir(),'mahbusa-prepare-')),dataset=join(dir,'source'),out=join(dir,'prepared');
  try{
    await mkdir(dataset);const rounds=structuredClone(originals);mutate(rounds);
    const bytes=Buffer.from(rounds.map(r=>JSON.stringify(r)+'\n').join(''));
    const manifest={format:'mahbusa-self-play-dataset',version:1,status:'complete',seed:'prep-fixture',rounds:rounds.length,
      maxTurns:2000,policy:firstPolicy.id,rngVersion:'sha256-counter-v1',rulesVersion:'mahbusa-engine-v1',sourceRevision:'a'.repeat(40),sourceDirty:false,
      attemptedRounds:rounds.length,completedRounds:rounds.length,examples:rounds.reduce((n,r)=>n+r.examples.length,0),incompleteRounds:[],
      dataset:{path:'rounds.jsonl',bytes:bytes.length,sha256:hash(bytes)}};
    await writeFile(join(dataset,'manifest.json'),JSON.stringify(manifest));await writeFile(join(dataset,'rounds.jsonl'),bytes);
    await fn({dataset,out,manifest,rounds});
  }finally{await rm(dir,{recursive:true,force:true});}
}
test('preparation writes checked104-feature records with whole-round stable split and weights',async()=>fixture(async({dataset,out,rounds})=>{
  const args=['--dataset',dataset,'--out',out,'--seed','fixture-split'],result=run(args);assert.equal(result.status,0,result.stderr);
  const m=JSON.parse(result.stdout);assert.equal(m.status,'complete');assert.equal(m.format,'mahbusa-training-data');
  assert.equal(m.inputSize,104);assert.equal(m.recordSize,106);assert.equal(m.endian,'little');assert.equal(m.featureSchemaVersion,'mahbusa-pre-roll-v1');
  assert.deepEqual(m.rounds.filter(r=>r.split==='train').map(r=>r.index),[0,1,2,3]);
  assert.deepEqual(m.rounds.filter(r=>r.split==='validation').map(r=>r.index),[4,5]);
  for(const split of ['train','validation']){
    const b=await readFile(join(out,m[split].path));assert.equal(m[split].sha256,hash(b));assert.equal(m[split].bytes,b.length);
    assert.equal(b.length,m[split].examples*106*4);let offset=0;
    for(const row of m.rounds.filter(r=>r.split===split)){
      const round=rounds[row.index];assert.equal(row.examples,round.examples.length);
      const color=round.result.winner===0?round.result.aColor:1-round.result.aColor;
      for(const {state}of round.examples){
        assert.equal(b.readFloatLE(offset+104*4),state.active===color?1:0);
        assert.equal(b.readFloatLE(offset+105*4),Math.fround(1/round.examples.length));offset+=106*4;
      }
    }
    assert.equal(offset,b.length);
  }
  const first=await readFile(join(out,'train.f32'));
  assert.deepEqual(Array.from({length:4},(_,i)=>first.readFloatLE(i*4)),[0,1,0,1]);
  assert.deepEqual(Array.from({length:4},(_,i)=>first.readFloatLE((92+i)*4)),[1,0,1,0]);
  const second=out+'-repeat';assert.equal(run(['--dataset',dataset,'--out',second,'--seed','fixture-split']).status,0);
  assert.equal(JSON.parse(await readFile(join(second,'manifest.json'),'utf8')).train.sha256,m.train.sha256);
  assert.equal(run(args).status,1);assert.equal(hash(await readFile(join(out,'train.f32'))),m.train.sha256);
}));
test('preparation rejects inconsistent outcome labels even with a recomputed source checksum',async()=>fixture(async({dataset,out})=>{
  const r=run(['--dataset',dataset,'--out',out,'--seed','fixture-split']);assert.equal(r.status,1);
  assert.equal(JSON.parse(await readFile(join(out,'manifest.json'),'utf8')).status,'failed');
},rounds=>{rounds[0].examples[0].target*=-1;}));
test('preparation rejects duplicate round identity instead of leaking it between splits',async()=>fixture(async({dataset,out})=>{
  assert.equal(run(['--dataset',dataset,'--out',out,'--seed','fixture-split']).status,1);
  assert.equal(JSON.parse(await readFile(join(out,'manifest.json'),'utf8')).status,'failed');
},rounds=>{rounds[1]=structuredClone(rounds[0]);}));
test('preparation rejects cutoff rounds and invalid pre-roll data',async()=>{
  for(const mutate of [rounds=>{rounds[0].result.status='turn-limit';},rounds=>{rounds[0].examples[0].state.score=[3,0];}]){
    await fixture(async({dataset,out})=>{assert.equal(run(['--dataset',dataset,'--out',out,'--seed','fixture-split']).status,1);},mutate);
  }
});
test('preparation rejects source corruption, unfinished manifests and missing holdout split',async()=>{
  await fixture(async({dataset,out})=>{
    await writeFile(join(dataset,'rounds.jsonl'),'\n',{flag:'a'});
    assert.equal(run(['--dataset',dataset,'--out',out,'--seed','fixture-split']).status,1);
    assert.equal(JSON.parse(await readFile(join(out,'manifest.json'),'utf8')).status,'failed');
  });
  await fixture(async({dataset,out,manifest})=>{
    await writeFile(join(dataset,'manifest.json'),JSON.stringify({...manifest,status:'running'}));
    assert.equal(run(['--dataset',dataset,'--out',out]).status,1);
  });
  await fixture(async({dataset,out})=>{
    assert.equal(run(['--dataset',dataset,'--out',out,'--seed','fixture-split']).status,1);
    assert.equal(JSON.parse(await readFile(join(out,'manifest.json'),'utf8')).status,'failed');
  },rounds=>rounds.splice(4));
});
test('preparation validates required/duplicate/unknown arguments',()=>{
  assert.equal(run(['--help']).status,0);
  for(const args of [[],['--dataset','x'],['--out','x'],['--wat','x'],['--dataset','x','--dataset','y'],['--seed','x'.repeat(257)]])assert.equal(run(args).status,1);
});
test('source metadata cannot replace the checksum of the consumed manifest bytes',async()=>fixture(async({dataset,out,manifest})=>{
  const content=JSON.stringify({...manifest,manifestSha256:'0'.repeat(64)});
  await writeFile(join(dataset,'manifest.json'),content);
  const result=run(['--dataset',dataset,'--out',out,'--seed','fixture-split']);assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).sourceDataset.manifestSha256,hash(content));
}));
