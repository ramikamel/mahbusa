import {describe,expect,it} from 'vitest';
import {emptyPosition,initialPosition} from '../src/lib/engine';
import type {Player} from '../src/lib/engine';
import {positionKey,turnKey,preRollKey,copyPreRollState} from '../src/lib/state';

describe('collision-free keys for valid Mahbusa states',()=>{
  it('distinguishes point location, both checker counts, and the top color',()=>{
    const seen=new Map<string,string>();
    // Superset of legal point payloads: each count is at most 15, top has 3 values.
    // A packing error (e.g. dropping top or truncating a count) aliases distinct boards.
    for(let point=0;point<24;point++)for(let a=0;a<=15;a++)for(let b=0;b<=15;b++)for(const top of [null,0,1] as const){
      const board=emptyPosition();board.points[point]={count:[a,b],top};
      const semantic=JSON.stringify(board),key=positionKey(board),prior=seen.get(key);
      if(prior!==undefined)expect(prior).toBe(semantic);
      else seen.set(key,semantic);
    }
    expect(seen.size).toBe(1+24*(16*16*3-1));
  });

  it('distinguishes both off counts without colliding with point payloads',()=>{
    const keys=new Set<string>();
    for(let a=0;a<=15;a++)for(let b=0;b<=15;b++){
      const board=emptyPosition();board.off=[a,b];keys.add(positionKey(board));
    }
    expect(keys.size).toBe(256);
    const off=emptyPosition();off.off=[1,0];
    const point=emptyPosition();point.points[23]={count:[1,0],top:0};
    expect(positionKey(off)).not.toBe(positionKey(point));
  });

  it('normalizes dice order while retaining dice multiplicity and unused dice',()=>{
    const board=emptyPosition(),dice=[4,2],before=[...dice];
    expect(turnKey(board,dice)).toBe(turnKey(board,[2,4]));
    expect(dice).toEqual(before);
    const keys=[[],[1],[2],[1,2],[1,1],[1,1,1],[1,1,1,1],[6,6,6,6]].map(d=>turnKey(board,d));
    expect(new Set(keys).size).toBe(keys.length);
    const another=emptyPosition();another.off=[0,1];
    expect(turnKey(board,[1])).not.toBe(turnKey(another,[1]));
  });

  it('separates all score, active-player and search-depth cache identities',()=>{
    const position=emptyPosition(),keys=new Set<string>();
    for(const active of [0,1] as Player[])for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let depth=0;depth<=4;depth++){
      keys.add(preRollKey({position,active,score:[a,b]},depth));
    }
    expect(keys.size).toBe(90);
    const changed=emptyPosition();changed.off=[1,0];
    expect(preRollKey({position,active:0,score:[0,0]},0)).not.toBe(preRollKey({position:changed,active:0,score:[0,0]},0));
  });
});

describe('owned evaluator inputs',()=>{
  it('preserves every state field and isolates every mutable board/score field',()=>{
    const position=initialPosition();position.points[0].count[1]--;position.points[23].count[0]--;
    position.points[5]={count:[1,1],top:1};
    const input={position,active:1 as const,score:[1,2] as [number,number]},before=structuredClone(input);
    const copied=copyPreRollState(input);
    expect(copied).toEqual(before);
    copied.score[0]=99;copied.position.off[0]=99;
    copied.position.points[5].count[0]=99;copied.position.points[5].top=0;
    copied.position.points[0]={count:[0,0],top:null};
    copied.position.points.push({count:[0,0],top:null});
    expect(input).toEqual(before);
  });
});
