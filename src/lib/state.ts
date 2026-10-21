import type {Position} from './engine';
import type {PreRollState} from './bot/types';

/** Internal identity for valid engine positions: 24 points, counts/off 0..15,
 * top null/0/1. Each point occupies one UTF-16 code unit; off counts occupy one
 * more. Fixed-width fields make this an exact encoding, not a hash. */
export function positionKey(position:Position):string {
  let key='';
  for(const point of position.points){
    const top=point.top===null?0:point.top+1;
    key+=String.fromCharCode(point.count[0]+16*point.count[1]+256*top);
  }
  return key+String.fromCharCode(position.off[0]+16*position.off[1]);
}

/** Dice are single digits 1..6; canonical order retains length/multiplicity. */
export function turnKey(position:Position,dice:number[]):string {
  return positionKey(position)+[...dice].sort((a,b)=>a-b).join('');
}

export function preRollKey(state:PreRollState,depth:number):string {
  return positionKey(state.position)+String.fromCharCode(state.active,state.score[0],state.score[1],depth);
}
