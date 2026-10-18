import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {generateTurns} from '../src/lib/engine';
import {createBotController} from '../src/lib/bot/controller';
import type {WorkerLike} from '../src/lib/bot/controller';
import type {SearchRequest} from '../src/lib/bot/types';
import {botFixtures} from './helpers/bot-fixtures';

class ManualWorker implements WorkerLike {
  onmessage:WorkerLike['onmessage']=null;onerror:WorkerLike['onerror']=null;onmessageerror:WorkerLike['onmessageerror']=null;
  requests:SearchRequest[]=[];terminated=false;failPost=false;
  postMessage(request:SearchRequest){if(this.failPost)throw Error('post failed');this.requests.push(request);}
  terminate(){this.terminated=true;}
  reply(type='complete',changes:Record<string,unknown>={}){
    const request=this.requests[0];
    const data={type,requestId:request.requestId,revision:request.revision,modelId:request.modelId,
      plan:generateTurns(request.state)[0],stats:{nodes:1,completedDepth:0,elapsedMs:1},...changes};
    this.onmessage?.({data} as MessageEvent<unknown>);
    return data;
  }
}
const state=()=>({...botFixtures.opening(),score:[0,0] as [number,number]});
function setup(options:Parameters<typeof createBotController>[0]={}){
  const workers:ManualWorker[]=[];
  const controller=createBotController({budgetMs:50,watchdogMs:100,createWorker:()=>{
    const worker=new ManualWorker();workers.push(worker);return worker;
  },...options});return {controller,workers};
}
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
describe('worker controller lifecycle',()=>{
  it('starts lazily, snapshots input, checks completion and releases resources',async()=>{
    const {controller,workers}=setup();expect(workers).toHaveLength(0);
    const input=state(),before=structuredClone(input),pending=controller.search(input,4),worker=workers[0];
    input.position.off[0]=99;input.remaining=[];input.score[0]=99;
    expect(worker.requests[0].state).toEqual(before);
    const message=worker.reply(),result=await pending;
    expect(result).toMatchObject({status:'complete',revision:4,modelId:'strategy-v1',plan:message.plan});
    message.plan.position.off[0]=99;
    if(result.status==='complete')expect(result.plan.position.off[0]).toBe(0);
    expect(worker.terminated).toBe(true);expect(worker.onmessage).toBeNull();expect(vi.getTimerCount()).toBe(0);
  });
  it('ignores wrong request/revision/model replies and accepts the matching one',async()=>{
    const {controller,workers}=setup(),pending=controller.search(state(),1),worker=workers[0];
    for(const wrong of [{requestId:'stale'},{revision:0},{modelId:'stale'}])worker.reply('complete',wrong);
    expect(worker.terminated).toBe(false);worker.reply();expect((await pending).status).toBe('complete');
  });
  it('ignores uncorrelated malformed data without throwing in the browser event handler',async()=>{
    const {controller,workers}=setup(),pending=controller.search(state(),1),worker=workers[0];
    for(const data of [null,[],42,'bad',{}])expect(()=>worker.onmessage?.({data} as MessageEvent<unknown>)).not.toThrow();
    worker.reply();expect((await pending).status).toBe('complete');
  });
  it('cancels/replaces old jobs and ignores even captured matching-envelope callbacks from old workers',async()=>{
    const {controller,workers}=setup(),old=controller.search(state(),1),oldCallback=workers[0].onmessage!;
    const next=controller.search(state(),2);
    expect((await old).status).toBe('cancelled');expect(workers[0].terminated).toBe(true);
    oldCallback({data:{...workers[1].requests[0],type:'complete',plan:generateTurns(state())[0],stats:{nodes:0,completedDepth:0,elapsedMs:0}}} as MessageEvent<unknown>);
    expect(workers[1].terminated).toBe(false);workers[1].reply();expect((await next).status).toBe('complete');
  });
  it('reset cancellation settles pending work without returning a move',async()=>{
    const {controller,workers}=setup(),pending=controller.search(state(),1);
    workers[0].reply('progress');controller.cancel();
    expect(await pending).toMatchObject({status:'cancelled'});expect(workers[0].terminated).toBe(true);expect(vi.getTimerCount()).toBe(0);
    const fresh=controller.search(state(),2);workers[1].reply();expect((await fresh).status).toBe('complete');
  });
  it('disposes idempotently and rejects future searches without leaking a worker',async()=>{
    const {controller,workers}=setup(),pending=controller.search(state(),1);controller.dispose();controller.dispose();
    expect((await pending).status).toBe('cancelled');expect((await controller.search(state(),2)).status).toBe('error');
    expect(workers).toHaveLength(1);expect(workers[0].terminated).toBe(true);expect(vi.getTimerCount()).toBe(0);
  });
});
describe('received progress and watchdog',()=>{
  it('uses only the last validated owned progress on watchdog',async()=>{
    const {controller,workers}=setup({onProgress:update=>{update.plan.moves=[];update.plan.position.off[0]=99;update.stats.completedDepth=99;}});
    const pending=controller.search(state(),1),worker=workers[0],message=worker.reply('progress');
    message.plan.moves=[];message.plan.position.off[0]=77;
    await vi.advanceTimersByTimeAsync(100);const result=await pending;
    expect(result).toMatchObject({status:'fallback',reason:'watchdog',stats:{completedDepth:0}});
    if(result.status==='fallback'){expect(result.plan.moves.length).toBeGreaterThan(0);expect(result.plan.position.off[0]).toBe(0);}
    expect(worker.terminated).toBe(true);expect(vi.getTimerCount()).toBe(0);
  });
  it('returns a retryable error without fabricating a fallback before any progress',async()=>{
    const {controller,workers}=setup(),pending=controller.search(state(),1);
    await vi.advanceTimersByTimeAsync(100);const result=await pending;
    expect(result).toMatchObject({status:'error',message:expect.stringMatching(/retry/i)});expect(result).not.toHaveProperty('plan');expect(workers[0].terminated).toBe(true);
  });
  it('accepts a genuinely blocked pass as watchdog fallback',async()=>{
    const {controller,workers}=setup(),pending=controller.search({...botFixtures.blocked(),score:[0,0]},1);
    workers[0].reply('progress');await vi.advanceTimersByTimeAsync(100);
    expect(await pending).toMatchObject({status:'fallback',plan:{moves:[],remaining:[1,2]}});
  });
  it('keeps depth monotonic and rejects a completion older than accepted progress',async()=>{
    const seen:number[]=[],{controller,workers}=setup({onProgress:u=>seen.push(u.stats.completedDepth)});
    const pending=controller.search(state(),1),worker=workers[0];
    worker.reply('progress',{stats:{nodes:50,completedDepth:2,elapsedMs:20}});
    worker.reply('progress',{stats:{nodes:10,completedDepth:1,elapsedMs:5}});
    worker.reply('progress',{stats:{nodes:50,completedDepth:2,elapsedMs:20}});
    expect(seen).toEqual([2]);worker.reply('complete',{stats:{nodes:10,completedDepth:1,elapsedMs:5}});
    expect((await pending).status).toBe('error');
  });
  it('handles progress observers replacing or cancelling the search reentrantly',async()=>{
    let replace=true;let next:ReturnType<ReturnType<typeof createBotController>['search']>|undefined;
    const {controller,workers}=setup({onProgress:()=>{if(replace){replace=false;next=controller.search(state(),2);}else controller.cancel();}});
    const first=controller.search(state(),1);workers[0].reply('progress');
    expect((await first).status).toBe('cancelled');expect(workers[1].terminated).toBe(false);
    workers[1].reply('progress');expect((await next!).status).toBe('cancelled');expect(vi.getTimerCount()).toBe(0);
  });
});
describe('failed worker or invalid messages',()=>{
  it.each(['partial','metadata','stats','type'])('rejects a matching invalid %s reply instead of storing fallback',async kind=>{
    const {controller,workers}=setup(),pending=controller.search(state(),1),plan=generateTurns(state())[0];
    const change=kind==='partial'?{plan:{...plan,moves:[]}}:kind==='metadata'?{plan:{...plan,outcome:{winner:0,points:2,reason:'mother'}}}
      :kind==='stats'?{stats:{nodes:Infinity,completedDepth:0,elapsedMs:0}}:{type:'unexpected'};
    workers[0].reply('progress',change);expect((await pending).status).toBe('error');expect(workers[0].terminated).toBe(true);expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['error','messageerror','reply'])('settles %s and permits fresh retry',async kind=>{
    const {controller,workers}=setup(),pending=controller.search(state(),1),worker=workers[0];
    if(kind==='error')worker.onerror?.({message:'crash',preventDefault(){}} as ErrorEvent);
    else if(kind==='messageerror')worker.onmessageerror?.({} as MessageEvent<unknown>);
    else worker.reply('error',{message:'model error'});
    expect((await pending).status).toBe('error');expect(worker.terminated).toBe(true);
    const retry=controller.search(state(),2);workers[1].reply();expect((await retry).status).toBe('complete');
  });
  it('settles factory/post/observer failures and invalid state without orphan timers',async()=>{
    const factory=createBotController({createWorker:()=>{throw Error('factory failed');}});
    expect((await factory.search(state(),1)).status).toBe('error');
    const worker=new ManualWorker();worker.failPost=true;
    const post=createBotController({createWorker:()=>worker});expect((await post.search(state(),1)).status).toBe('error');expect(worker.terminated).toBe(true);
    const {controller,workers}=setup({onProgress:()=>{throw Error('observer failed');}}),pending=controller.search(state(),1);
    workers[0].reply('progress');expect((await pending).status).toBe('error');
    expect((await controller.search({...state(),score:[3,0]},2)).status).toBe('error');
    expect(workers).toHaveLength(1);expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects invalid options or revision without starting work',async()=>{
    for(const options of [{budgetMs:0},{watchdogMs:4000},{watchdogMs:Infinity},{modelId:''}])expect(()=>createBotController(options)).toThrow();
    const {controller,workers}=setup();expect((await controller.search(state(),-1)).status).toBe('error');expect(workers).toHaveLength(0);
  });
  it('rejects sparse inputs without starting a worker or accepting a malformed pass fallback',async()=>{
    const {controller,workers}=setup();
    const score:[number,number]=[2,0];delete (score as number[])[1];
    for(const input of [{...botFixtures.bearOff(),score},{...state(),remaining:Array(1) as number[]}]){
      const pending=controller.search(input,1);
      expect(workers).toHaveLength(0);
      expect(await pending).toMatchObject({status:'error'});
    }
    expect(vi.getTimerCount()).toBe(0);
  });
});
