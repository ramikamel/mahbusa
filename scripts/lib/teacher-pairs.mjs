import {generateTurns} from '../../src/lib/engine.ts';
import {continuationAfterTurn} from '../../src/lib/bot/continuation.ts';
import {teacherAfterstates} from './teacher-data.mjs';

export function teacherGroup(input){
  const examples=teacherAfterstates(input);
  const terminal=generateTurns(input).some(plan=>continuationAfterTurn(input,plan).kind==='round-win');
  return {examples,signs:examples.map(r=>r.state.active===input.active?1:-1),terminal};
}
/** Preferences use the same rounded targets the numeric learner consumes. */
export function buildRoundPairs(groups,startRow){
  const pairs=[],metadata=[];let offset=startRow;
  for(const {examples,signs,terminal} of groups){
    metadata.push({signs:[...signs],terminal});
    if(examples.length&&!terminal){
      const values=examples.map((r,i)=>signs[i]*(2*Math.fround(r.target)-1));
      let best=0;for(let i=1;i<values.length;i++)if(values[i]>values[best])best=i;
      for(let i=0;i<values.length;i++){
        const gap=Math.fround(values[best]-values[i]);
        if(gap>1e-7)pairs.push([offset+best,offset+i,signs[best],signs[i],gap]);
      }
    }
    offset+=examples.length;
  }
  const bytes=Buffer.alloc(pairs.length*24);
  pairs.forEach((r,i)=>{
    const o=i*24;bytes.writeUInt32LE(r[0],o);bytes.writeUInt32LE(r[1],o+4);
    for(let j=2;j<5;j++)bytes.writeFloatLE(r[j],o+8+(j-2)*4);
    bytes.writeFloatLE(1/pairs.length,o+20);
  });
  return {metadata,count:pairs.length,bytes};
}
