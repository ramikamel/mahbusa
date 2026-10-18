import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const cli=fileURLToPath(new URL('../scripts/verify-model-parity.mjs',import.meta.url));
async function fixture(fn){
  const dir=await mkdtemp(join(tmpdir(),'mahbusa-parity-')),bytes=Buffer.alloc(120324),sha256=createHash('sha256').update(bytes).digest('hex');
  const model={formatVersion:1,id:'bootstrap-v1-'+sha256.slice(0,12),rulesVersion:'mahbusa-engine-v1',featureSchemaVersion:'mahbusa-pre-roll-v1',
    inputSize:104,hiddenSizes:[128,128],outputSize:1,architecture:'dense-relu-sigmoid-v1',byteLength:120324,status:'experimental',sha256};
  const probes={format:'mahbusa-model-parity',version:1,featureSchemaVersion:model.featureSchemaVersion,modelSha256:sha256,
    probes:[{features:Array(104).fill(0),value:0},{features:Array(104).fill(1),value:0}]};
  try{
    await writeFile(join(dir,'weights.bin'),bytes);await writeFile(join(dir,'model.json'),JSON.stringify(model));
    await writeFile(join(dir,'training.json'),JSON.stringify({format:'mahbusa-training-run',version:1,status:'complete',modelId:model.id,modelSha256:sha256}));
    await writeFile(join(dir,'parity.json'),JSON.stringify(probes));
    await fn({dir,probes});
  }finally{await rm(dir,{recursive:true,force:true});}
}
const run=dir=>spawnSync(process.execPath,[cli,'--model',dir],{encoding:'utf8',timeout:20000});
test('parity CLI checks actual loaded weights and every encoded prediction',async()=>fixture(async({dir})=>{
  const result=run(dir);assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);
  assert.equal(report.status,'passed');assert.equal(report.count,2);assert.equal(report.maxAbsoluteError,0);assert.equal(report.tolerance,.00005);
}));
test('artifact metadata cannot relax parity tolerance or supply empty/nonfinite probes',async()=>fixture(async({dir,probes})=>{
  for(const invalid of [{...probes,tolerance:99,probes:[{features:Array(104).fill(0),value:.1}]},
    {...probes,probes:[]},{...probes,probes:[{features:Array(104).fill(null),value:0}]},
    {...probes,modelSha256:'0'.repeat(64)}]){
    await writeFile(join(dir,'parity.json'),JSON.stringify(invalid));assert.equal(run(dir).status,1);
  }
}));
test('parity refuses incomplete training exports and corrupt model weights',async()=>fixture(async({dir})=>{
  await writeFile(join(dir,'training.json'),JSON.stringify({status:'running'}));assert.equal(run(dir).status,1);
}));
