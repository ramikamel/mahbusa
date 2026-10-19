import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function makeArtifact(weights=new Float32Array(30081)){
  const bytes=new Uint8Array(120324),view=new DataView(bytes.buffer);
  weights.forEach((weight,i)=>view.setFloat32(i*4,weight,true));
  const sha256=sha(bytes);
  const manifest={formatVersion:1,id:'bootstrap-v1-'+sha256.slice(0,12),rulesVersion:'mahbusa-engine-v1',featureSchemaVersion:'mahbusa-pre-roll-v1',
    inputSize:104,hiddenSizes:[128,128],outputSize:1,architecture:'dense-relu-sigmoid-v1',byteLength:120324,status:'experimental',sha256};
  return {bytes,manifest};
}
export async function writeArtifact(dir,{weights,probes}={}){
  await mkdir(dir);
  const {bytes,manifest}=makeArtifact(weights);
  const files={'weights.bin':bytes,'model.json':JSON.stringify(manifest),
    'training.json':JSON.stringify({format:'mahbusa-training-run',version:1,status:'complete',modelId:manifest.id,modelSha256:manifest.sha256}),
    'parity.json':JSON.stringify({format:'mahbusa-model-parity',version:1,featureSchemaVersion:manifest.featureSchemaVersion,modelSha256:manifest.sha256,
      probes:probes??[{features:Array(104).fill(0),value:0},{features:Array(104).fill(1),value:0}]})};
  for(const [name,content] of Object.entries(files))await writeFile(join(dir,name),content);
  return {bytes,manifest,files};
}
