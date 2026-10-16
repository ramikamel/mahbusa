import {createGame} from '../engine.ts';
import {replayPlan} from './replay.ts';
import {record,validateSearchState} from './validation.ts';
import {createSearchWorker} from './worker-factory.ts';
import type {SearchRequest,SearchStats,TurnPlan} from './types';

export interface WorkerLike {
  postMessage(request:SearchRequest):void;terminate():void;
  onmessage:((event:MessageEvent<unknown>)=>void)|null;
  onerror:((event:ErrorEvent)=>void)|null;
  onmessageerror:((event:MessageEvent<unknown>)=>void)|null;
}
type Identity=Pick<SearchRequest,'requestId'|'revision'|'modelId'>;
export type BotSearchUpdate=Identity & {plan:TurnPlan;stats:SearchStats};
export type BotSearchOutcome=
  | (BotSearchUpdate & {status:'complete'})
  | (BotSearchUpdate & {status:'fallback';reason:'watchdog'})
  | (Identity & {status:'cancelled'})
  | (Identity & {status:'error';message:string});
export type BotControllerOptions={
  createWorker?:()=>WorkerLike;budgetMs?:number;watchdogMs?:number;modelId?:string;
  onProgress?:(update:BotSearchUpdate)=>void;
};
type Job={
  identity:Identity;request:SearchRequest;worker?:WorkerLike;timer?:ReturnType<typeof setTimeout>;
  best?:BotSearchUpdate;resolve:(outcome:BotSearchOutcome)=>void;
};

/** Owns worker lifecycle, never mutates a board. Cancel on every external board
 * change; a replacement search automatically cancels the previous revision. */
export function createBotController(options:BotControllerOptions={}){
  const budgetMs=options.budgetMs??4000,watchdogMs=options.watchdogMs??4500,modelId=options.modelId??'strategy-v1';
  if(!Number.isFinite(budgetMs)||budgetMs<=0||budgetMs>60000||!Number.isFinite(watchdogMs)
    ||watchdogMs<=budgetMs||watchdogMs>60000||!modelId||modelId.length>80)throw new Error('Invalid bot controller options.');
  const createWorker:()=>WorkerLike=options.createWorker??createSearchWorker;
  const onProgress=options.onProgress;
  let current:Job|null=null,disposed=false,serial=0;
  function finish(job:Job,outcome:BotSearchOutcome){
    if(current!==job)return;
    current=null;
    clearTimeout(job.timer);
    if(job.worker){
      job.worker.onmessage=null;job.worker.onerror=null;job.worker.onmessageerror=null;
      job.worker.terminate();
    }
    job.resolve(outcome);
  }
  function fail(job:Job,message:string){finish(job,{...job.identity,status:'error',message:message+' Retry the search.'});}
  function cancel(){if(current)finish(current,{...current.identity,status:'cancelled'});}
  function receive(job:Job,raw:unknown){
    if(current!==job)return;
    // Uncorrelated data cannot settle this generation, even with a valid plan.
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return;
    const data=record(raw);
    if(data.requestId!==job.identity.requestId||data.revision!==job.identity.revision||data.modelId!==job.identity.modelId)return;
    try{
      if(data.type==='error'){
        if(typeof data.message!=='string')throw new Error('Invalid worker error.');
        fail(job,data.message.slice(0,1000));return;
      }
      if(data.type!=='progress'&&data.type!=='complete')throw new Error('Invalid worker reply type.');
      const rawStats=record(data.stats),{nodes,completedDepth,elapsedMs}=rawStats;
      if(!Number.isSafeInteger(nodes)||(nodes as number)<0||!Number.isSafeInteger(completedDepth)
        ||(completedDepth as number)<0||(completedDepth as number)>4||typeof elapsedMs!=='number'
        ||!Number.isFinite(elapsedMs)||elapsedMs<0)throw new Error('Invalid search statistics.');
      const stats:SearchStats={nodes:nodes as number,completedDepth:completedDepth as number,elapsedMs};
      if(job.best){
        if(data.type==='progress'&&stats.completedDepth<=job.best.stats.completedDepth)return;
        if(stats.completedDepth<job.best.stats.completedDepth)throw new Error('Search completion regressed.');
      }
      const checked=replayPlan({...createGame(),...job.request.state,phase:'moving'},data.plan);
      const proposal=data.plan as TurnPlan;
      const plan:TurnPlan={moves:proposal.moves.map(({from,to,die})=>({from,to,die})),position:checked.position,
        remaining:[...checked.remaining].sort((a,b)=>a-b),outcome:checked.outcome};
      const accepted:BotSearchUpdate={...job.identity,plan,stats};
      if(data.type==='complete')finish(job,{...accepted,status:'complete'});
      else{job.best=accepted;onProgress?.(structuredClone(accepted));}
    }catch(error){fail(job,error instanceof Error?error.message:'Invalid worker reply.');}
  }
  function search(state:SearchRequest['state'],revision:number):Promise<BotSearchOutcome>{
    cancel();
    const identity:Identity={requestId:'search-'+(++serial),revision,modelId};
    try{
      if(disposed)throw new Error('Bot controller is disposed.');
      if(!Number.isSafeInteger(revision)||revision<0)throw new Error('Invalid board revision.');
      validateSearchState(state);
      const request:SearchRequest={type:'search',...identity,state:structuredClone(state),budgetMs};
      return new Promise(resolve=>{
        const job:Job={identity,request,resolve};current=job;
        try{
          job.timer=setTimeout(()=>{
            if(current!==job)return;
            if(job.best)finish(job,{...structuredClone(job.best),status:'fallback',reason:'watchdog'});
            else fail(job,'Search timed out before a legal plan arrived.');
          },watchdogMs);
          const worker=createWorker();job.worker=worker;
          worker.onmessage=event=>receive(job,event.data);
          worker.onerror=event=>{event.preventDefault();fail(job,event.message||'Bot worker failed.');};
          worker.onmessageerror=()=>fail(job,'Bot worker message could not be decoded.');
          worker.postMessage(structuredClone(request));
        }catch(error){fail(job,error instanceof Error?error.message:'Bot worker could not start.');}
      });
    }catch(error){return Promise.resolve({...identity,status:'error',message:error instanceof Error?error.message:'Invalid search input.'});}
  }
  return {search,cancel,dispose(){disposed=true;cancel();}};
}
