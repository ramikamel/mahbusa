import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createSeededRandom} from '../../src/lib/bot/seeded.ts';
import {resolvePolicy} from './resolve-policy.mjs';

const sha=raw=>createHash('sha256').update(raw).digest('hex');
const digest=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const key=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{0,31}$/.test(value);
const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const builtins=new Set(['strategy-v1-greedy','expectimax-v1/strategy-v1/d1/n1000/c10000']);

export function validatePoolSnapshot(raw){
  const d=raw?.definition;
  if(raw?.selectionVersion!=='sha256-weighted-v1'||!digest(raw.configSha256)||!digest(raw.sha256)
    ||!Array.isArray(d?.entrants)||d.entrants.length<1||d.entrants.length>16
    ||!Array.isArray(d.matchups)||d.matchups.length<1||d.matchups.length>64
    ||sha(JSON.stringify(d))!==raw.sha256)throw Error('Invalid opponent pool snapshot.');
  const keys=new Set();
  for(const entry of d.entrants){
    if(!key(entry?.key)||keys.has(entry.key))throw Error('Invalid/duplicate pool entrant.');
    keys.add(entry.key);
    if(builtins.has(entry.policyId)){
      if(entry.modelArtifact!==null)throw Error('Unexpected model provenance for builtin.');
    }else{
      const m=entry.modelArtifact,p=m?.parityResult;
      if(!m||!digest(m.weightsSha256)||entry.policyId!=='nn-greedy-v1/'+m.weightsSha256
        ||m.modelId!=='bootstrap-v1-'+m.weightsSha256.slice(0,12)
        ||![m.manifestSha256,m.trainingReportSha256,m.paritySha256].every(digest)
        ||p?.format!=='mahbusa-model-parity-result'||p.version!==1||p.status!=='passed'||p.modelId!==m.modelId
        ||p.tolerance!==.00005||!integer(p.count,1,4096)||!Number.isFinite(p.maxAbsoluteError)
        ||p.maxAbsoluteError<0||p.maxAbsoluteError>.00005)throw Error('Invalid pool model identity/provenance.');
    }
  }
  const pairs=new Set();
  for(const pair of d.matchups){
    const identity=JSON.stringify([pair?.a,pair?.b]);
    if(!keys.has(pair?.a)||!keys.has(pair?.b)||!integer(pair?.weight,1,100)||pairs.has(identity))throw Error('Invalid/duplicate weighted matchup.');
    pairs.add(identity);
  }
  return structuredClone(raw);
}

export function selectPoolPolicies(snapshot,seed,index){
  const pool=validatePoolSnapshot(snapshot);
  if(!integer(index,0,9999))throw Error('Invalid pool round index.');
  const {entrants,matchups}=pool.definition,total=matchups.reduce((n,m)=>n+m.weight,0);
  let pick=createSeededRandom(seed,`pool-matchup-v1/${pool.sha256}/${index}`).int(total);
  for(const matchup of matchups){
    if(pick<matchup.weight)return [matchup.a,matchup.b].map(k=>entrants.find(e=>e.key===k).policyId);
    pick-=matchup.weight;
  }
  throw Error('No pool matchup selected.');
}

export async function loadOpponentPool(path){
  path=resolve(path);
  const bytes=await readFile(path),config=JSON.parse(bytes);
  if(config?.format!=='mahbusa-opponent-pool'||config.version!==1||!Array.isArray(config.entrants)
    ||!config.entrants.length||config.entrants.length>16||!Array.isArray(config.matchups)
    ||!config.matchups.length||config.matchups.length>64)throw Error('Invalid opponent pool config.');
  const entrants=[],policies=new Map(),keys=new Set();
  for(const entry of config.entrants){
    if(!key(entry?.key)||keys.has(entry.key)||!['strategy','search','model'].includes(entry.policy))throw Error('Invalid pool entrant config.');
    keys.add(entry.key);
    if((entry.policy==='model'&&(typeof entry.model!=='string'||!entry.model))
      ||(entry.policy!=='model'&&Object.hasOwn(entry,'model')))throw Error('Model directory belongs only to model entrants.');
    const {policy,modelArtifact}=await resolvePolicy(entry.policy,entry.policy==='model'?resolve(dirname(path),entry.model):undefined);
    entrants.push({key:entry.key,policyId:policy.id,modelArtifact});policies.set(policy.id,policy);
  }
  const definition={entrants,matchups:structuredClone(config.matchups)};
  const snapshot=validatePoolSnapshot({selectionVersion:'sha256-weighted-v1',configSha256:sha(bytes),definition,sha256:sha(JSON.stringify(definition))});
  return {snapshot,policies};
}
