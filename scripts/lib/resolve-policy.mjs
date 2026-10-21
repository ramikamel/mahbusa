import {firstPolicy,randomPolicy,strategyPolicy} from '../../src/lib/bot/simulation.ts';
import {createSearchPolicy} from '../../src/lib/bot/search-policy.ts';
import {createModelPolicy} from '../../src/lib/bot/model-policy.ts';
import {loadModelArtifact} from './model-artifact.mjs';

export async function resolvePolicy(name,modelDirectory,searchNodes){
  if(searchNodes!==undefined&&name!=='search')throw Error('Only a search policy accepts search nodes.');
  if(name==='model'){
    if(typeof modelDirectory!=='string'||!modelDirectory)throw Error('Model policy requires its model directory.');
    const loaded=await loadModelArtifact(modelDirectory);
    return {policy:createModelPolicy(loaded.model,loaded.manifest.sha256),modelArtifact:loaded.provenance};
  }
  if(modelDirectory!==undefined)throw Error('Only a model policy accepts a model directory.');
  const policy={strategy:strategyPolicy,search:createSearchPolicy({maxNodes:searchNodes}),random:randomPolicy,first:firstPolicy};
  if(!Object.hasOwn(policy,name))throw Error('Unknown policy.');
  return {policy:policy[name],modelArtifact:null};
}
