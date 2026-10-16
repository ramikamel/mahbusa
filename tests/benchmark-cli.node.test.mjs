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
    assert.match(report.sourceRevision,/^[0-9a-f]{40}$/);
    assert.equal(typeof report.sourceDirty,'boolean');
    assert.match(result.stderr,/Pair 1\/1/);
  }finally{await rm(directory,{recursive:true,force:true});}
});
test('benchmark CLI signals incomplete samples without counting them as draws',()=>{
  const result=run(['--pairs','1','--max-turns','1','--a','first','--b','first']);
  assert.equal(result.status,2,result.stderr);
  const report=JSON.parse(result.stdout);assert.equal(report.metrics.truncatedRounds,2);
  assert.equal(report.metrics.winRateA,null);assert.equal(report.metrics.interval95A,null);
});
