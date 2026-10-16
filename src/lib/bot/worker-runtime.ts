import {searchTurns} from './search.ts';
import {strategyEvaluator} from './strategy.ts';
import {record,searchIdentity,validateSearchState} from './validation.ts';
import type {SearchReply} from './types';

/** Transport-independent worker handler. Invalid identities cannot be correlated. */
export function runSearchRequest(raw:unknown,send:(reply:SearchReply)=>void):void {
  const identity=searchIdentity(raw);
  try{
    const request=record(raw);
    if(request.type!=='search')throw new Error('Invalid search request type.');
    if(identity.modelId!==strategyEvaluator.id)throw new Error('Requested model is unavailable.');
    const budgetMs=request.budgetMs;
    if(typeof budgetMs!=='number'||!Number.isFinite(budgetMs)||budgetMs<=0||budgetMs>60000)throw new Error('Invalid search budget.');
    validateSearchState(request.state);
    const result=searchTurns(request.state,{maxDepth:4,maxNodes:1000000,cacheEntries:10000,budgetMs,
      onUpdate:update=>send(structuredClone({type:'progress',...identity,plan:update.plan,stats:update.stats}))});
    send(structuredClone({type:'complete',...identity,plan:result.plan,stats:result.stats}));
  }catch(error){send({type:'error',...identity,message:error instanceof Error?error.message:'Worker search failed.'});}
}
