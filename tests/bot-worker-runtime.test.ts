import {describe,expect,it} from 'vitest';
import * as E from '../src/lib/engine';
import {replayPlan} from '../src/lib/bot/replay';
import {validateSearchState} from '../src/lib/bot/validation';
import {runSearchRequest} from '../src/lib/bot/worker-runtime';
import type {SearchReply,SearchRequest} from '../src/lib/bot/types';
import {botFixtures,mirrored} from './helpers/bot-fixtures';

const request=():SearchRequest=>({type:'search',requestId:'test-1',revision:3,modelId:'strategy-v1',budgetMs:1,
  state:{...botFixtures.opening(),score:[0,0]}});
describe('worker search boundary',()=>{
  it('sends owned legal progress and completion with matching request/revision/model',()=>{
    const input=request(),before=structuredClone(input),replies:SearchReply[]=[];
    runSearchRequest(input,r=>{
      replies.push(structuredClone(r));
      if(r.type==='progress'){r.plan.moves=[];r.plan.position.off[0]=99;r.stats.completedDepth=99;}
    });
    expect(replies[0].type).toBe('progress');expect(replies.at(-1)?.type).toBe('complete');
    expect(input).toEqual(before);
    for(const reply of replies){
      expect(reply).toMatchObject({requestId:'test-1',revision:3,modelId:'strategy-v1'});
      if(reply.type==='error')throw Error(reply.message);
      expect(replayPlan({...E.createGame(),...input.state,phase:'moving'},reply.plan).position).toEqual(reply.plan.position);
      expect(reply.stats.completedDepth).toBeLessThanOrEqual(4);
    }
  });
  it.each(['blocked','doubles','motherCapture','bearOff'] as const)('checks complete %s plans for both colors',name=>{
    for(const state of [botFixtures[name](),mirrored(botFixtures[name]())]){
      const input={...request(),state:{...state,score:[1,1] as E.Pair}},replies:SearchReply[]=[];
      runSearchRequest(input,r=>replies.push(r));const result=replies.at(-1)!;
      expect(result.type).toBe('complete');
      if(result.type==='complete')expect(()=>replayPlan({...E.createGame(),...input.state,phase:'moving'},result.plan)).not.toThrow();
    }
  });
  it('rejects missing models rather than silently substituting heuristic inference',()=>{
    const replies:SearchReply[]=[];runSearchRequest({...request(),modelId:'missing-model'},r=>replies.push(r));
    expect(replies).toEqual([{type:'error',requestId:'test-1',revision:3,modelId:'missing-model',message:expect.stringMatching(/model/i)}]);
  });
  it('correlates malformed state/budget failures and refuses unsafe envelope identity',()=>{
    for(const change of [{budgetMs:0},{budgetMs:Infinity},{type:'unknown'},{state:null}]){
      const replies:SearchReply[]=[];runSearchRequest({...request(),...change},r=>replies.push(r));
      expect(replies).toHaveLength(1);expect(replies[0]).toMatchObject({type:'error',requestId:'test-1',revision:3,modelId:'strategy-v1'});
    }
    for(const change of [{requestId:''},{requestId:'x'.repeat(81)},{revision:-1},{revision:.5},{modelId:''}])expect(()=>runSearchRequest({...request(),...change},()=>{})).toThrow();
  });
  it('validates counts, pins, scores, dice and nonterminal boards before searching',()=>{
    const invalid:Array<(s:SearchRequest['state'])=>void>=[
      s=>{s.position.points.pop();},s=>{s.position.off[0]=1;},s=>{s.position.points[23].count[0]=14;},
      s=>{s.position.points[23].count[0]=1.5;},s=>{s.position.points[23].top=1;},
      s=>{s.position.points[10]={count:[2,2],top:0};},s=>{s.score=[3,0];},
      s=>{s.remaining=[7];},s=>{s.remaining=[1,2,3];},s=>{s.active=2 as E.Player;},
      s=>{s.position.off=[15,0];s.position.points[23]={count:[0,0],top:null};},
      s=>{s.position.points[23]={count:[1,1],top:1};s.position.points[22]={count:[14,0],top:0};s.position.points[0].count[1]=14;},
    ];
    for(const mutate of invalid){const state=request().state;mutate(state);expect(()=>validateSearchState(state)).toThrow();}
    expect(()=>validateSearchState({...botFixtures.forcedRelease(),score:[0,0]})).not.toThrow();
  });
});
describe('browser-safe checked replay',()=>{
  it('rejects incomplete, illegal and falsified metadata from unknown messages',()=>{
    const input=request().state,game:E.Game={...E.createGame(),...input,phase:'moving'},plan=E.generateTurns(input)[0];
    for(const bad of [null,{}, {...plan,moves:[]},{...plan,moves:[{from:0,to:2,die:2}]},
      {...plan,position:{...plan.position,off:[1,0]}},{...plan,outcome:{winner:0,reason:'mother',points:2}},{...plan,remaining:[6]}])expect(()=>replayPlan(game,bad)).toThrow();
  });
  it('compares structural values without requiring JSON property insertion order',()=>{
    const input=request().state,plan=E.generateTurns(input)[0];
    const reordered={outcome:plan.outcome,remaining:plan.remaining,moves:plan.moves,
      position:{off:plan.position.off,points:plan.position.points.map(p=>({top:p.top,count:p.count}))}};
    expect(replayPlan({...E.createGame(),...input,phase:'moving'},reordered).position).toEqual(plan.position);
  });
});
