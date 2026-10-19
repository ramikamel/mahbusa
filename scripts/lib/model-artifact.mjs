import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {loadDenseModel} from '../../src/lib/bot/dense-model.ts';
import {INPUT_SIZE,FEATURE_SCHEMA_VERSION} from '../../src/lib/bot/encoding.ts';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
/** One byte snapshot and one parity gate for diagnostics and model opponents. */
export async function loadModelArtifact(directory){
  const dir=resolve(directory);
  const [trainingBytes,manifestBytes,parityBytes,weights]=await Promise.all(
    ['training.json','model.json','parity.json','weights.bin'].map(name=>readFile(join(dir,name))));
  const training=JSON.parse(trainingBytes),manifest=JSON.parse(manifestBytes),parity=JSON.parse(parityBytes);
  if(training?.format!=='mahbusa-training-run'||training.version!==1||training.status!=='complete'
    ||training.modelId!==manifest?.id||training.modelSha256!==manifest?.sha256)throw Error('Incomplete or mismatched training export.');
  const model=await loadDenseModel(manifest,weights);
  if(parity?.format!=='mahbusa-model-parity'||parity.version!==1||parity.featureSchemaVersion!==FEATURE_SCHEMA_VERSION
    ||parity.modelSha256!==manifest.sha256||!Array.isArray(parity.probes)||!parity.probes.length||parity.probes.length>4096)throw Error('Invalid parity probes.');
  let maxAbsoluteError=0;
  for(const probe of parity.probes){
    if(!Array.isArray(probe?.features)||probe.features.length!==INPUT_SIZE||probe.features.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1)
      ||typeof probe.value!=='number'||!Number.isFinite(probe.value)||Math.abs(probe.value)>1)throw Error('Invalid parity vector.');
    const error=Math.abs(model.predict(new Float32Array(probe.features))-probe.value);
    if(error>0.00005)throw Error('Python/TypeScript prediction parity failed: '+error);
    maxAbsoluteError=Math.max(maxAbsoluteError,error);
  }
  const parityResult={format:'mahbusa-model-parity-result',version:1,status:'passed',modelId:model.id,count:parity.probes.length,maxAbsoluteError,tolerance:0.00005};
  const provenance={modelId:model.id,weightsSha256:sha(weights),manifestSha256:sha(manifestBytes),
    trainingReportSha256:sha(trainingBytes),paritySha256:sha(parityBytes),parityResult:structuredClone(parityResult)};
  return {model,manifest,parityResult,provenance};
}
