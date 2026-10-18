import {startPoint} from '../engine.ts';
import type {Position} from '../engine';
import type {SearchRequest} from './types';

export function record(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid object.');
  return value as Record<string,unknown>;
}
function pair(value:unknown,max:number):value is [number,number]{
  return Array.isArray(value)&&value.length===2&&[value[0],value[1]].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=max);
}
export function validatePosition(value:unknown):asserts value is Position {
  const pos=record(value);
  if(!pair(pos.off,15)||!Array.isArray(pos.points)||pos.points.length!==24)throw new Error('Invalid board.');
  const totals=[...pos.off];
  for(const raw of pos.points){
    const point=record(raw),count=point.count,top=point.top;
    if(!pair(count,15))throw new Error('Invalid checker count.');
    if(count[0]+count[1]===0){if(top!==null)throw new Error('Empty point has an owner.');}
    else{
      if(top!==0&&top!==1)throw new Error('Invalid top checker.');
      if(!count[top] || (count[1-top]>0&&count[1-top]!==1))throw new Error('Invalid pin or top checker.');
    }
    totals[0]+=count[0];totals[1]+=count[1];
  }
  if(totals.some(n=>n!==15))throw new Error('Checker conservation failed.');
}
export function validateSearchState(value:unknown):asserts value is SearchRequest['state'] {
  const state=record(value);
  if(state.active!==0&&state.active!==1)throw new Error('Invalid active player.');
  if(!pair(state.score,2))throw new Error('Invalid in-progress score.');
  const dice=state.remaining;
  if(!Array.isArray(dice)||dice.length>4||[...dice].some(d=>!Number.isInteger(d)||d<1||d>6)
    ||(dice.length>2&&new Set(dice).size!==1))throw new Error('Invalid remaining dice.');
  validatePosition(state.position);
  for(const player of [0,1] as const){
    const mother=state.position.points[startPoint(player)];
    if(state.position.off[player]===15||(mother.count[player]===1&&mother.top!==player))throw new Error('Board already has a winner.');
  }
}
export function searchIdentity(raw:unknown){
  const value=record(raw),{requestId,revision,modelId}=value;
  if(typeof requestId!=='string'||!requestId||requestId.length>80||!Number.isSafeInteger(revision)||(revision as number)<0
    ||typeof modelId!=='string'||!modelId||modelId.length>80)throw new Error('Invalid search identity.');
  return {requestId,revision:revision as number,modelId};
}
