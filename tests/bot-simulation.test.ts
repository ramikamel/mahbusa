import { describe, expect, it } from 'vitest';
import * as E from '../src/lib/engine';
import { firstPolicy, randomPolicy, strategyPolicy, replayPlan, simulateRound } from '../src/lib/bot/simulation';
import type { BotPolicy, RoundResult } from '../src/lib/bot/simulation';
import { botFixtures } from './helpers/bot-fixtures';
const deterministic = (r: RoundResult) => { const { timing, ...rest } = r; return rest; };
function game(input=botFixtures.opening(),score:E.Pair=[0,0]): E.Game {
  return {...E.createGame(),...input,score,phase:'moving',dice:[input.remaining[0],input.remaining[1]]};
}
describe('checked simulation plans',()=>{
  it('replays complete plans without mutating source state or plan',()=>{
    const state=game(),plan=E.generateTurns(state)[0],before=structuredClone({state,plan});
    expect(replayPlan(state,plan).position).toEqual(plan.position);
    expect({state,plan}).toEqual(before);
  });
  it('uses immediate mother outcome and awards score exactly once',()=>{
    const state=game(botFixtures.motherCapture(),[1,0]);
    const plan=E.generateTurns(state).find(p=>p.outcome)!;
    expect(replayPlan(state,plan)).toMatchObject({score:[3,0],phase:'roundOver',outcome:plan.outcome});
  });
  it('preserves one-point bearoff outcome and previous winner starter',()=>{
    const state=game(botFixtures.bearOff());
    const next=replayPlan(state,E.generateTurns(state)[0]);
    expect(next).toMatchObject({score:[1,0],phase:'gameOver'});
    expect(E.nextGameAndRoll(next,[3,4])).toMatchObject({active:0,score:[1,0],position:E.initialPosition(),remaining:[3,4]});
  });
  it('rejects illegal, partial and falsely described plans',()=>{
    const state=game(),plan=E.generateTurns(state)[0];
    expect(()=>replayPlan(state,{...plan,moves:[{from:0,to:1,die:2}]})).toThrow(/legal/);
    expect(()=>replayPlan(state,{...plan,moves:plan.moves.slice(0,1)})).toThrow();
    const fake=structuredClone(plan);fake.position.off[0]=1;
    expect(()=>replayPlan(state,fake)).toThrow(/result/);
    expect(()=>replayPlan({...state,phase:'roll'},plan)).toThrow();
  });
  it('accepts a complete blocked pass with unused dice',()=>{
    const state=game(botFixtures.blocked()), plan=E.generateTurns(state)[0];
    expect(replayPlan(state,plan).remaining).toEqual([1,2]);
  });
});
describe('complete seeded rounds',()=>{
  it('finishes first-to-three, repeats hashes/results, and balances swapped entrant roles',()=>{
    const config={seed:'round-test-v1',aColor:0 as const,policies:[firstPolicy,firstPolicy] as [BotPolicy,BotPolicy]};
    const a=simulateRound(config),b=simulateRound(config),swapped=simulateRound({...config,aColor:1});
    expect(a.status).toBe('complete');expect(a.winner).not.toBeNull();
    expect(Math.max(...a.score)).toBeGreaterThanOrEqual(3);
    expect(a.games).toBeGreaterThan(0);expect(a.games).toBeLessThanOrEqual(5);
    expect(deterministic(a)).toEqual(deterministic(b));
    expect(swapped.diceHash).toBe(a.diceHash);
    expect(swapped.winner).toBe(1-a.winner!);
    expect(swapped.score).toEqual([...a.score].reverse());
    expect(a.timing.decisionMs.every(n=>n>=0)).toBe(true);
  });
  it('reports a limit as incomplete rather than a draw or victory',()=>{
    const result=simulateRound({seed:'limited',aColor:0,policies:[firstPolicy,firstPolicy],maxTurns:1});
    expect(result).toMatchObject({status:'turn-limit',winner:null,turns:1});
  });
  it('isolates policy input mutations and action consumption from game/dice state',()=>{
    const mutator:BotPolicy={id:'mutator',choose(input,random){
      const plan=E.generateTurns(input)[0];for(let i=0;i<100;i++)random.int(6);
      input.score[0]=99;input.position.off[0]=99;input.remaining=[];return plan;
    }};
    const config={seed:'isolation',aColor:0 as const,maxTurns:8};
    const a=simulateRound({...config,policies:[firstPolicy,firstPolicy]});
    const b=simulateRound({...config,policies:[mutator,firstPolicy]});
    expect(b.diceHash).toBe(a.diceHash);expect(b.traceHash).toBe(a.traceHash);expect(b.score).toEqual(a.score);
  });
  it('rejects invalid options or policy failures without recording fabricated results',()=>{
    expect(()=>simulateRound({seed:'x',aColor:2 as E.Player,policies:[firstPolicy,firstPolicy]})).toThrow();
    expect(()=>simulateRound({seed:'x',aColor:0,maxTurns:0,policies:[firstPolicy,firstPolicy]})).toThrow();
    const bad:BotPolicy={id:'bad',choose(){throw new Error('bad policy');}};
    expect(()=>simulateRound({seed:'x',aColor:0,policies:[bad,bad]})).toThrow(/bad policy/);
  });
  it('runs the actual strategy and random opponents through checked play',()=>{
    const result=simulateRound({seed:'strategy-smoke',aColor:1,policies:[strategyPolicy,randomPolicy],maxTurns:8});
    expect(result.turns).toBe(8); expect(result.traceHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
