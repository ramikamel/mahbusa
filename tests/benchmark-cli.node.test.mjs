import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../scripts/benchmark-bot.mjs',import.meta.url));
const run=args=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:20000});
test('benchmark CLI rejects bad flags and accepts help',()=>{
  assert.equal(run(['--help']).status,0);
  for(const args of [['--pairs','0'],['--wat','1'],['--pairs','1.2'],['--seed'],['--a','unknown'],['--pairs','2','--pairs','3']]){
    assert.equal(run(args).status,1);
  }
});
test('benchmark CLI writes an explicit complete report through real Node imports',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'mahbusa-benchmark-'));
  try{
    const path=join(directory,'report.json');
    const result=run(['--seed','cli-smoke','--pairs','1','--a','first','--b','first','--out',path]);
    assert.equal(result.status,0,result.stderr);
    const report=JSON.parse(result.stdout);
    assert.deepEqual(JSON.parse(await readFile(path,'utf8')),report);
    assert.equal(report.metrics.completedRounds,2);
    assert.equal(report.metrics.winRateA,.5);
    assert.equal(report.samePolicy,true);assert.equal(report.comparison,'self-play');
    assert.match(report.sourceRevision,/^[0-9a-f]{40}$/);
    assert.equal(typeof report.sourceDirty,'boolean');
    assert.match(result.stderr,/Pair 1\/1/);
  }finally{await rm(directory,{recursive:true,force:true});}
});
test('benchmark CLI defaults to current strategy on both sides',()=>{
  const result=run(['--pairs','1','--max-turns','1']);
  assert.equal(result.status,2,result.stderr);
  const report=JSON.parse(result.stdout);
  assert.deepEqual(report.policies,['strategy-v1-greedy','strategy-v1-greedy']);
  assert.equal(report.samePolicy,true);assert.equal(report.comparison,'self-play');
  const control=JSON.parse(run(['--pairs','1','--max-turns','1','--b','random']).stdout);
  assert.equal(control.samePolicy,false);assert.equal(control.comparison,'control');
});
test('benchmark CLI signals incomplete samples without counting them as draws',()=>{
  const result=run(['--pairs','1','--max-turns','1','--a','first','--b','first']);
  assert.equal(result.status,2,result.stderr);
  const report=JSON.parse(result.stdout);assert.equal(report.metrics.truncatedRounds,2);
  assert.equal(report.metrics.winRateA,null);assert.equal(report.metrics.interval95A,null);
});
test('benchmark CLI explicitly compares bounded search against frozen greedy',()=>{
  const result=run(['--pairs','1','--max-turns','1','--a','search','--b','strategy']);
  assert.equal(result.status,2,result.stderr);const report=JSON.parse(result.stdout);
  assert.match(report.policies[0],/^expectimax-v1\/strategy-v1\/d1\/n1000\/c10000$/);
  assert.equal(report.policies[1],'strategy-v1-greedy');assert.equal(report.comparison,'control');assert.equal(report.samePolicy,false);
});

test('search profile CLI averages the two middle sweeps for an even repetition count',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'mahbusa-profile-'));
  try{
    const path=join(directory,'report.json');
    const script=fileURLToPath(new URL('../scripts/profile-search.mjs',import.meta.url));
    const result=spawnSync(process.execPath,[script,'--out',path,'--nodes','1000','--repetitions','2'],{encoding:'utf8',timeout:120000});
    assert.equal(result.status,0,result.stderr);
    const report=JSON.parse(await readFile(path,'utf8'));
    assert.equal(report.sweepsMs.length,2);
    assert.equal(report.medianSweepMs,(report.sweepsMs[0]+report.sweepsMs[1])/2);
    assert.equal(report.results.length,114);
  }finally{await rm(directory,{recursive:true,force:true});}
});
