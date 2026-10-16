import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../scripts/self-play-bot.mjs',import.meta.url));
const run=(args,preload)=>spawnSync(process.execPath,[...(preload?['--import','data:text/javascript,'+encodeURIComponent(preload)]:[]),cli,...args],{encoding:'utf8',timeout:20000});
async function fixture(fn){
  const dir=await mkdtemp(join(tmpdir(),'mahbusa-self-play-'));
  try{await fn(join(dir,'dataset'));}finally{await rm(dir,{recursive:true,force:true});}
}
async function inspect(out,result){
  const manifest=JSON.parse(await readFile(join(out,'manifest.json'),'utf8'));
  assert.deepEqual(JSON.parse(result.stdout),manifest);
  const data=await readFile(join(out,'rounds.jsonl'));
  assert.equal(manifest.dataset.bytes,data.length);
  assert.equal(manifest.dataset.sha256,createHash('sha256').update(data).digest('hex'));
  return {manifest,lines:data.toString().trim()?data.toString().trim().split('\n').map(JSON.parse):[]};
}
test('self-play CLI streams completed outcome examples with provenance and checksum',async()=>fixture(async out=>{
  const result=run(['--rounds','2','--seed','cli-self-play','--out',out]);
  assert.equal(result.status,0,result.stderr);
  const {manifest,lines}=await inspect(out,result);
  assert.equal(manifest.format,'mahbusa-self-play-dataset');assert.equal(manifest.version,1);
  assert.equal(manifest.status,'complete');assert.equal(manifest.completedRounds,2);
  assert.equal(manifest.attemptedRounds,2);assert.equal(manifest.rounds,2);assert.equal(manifest.maxTurns,2000);
  assert.equal(manifest.seed,'cli-self-play');assert.equal(manifest.policy,'strategy-v1-greedy');
  assert.equal(manifest.rngVersion,'sha256-counter-v1');assert.equal(manifest.rulesVersion,'mahbusa-engine-v1');
  assert.match(manifest.sourceRevision,/^[0-9a-f]{40}$/);assert.equal(typeof manifest.sourceDirty,'boolean');
  assert.deepEqual(manifest.incompleteRounds,[]);assert.equal(lines.length,2);
  assert.equal(manifest.examples,lines.reduce((n,r)=>n+r.examples.length,0));
  for(const [index,round] of lines.entries()){
    assert.equal(round.index,index);assert.equal(round.result.status,'complete');assert.equal(round.result.aColor,index%2);
    assert.equal(round.result.seed,createHash('sha256').update(JSON.stringify(['self-play-v1','cli-self-play',index])).digest('hex'));
    assert.equal(round.examples.length,round.result.turns);
    const color=round.result.winner===0?round.result.aColor:1-round.result.aColor;
    for(const {state,target} of round.examples){
      assert.deepEqual(Object.keys(state).sort(),['active','position','score']);
      assert.equal(target,state.active===color?1:-1);assert.ok(Math.max(...state.score)<3);
    }
  }
  assert.match(result.stderr,/Round 2\/2/);
  const saved=await readFile(join(out,'rounds.jsonl'),'utf8');
  const refused=run(['--rounds','1','--out',out]);assert.equal(refused.status,1);
  assert.equal(await readFile(join(out,'rounds.jsonl'),'utf8'),saved);
}));
test('self-play CLI records cutoffs without fabricated examples',async()=>fixture(async out=>{
  const result=run(['--rounds','2','--max-turns','1','--out',out]);assert.equal(result.status,2,result.stderr);
  const {manifest,lines}=await inspect(out,result);
  assert.equal(manifest.status,'incomplete');assert.equal(manifest.completedRounds,0);assert.equal(manifest.examples,0);
  assert.equal(lines.length,0);assert.deepEqual(manifest.incompleteRounds.map(r=>r.index),[0,1]);
  assert.ok(manifest.incompleteRounds.every(r=>/^[a-f0-9]{64}$/.test(r.seed)));
}));
test('self-play CLI marks partial writes as failed and hashes actual bytes',async()=>fixture(async out=>{
  const preload=`import fs from 'node:fs/promises';import {syncBuiltinESMExports} from 'node:module';
    const open=fs.open;fs.open=async function(path,...args){const h=await open.call(this,path,...args);
      if(String(path).endsWith('rounds.jsonl')){h.writeFile=async function(data){await this.write(String(data).slice(0,40));throw new Error('injected write failure');};}return h;};syncBuiltinESMExports();`;
  const result=run(['--rounds','1','--out',out],preload);assert.equal(result.status,1,result.stderr);
  const manifest=JSON.parse(await readFile(join(out,'manifest.json'),'utf8'));
  const data=await readFile(join(out,'rounds.jsonl'));
  assert.equal(manifest.status,'failed');assert.equal(manifest.completedRounds,0);assert.equal(manifest.examples,0);
  assert.match(manifest.error,/injected write failure/);assert.equal(data.length,40);
  assert.equal(manifest.dataset.bytes,40);assert.equal(manifest.dataset.sha256,createHash('sha256').update(data).digest('hex'));
}));
test('self-play CLI validates arguments before creating output',()=>{
  assert.equal(run(['--help']).status,0);
  for(const args of [[],['--rounds','0'],['--rounds','10001'],['--rounds','1.5'],['--rounds','1','--rounds','2'],['--max-turns','0'],['--max-turns','100001'],['--seed',''],['--seed','x'.repeat(257)],['--out'],['--wat','1']])assert.equal(run(args).status,1);
});
