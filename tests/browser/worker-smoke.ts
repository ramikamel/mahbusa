import {createBotController} from '../../src/lib/bot/controller.ts';
import {createSearchWorker} from '../../src/lib/bot/worker-factory.ts';
import {emptyPosition} from '../../src/lib/engine.ts';
import type {Pair} from '../../src/lib/engine';

function fixture(stacks:number[][],off:Pair,remaining:number[]){
  const position=emptyPosition();position.off=off;
  for(const [point,light,dark]of stacks)position.points[point]={count:[light,dark],top:light?0:1};
  return {position,active:0 as const,remaining,score:[0,0] as Pair};
}
const opening=()=>fixture([[23,15,0],[0,0,15]],[0,0],[2,4]);
const winning=()=>({...fixture([[0,2,0],[12,0,14]],[13,1],[1,6]),score:[2,0] as Pair});
const spread=()=>fixture([[6,1,0],[8,1,0],[10,1,0],[12,1,0],[14,1,0],[16,1,0],[18,1,0],[0,0,15]],[8,0],[1,1,1,1]);
const fault=(name:string)=>new Worker(new URL('./fault-worker.ts',import.meta.url),{type:'module',name});
const get=(id:string)=>document.getElementById(id)!;
let heartbeat=0,pings=0;
setInterval(()=>{get('heartbeat').textContent='Heartbeat: '+(++heartbeat);},20);
get('ping').onclick=()=>{get('pings').textContent='Interface pings: '+(++pings);};
function assert(ok:unknown,message:string):asserts ok{if(!ok)throw Error(message);}
function pass(message:string){const li=document.createElement('li');li.textContent='PASS: '+message;get('results').append(li);}
get('run').onclick=async()=>{
  const button=get('run') as HTMLButtonElement;button.disabled=true;get('results').textContent='';get('details').textContent='';
  let checks=0;
  try{
    get('status').textContent='Thinking in real worker — interface remains available';
    let progress=0;const before=heartbeat,began=performance.now();
    const real=createBotController({onProgress:u=>{progress++;get('details').textContent='Received depth '+u.stats.completedDepth+' while heartbeat continues';}});
    try{
      const result=await real.search(spread(),1);
      assert(result.status==='complete','Real search did not complete: '+result.status);
      assert(progress>0&&heartbeat-before>20,'Heartbeat/progress did not continue during search');
      pass('Native search completed; '+progress+' progress updates, '+(heartbeat-before)+' heartbeat ticks in '+Math.round(performance.now()-began)+' ms');checks++;
    }finally{real.dispose();}

    get('status').textContent='Testing cancel/reset and fresh revision';
    let didCancel=false;const reset=createBotController({onProgress:()=>{if(!didCancel){didCancel=true;reset.cancel();}}});
    try{
      assert((await reset.search(opening(),1)).status==='cancelled','Reset failed to cancel');
      assert((await reset.search(winning(),2)).status==='complete','Fresh revision failed');
      pass('Reset terminated busy worker; fresh revision completed');checks++;
    }finally{reset.dispose();}

    get('status').textContent='Testing watchdog with received progress';
    const fallback=createBotController({createWorker:()=>fault('progress-only'),budgetMs:10,watchdogMs:500});
    try{
      const result=await fallback.search(opening(),1);
      assert(result.status==='fallback'&&result.plan.moves.length>0,'Watchdog lost validated fallback');
      pass('Watchdog terminated a busy worker and used received legal progress');checks++;
    }finally{fallback.dispose();}

    get('status').textContent='Testing watchdog without progress and retry';
    let starts=0;const silent=createBotController({createWorker:()=>++starts===1?fault('silent'):createSearchWorker(),budgetMs:10,watchdogMs:500});
    try{
      const result=await silent.search(opening(),1);
      assert(result.status==='error'&&!('plan'in result),'Watchdog invented a plan');
      assert((await silent.search(winning(),2)).status==='complete','Timeout retry failed');
      pass('No-progress watchdog returned error without a move; retry completed');checks++;
    }finally{silent.dispose();}

    get('status').textContent='Testing worker crash and retry';
    starts=0;const crash=createBotController({createWorker:()=>++starts===1?fault('crash'):createSearchWorker()});
    try{
      assert((await crash.search(opening(),1)).status==='error','Crash was not reported');
      assert((await crash.search(winning(),2)).status==='complete','Crash retry failed');
      pass('Native worker error settled safely; fresh worker retry completed');checks++;
    }finally{crash.dispose();}

    const disposed=createBotController({onProgress:()=>disposed.dispose()});
    assert((await disposed.search(opening(),1)).status==='cancelled','Dispose did not cancel');
    assert((await disposed.search(winning(),2)).status==='error','Disposed controller restarted');
    pass('Dispose terminated busy worker and prevented further work');checks++;
    get('status').textContent='PASS: '+checks+' worker checks';
  }catch(error){get('status').textContent='FAIL: '+(error instanceof Error?error.message:String(error));}
  finally{button.disabled=false;}
};
