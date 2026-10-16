import {searchTurns} from './search.ts';
import {strategyEvaluator} from './strategy.ts';
import type {BotPolicy} from './simulation';

/** Frozen experimental compute budget, not a public difficulty setting. */
export function createSearchPolicy(options:{maxDepth?:number;maxNodes?:number;cacheEntries?:number}={}):BotPolicy {
  const maxDepth=options.maxDepth??1,maxNodes=options.maxNodes??1000,cacheEntries=options.cacheEntries??10000;
  for(const [value,min,max] of [[maxDepth,0,4],[maxNodes,1,1000000],[cacheEntries,0,50000]]){
    if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error('Invalid search policy control.');
  }
  const id=`expectimax-v1/${strategyEvaluator.id}/d${maxDepth}/n${maxNodes}/c${cacheEntries}`;
  return {id,choose:input=>searchTurns(input,{maxDepth,maxNodes,cacheEntries}).plan};
}
