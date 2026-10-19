import {encodePreRoll,FEATURE_SCHEMA_VERSION,INPUT_SIZE} from './encoding.ts';
import {record} from './validation.ts';
import {RULES_VERSION} from './versions.ts';
import type {ModelManifest,PositionEvaluator} from './types';

export const WEIGHT_COUNT=30081,MODEL_BYTES=WEIGHT_COUNT*4;
export interface DenseModel extends PositionEvaluator {predict(features:Float32Array):number;}
export async function loadDenseModel(raw:unknown,source:Uint8Array):Promise<DenseModel>{
  const m=record(raw);
  if(m.formatVersion!==1||m.rulesVersion!==RULES_VERSION||m.featureSchemaVersion!==FEATURE_SCHEMA_VERSION
    ||m.architecture!=='dense-relu-sigmoid-v1'||m.status!=='experimental'||m.inputSize!==INPUT_SIZE
    ||!Array.isArray(m.hiddenSizes)||m.hiddenSizes.length!==2||m.hiddenSizes[0]!==128||m.hiddenSizes[1]!==128
    ||m.outputSize!==1||m.byteLength!==MODEL_BYTES||typeof m.sha256!=='string'||!/^[a-f0-9]{64}$/.test(m.sha256)
    ||(m.valueKind!==undefined&&m.valueKind!=='heuristic'&&m.valueKind!=='round-win-expectation')
    ||m.id!=='bootstrap-v1-'+m.sha256.slice(0,12))throw new Error('Unsupported model manifest.');
  const manifest=structuredClone(m) as ModelManifest;
  if(!(source instanceof Uint8Array)||source.byteLength!==MODEL_BYTES)throw new Error('Invalid model byte length.');
  const bytes=new Uint8Array(source);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.buffer)),n=>n.toString(16).padStart(2,'0')).join('');
  if(hash!==manifest.sha256)throw new Error('Model checksum mismatch.');
  const weights=new Float32Array(WEIGHT_COUNT),view=new DataView(bytes.buffer);
  for(let i=0;i<WEIGHT_COUNT;i++){
    weights[i]=view.getFloat32(i*4,true);
    if(!Number.isFinite(weights[i]))throw new Error('Nonfinite model weight.');
  }
  function predict(features:Float32Array):number{
    if(!(features instanceof Float32Array)||features.length!==INPUT_SIZE||features.some(n=>!Number.isFinite(n)||n<0||n>1))throw new Error('Invalid encoded features.');
    let input=features,offset=0;
    for(const width of [128,128,1]){
      const output=new Float32Array(width),biasOffset=offset+width*input.length;
      for(let row=0;row<width;row++){
        let sum=weights[biasOffset+row];
        for(let column=0;column<input.length;column++)sum+=weights[offset+row*input.length+column]*input[column];
        const value=Math.fround(sum);
        if(!Number.isFinite(value))throw new Error('Nonfinite model inference.');
        output[row]=width===1?value:Math.max(0,value);
      }
      offset=biasOffset+width;input=output;
    }
    const logit=input[0],exp=Math.exp(logit<0?logit:-logit);
    const probability=Math.fround(logit<0?exp/(1+exp):1/(1+exp));
    return 2*probability-1;
  }
  return {id:manifest.id,predict,evaluate:state=>({kind:manifest.valueKind??'round-win-expectation',value:predict(encodePreRoll(state))})};
}
