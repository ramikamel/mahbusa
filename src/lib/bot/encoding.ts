import {other} from '../engine.ts';
import {validateSearchState} from './validation.ts';
import type {PreRollState} from './types';

export const FEATURE_SCHEMA_VERSION='mahbusa-pre-roll-v1';
export const INPUT_SIZE=104;
/** Active's home-to-start coordinates, independent of absolute checker color. */
export function encodePreRoll(state:PreRollState):Float32Array {
  validateSearchState({...state,remaining:[]});
  const own=state.active,opponent=other(own),features:number[]=[];
  for(let d=1;d<=24;d++){
    const point=state.position.points[own===0?d-1:24-d];
    features.push(point.count[own]/15,point.count[opponent]/15,point.top===own?1:0,point.top===opponent?1:0);
  }
  features.push(state.position.off[own]/15,state.position.off[opponent]/15);
  for(const player of [own,opponent])for(let score=0;score<3;score++)features.push(state.score[player]===score?1:0);
  return new Float32Array(features);
}
