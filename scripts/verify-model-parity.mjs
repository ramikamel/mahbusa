import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {loadDenseModel} from '../src/lib/bot/dense-model.ts';
import {INPUT_SIZE,FEATURE_SCHEMA_VERSION} from '../src/lib/bot/encoding.ts';
const usage='Usage: node scripts/verify-model-parity.mjs --model DIR';
try{
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='--help')console.log(usage);
  else{
    if(args.length!==2||args[0]!=='--model'||!args[1]||args[1].startsWith('--'))throw Error(usage);
    const dir=resolve(args[1]),json=async name=>JSON.parse(await readFile(join(dir,name),'utf8'));
    const training=await json('training.json'),manifest=await json('model.json'),parity=await json('parity.json');
    if(training.format!=='mahbusa-training-run'||training.version!==1||training.status!=='complete'
      ||training.modelId!==manifest.id||training.modelSha256!==manifest.sha256)throw Error('Incomplete or mismatched training export.');
    const model=await loadDenseModel(manifest,await readFile(join(dir,'weights.bin')));
    if(parity.format!=='mahbusa-model-parity'||parity.version!==1||parity.featureSchemaVersion!==FEATURE_SCHEMA_VERSION
      ||parity.modelSha256!==manifest.sha256||!Array.isArray(parity.probes)||!parity.probes.length||parity.probes.length>4096)throw Error('Invalid parity probes.');
    let maxAbsoluteError=0;
    for(const probe of parity.probes){
      if(!Array.isArray(probe.features)||probe.features.length!==INPUT_SIZE||probe.features.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1)
        ||typeof probe.value!=='number'||!Number.isFinite(probe.value)||Math.abs(probe.value)>1)throw Error('Invalid parity vector.');
      const actual=model.predict(new Float32Array(probe.features)),error=Math.abs(actual-probe.value);
      if(error>0.00005)throw Error('Python/TypeScript prediction parity failed: '+error);
      maxAbsoluteError=Math.max(maxAbsoluteError,error);
    }
    console.log(JSON.stringify({format:'mahbusa-model-parity-result',version:1,status:'passed',modelId:model.id,count:parity.probes.length,maxAbsoluteError,tolerance:0.00005}));
  }
}catch(error){process.stderr.write((error instanceof Error?error.message:String(error))+'\n');process.exitCode=1;}
