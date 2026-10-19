import {searchTurns} from './search.ts';
import type {DenseModel} from './dense-model';
import type {BotPolicy} from './simulation';

/** Experimental complete-turn model ranking; not a qualified public bot. */
export function createModelPolicy(model:DenseModel,sha256:string):BotPolicy {
  if(typeof sha256!=='string'||!/^[a-f0-9]{64}$/.test(sha256)||model.id!=='bootstrap-v1-'+sha256.slice(0,12)){
    throw new Error('Model policy requires matching checked weight identity.');
  }
  const evaluator={id:model.id,evaluate:model.evaluate};
  return Object.freeze({id:'nn-greedy-v1/'+sha256,
    choose:input=>searchTurns(input,{maxDepth:0,evaluator}).plan} satisfies BotPolicy);
}
