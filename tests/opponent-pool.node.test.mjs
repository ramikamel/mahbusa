import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {loadOpponentPool,validatePoolSnapshot,selectPoolPolicies} from '../scripts/lib/opponent-pool.mjs';
import {writeArtifact,sha} from './helpers/model-artifact.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const run=(script,args)=>spawnSync(process.execPath,[join(root,'scripts',script),...args],{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024});
const strategy='strategy-v1-greedy',search='expectimax-v1/strategy-v1/d1/n1000/c10000';
function simpleSnapshot(){const definition={entrants:[{key:'strategy',policyId:strategy,modelArtifact:null},{key:'search',policyId:search,modelArtifact:null}],
  matchups:[{a:'strategy',b:'strategy',weight:2},{a:'strategy',b:'search',weight:1},{a:'search',b:'strategy',weight:1}]};
  return {selectionVersion:'sha256-weighted-v1',configSha256:'a'.repeat(64),definition,sha256:sha(JSON.stringify(definition))};}
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),'mahbusa-pool-'));try{
  await writeArtifact(join(dir,'model'));await mkdir(join(dir,'config'));
  const config={format:'mahbusa-opponent-pool',version:1,entrants:[{key:'strategy',policy:'strategy'},{key:'current',policy:'model',model:'../model'}],
    matchups:[{a:'strategy',b:'strategy',weight:2},{a:'strategy',b:'current',weight:1},{a:'current',b:'strategy',weight:1}]};
  const path=join(dir,'config','pool.json');await writeFile(path,JSON.stringify(config));await fn({dir,path,config});
}finally{await rm(dir,{recursive:true,force:true});}}
test('weighted pool selection repeats a literal independent seeded matchup sequence',()=>{
  const pool=validatePoolSnapshot(simpleSnapshot());assert.equal(pool.sha256,'e0e2e728ae480dca42405acf01ecb4dce1169d5e7aed86db4b7bff56fdbfc042');
  assert.deepEqual(Array.from({length:8},(_,i)=>selectPoolPolicies(pool,'pool-fixture',i)),[
    [strategy,strategy],[strategy,strategy],[strategy,search],[strategy,search],
    [search,strategy],[search,strategy],[strategy,strategy],[strategy,strategy]]);
  for(const index of [-1,1.5,10000])assert.throws(()=>selectPoolPolicies(pool,'pool-fixture',index));
});
test('pool loader resolves model paths against config and records owned byte provenance',async()=>fixture(async({dir,path,config})=>{
  const loaded=await loadOpponentPool(path),p=loaded.snapshot;
  assert.equal(p.configSha256,sha(JSON.stringify(config)));assert.equal(p.sha256,sha(JSON.stringify(p.definition)));
  const entry=p.definition.entrants[1];assert.equal(entry.policyId,'nn-greedy-v1/'+entry.modelArtifact.weightsSha256);
  assert.equal(loaded.policies.get(entry.policyId).id,entry.policyId);
  assert.equal(JSON.stringify(p).includes(dir),false);
  await writeFile(join(dir,'model','weights.bin'),Buffer.alloc(4));
  assert.equal(loaded.policies.get(entry.policyId).id,entry.policyId);await assert.rejects(loadOpponentPool(path));
}));
test('mixed pool outcomes prepare with actual per-index policies, colors and final labels',async()=>fixture(async({dir,path})=>{
  const out=join(dir,'data'),args=['--pool',path,'--seed','pool-fixture','--rounds','6','--out',out];
  const result=run('self-play-bot.mjs',args);assert.equal(result.status,0,result.stderr);
  const m=JSON.parse(result.stdout),data=await readFile(join(out,'rounds.jsonl')),rows=data.toString().trim().split('\n').map(JSON.parse);
  assert.equal(m.version,2);assert.equal(m.policy,'pool-v1/'+m.pool.sha256);assert.equal(m.dataset.sha256,sha(data));
  assert.equal(m.completedRounds,6);assert.ok(rows.some(r=>r.result.policies[0]!==r.result.policies[1]));
  for(const [index,row] of rows.entries()){
    assert.equal(row.result.aColor,index%2);assert.deepEqual(row.result.policies,selectPoolPolicies(m.pool,'pool-fixture',index));
    const winnerColor=row.result.winner===0?row.result.aColor:1-row.result.aColor;
    for(const example of row.examples)assert.equal(example.target,example.state.active===winnerColor?1:-1);
  }
  const prepared=run('prepare-training.mjs',['--dataset',out,'--out',join(dir,'prepared'),'--seed','fixture-split']);
  assert.equal(prepared.status,0,prepared.stderr);const p=JSON.parse(prepared.stdout);
  assert.equal(p.sourceDataset.version,2);assert.equal(p.sourceDataset.pool.sha256,m.pool.sha256);
  assert.deepEqual(p.rounds.filter(r=>r.split==='validation').map(r=>r.index),[0,3]);
  const repeat=run('self-play-bot.mjs',[...args.slice(0,-1),out+'-repeat']);assert.equal(repeat.status,0,repeat.stderr);
  const repeated=(await readFile(join(out+'-repeat','rounds.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(repeated.map(r=>r.result.traceHash),rows.map(r=>r.result.traceHash));
  // Changing a row's opponent and recomputing its file hash cannot invent a matchup.
  rows[0].result.policies[0]='forged-policy';const changed=Buffer.from(rows.map(r=>JSON.stringify(r)+'\n').join(''));
  m.dataset.sha256=sha(changed);m.dataset.bytes=changed.length;
  await writeFile(join(out,'rounds.jsonl'),changed);await writeFile(join(out,'manifest.json'),JSON.stringify(m));
  assert.equal(run('prepare-training.mjs',['--dataset',out,'--out',join(dir,'forged'),'--seed','fixture-split']).status,1);
}));
test('pool snapshots reject duplicate identities, bad weights, references and model provenance',()=>{
  for(const change of [p=>p.selectionVersion='other',p=>p.sha256='0'.repeat(64),p=>p.definition.entrants[1].key='strategy',
    p=>p.definition.matchups[0].weight=0,p=>p.definition.matchups[0].weight=1.5,p=>p.definition.matchups[0].a='missing',
    p=>p.definition.matchups.push({...p.definition.matchups[0]}),p=>p.definition.entrants[0].policyId='unknown']){
    const p=simpleSnapshot();change(p);if(p.sha256!=='0'.repeat(64))p.sha256=sha(JSON.stringify(p.definition));assert.throws(()=>validatePoolSnapshot(p));
  }
});
test('invalid pool configs and conflicting mirror flags fail before output creation',async()=>fixture(async({dir,path,config})=>{
  const out=join(dir,'never-created');
  for(const flags of [['--policy','strategy'],['--model',join(dir,'model')]]){
    assert.equal(run('self-play-bot.mjs',['--pool',path,...flags,'--rounds','1','--out',out]).status,1);await assert.rejects(access(out));
  }
  for(const mutate of [c=>c.entrants[1].model='missing',c=>c.entrants[0].model='../model',c=>c.matchups[0].weight=-1,
    c=>c.entrants[1].key='strategy',c=>c.matchups[0].b='missing',c=>c.entrants[1].policy='random']){
    const c=structuredClone(config);mutate(c);await writeFile(path,JSON.stringify(c));
    assert.equal(run('self-play-bot.mjs',['--pool',path,'--rounds','1','--out',out]).status,1);await assert.rejects(access(out));
  }
}));
test('pool cutoff runs carry no labels and cannot prepare as complete data',async()=>fixture(async({dir,path})=>{
  const out=join(dir,'cutoff'),result=run('self-play-bot.mjs',['--pool',path,'--rounds','2','--max-turns','1','--out',out]);
  assert.equal(result.status,2,result.stderr);const m=JSON.parse(result.stdout);assert.equal(m.version,2);assert.equal(m.status,'incomplete');assert.equal(m.examples,0);
  assert.equal((await readFile(join(out,'rounds.jsonl'))).length,0);
  assert.equal(run('prepare-training.mjs',['--dataset',out,'--out',join(dir,'refused')]).status,1);
}));
