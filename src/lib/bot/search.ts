import {generateTurns} from '../engine.ts';
import {preRollKey,copyPreRollState} from '../state.ts';
import type {Pair} from '../engine';
import {continuationAfterTurn} from './continuation.ts';
import {strategyEvaluator,validatePreRollState} from './strategy.ts';
import type {PositionEvaluator,PositionValue,PreRollState,SearchStats,TurnInput,TurnPlan} from './types';

export const DICE_OUTCOMES = Object.freeze(Array.from({length:6},(_,i)=>
  Array.from({length:6-i},(_,j)=>{
    const a=i+1,b=i+j+1;
    return Object.freeze({dice:Object.freeze(a===b?[a,a,a,a]:[a,b]),weight:a===b?1:2});
  })).flat());
export type TurnSearchStats=SearchStats & {cacheHits:number;cacheSize:number;baselineCandidates:number};
export type SearchUpdate={plan:TurnPlan;value:PositionValue;stats:TurnSearchStats};
export type SearchResult=SearchUpdate & {stopReason:'depth'|'nodes'|'time'|'round-win'};
export type SearchOptions={
  maxDepth?:number;maxNodes?:number;cacheEntries?:number;budgetMs?:number;
  evaluator?:PositionEvaluator;now?:()=>number;onUpdate?:(update:SearchUpdate)=>void;
};
class BudgetReached extends Error {
  readonly reason:'nodes'|'time';
  constructor(reason:'nodes'|'time'){super(reason);this.reason=reason;}
}

/** Full-width expectimax. Only a completed full-root iteration may replace the
 * mandatory greedy baseline. Time cancellation is cooperative between atoms. */
export function searchTurns(input:TurnInput & {score:Pair},options:SearchOptions={}):SearchResult {
  const maxDepth=options.maxDepth??2,maxNodes=options.maxNodes??20000,capacity=options.cacheEntries??10000;
  for(const [value,min,max] of [[maxDepth,0,4],[maxNodes,1,1000000],[capacity,0,50000]]){
    if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error('Invalid search control.');
  }
  if(options.budgetMs!==undefined&&(!Number.isFinite(options.budgetMs)||options.budgetMs<=0||options.budgetMs>60000))throw new Error('Invalid search time budget.');
  validatePreRollState(input);
  const evaluator=options.evaluator??strategyEvaluator,now=options.now??(()=>performance.now());
  const root=structuredClone(input),started=now();
  const cache=new Map<string,number>();
  const stats:TurnSearchStats={nodes:0,completedDepth:0,elapsedMs:0,cacheHits:0,cacheSize:0,baselineCandidates:0};
  function elapsed(){const ms=now()-started;if(!Number.isFinite(ms))throw new Error('Invalid search clock.');return Math.max(0,ms);}
  function check(){if(options.budgetMs!==undefined&&elapsed()>=options.budgetMs)throw new BudgetReached('time');}
  function evaluate(state:PreRollState){
    const value=evaluator.evaluate(copyPreRollState(state)).value;
    if(!Number.isFinite(value)||value < -1||value > 1)throw new Error('Invalid evaluator value.');
    return value;
  }
  function afterTurn(state:TurnInput & {score:Pair},plan:TurnPlan,depth:number):number{
    check();
    const next=continuationAfterTurn(state,plan);
    if(next.kind==='round-win')return next.winner===state.active?1:-1;
    const value=preRoll(next.state,depth);
    return next.state.active===state.active?value:-value;
  }
  function preRoll(state:PreRollState,depth:number):number{
    check();
    const key=preRollKey(state,depth);
    const hit=cache.get(key);
    if(hit!==undefined){stats.cacheHits++;return hit;}
    if(stats.nodes>=maxNodes)throw new BudgetReached('nodes');
    stats.nodes++;
    let value=0;
    if(!depth){value=evaluate(state);check();}
    else for(const outcome of DICE_OUTCOMES){
      check();
      const turn={...state,remaining:[...outcome.dice]},plans=generateTurns(turn);check();
      let best=-Infinity;
      for(const plan of plans)best=Math.max(best,afterTurn(turn,plan,depth-1));
      value+=outcome.weight*best/36;
    }
    // Floating-point addition can put a convex average a few ulps outside [-1,1].
    value=Math.max(-1,Math.min(1,value));
    if(cache.size<capacity)cache.set(key,value);
    return value;
  }
  const candidates=generateTurns(root).map(plan=>({plan,next:continuationAfterTurn(root,plan)}));
  stats.baselineCandidates=candidates.length;
  const winner=candidates.find(c=>c.next.kind==='round-win');
  let bestPlan=candidates[0].plan,bestValue=-Infinity;
  if(winner){bestPlan=winner.plan;bestValue=1;}
  else for(const {plan,next} of candidates){
    if(next.kind==='round-win')continue;
    const raw=evaluate(next.state),value=next.state.active===root.active?raw:-raw;
    if(value>bestValue){bestValue=value;bestPlan=plan;}
  }
  function snapshot():SearchUpdate{
    stats.elapsedMs=elapsed();stats.cacheSize=cache.size;
    return structuredClone({plan:bestPlan,value:{kind:winner?'round-win-expectation':'heuristic',value:bestValue},stats});
  }
  function publish(){options.onUpdate?.(snapshot());}
  publish();
  if(winner)return {...snapshot(),stopReason:'round-win'};
  let stopReason:SearchResult['stopReason']='depth';
  try{
    for(let depth=1;depth<=maxDepth;depth++){
      let iterationPlan=candidates[0].plan,iterationValue=-Infinity;
      for(const {plan} of candidates){
        const value=afterTurn(root,plan,depth);
        if(value>iterationValue){iterationValue=value;iterationPlan=plan;}
      }
      check();
      bestPlan=iterationPlan;bestValue=iterationValue;stats.completedDepth=depth;publish();
    }
  }catch(error){if(!(error instanceof BudgetReached))throw error;stopReason=error.reason;}
  return {...snapshot(),stopReason};
}
