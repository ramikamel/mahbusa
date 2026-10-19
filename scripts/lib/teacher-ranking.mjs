import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {teacherGroup,buildRoundPairs} from './teacher-pairs.mjs';
import {TEACHER,teacherDice,teacherAfterstates,playedRolls} from './teacher-data.mjs';
import {encodePreRoll} from '../../src/lib/bot/encoding.ts';
import {rankStrategyTurns} from '../../src/lib/bot/rank-strategy.ts';
import {createGame,startPoint} from '../../src/lib/engine.ts';
import {replayPlan} from '../../src/lib/bot/replay.ts';
import {createSeededRandom} from '../../src/lib/bot/seeded.ts';
const sha=b=>createHash('sha256').update(b).digest('hex');
const digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const integer=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
export async function loadTeacherValidation(directory){
  const dir=resolve(directory),raw=await readFile(join(dir,'manifest.json')),m=JSON.parse(raw);
  if(m?.format!=='mahbusa-training-data'||![2,3].includes(m.version)||m.status!=='complete'||m.rulesVersion!=='mahbusa-engine-v1'
    ||m.featureSchemaVersion!=='mahbusa-pre-roll-v1'||m.inputSize!==104||m.recordSize!==106||m.endian!=='little'
    ||m.splitVersion!=='round-sha256-v1'||typeof m.splitSeed!=='string'||!m.splitSeed.length||m.splitSeed.length>256
    ||Object.entries(TEACHER).some(([k,v])=>k!=='sampling'&&m.teacher?.[k]!==v)||!['even-turns-independent-roll-v1','even-played-turns-v1'].includes(m.teacher?.sampling)||!integer(m.teacher?.turnsPerRound,1,128)
    ||!Array.isArray(m.rounds)||!integer(m.rounds.length,2,10000))throw Error('Invalid teacher data manifest.');
  const seen=new Set();
  for(const [i,r] of m.rounds.entries()){
    if(r.index!==i||!digest(r.seed)||seen.has(r.seed)||!integer(r.examples,1,100000)||!integer(r.sourceTurns,1,100000))throw Error('Invalid teacher round.');
    seen.add(r.seed);
    const fraction=createHash('sha256').update(JSON.stringify(['training-split-v1',m.splitSeed,r.seed])).digest().readUInt32BE(0)/2**32;
    if(r.split!==(fraction<.2?'validation':'train'))throw Error('Teacher split identity mismatch.');
  }
  if(m.version!==3&&m.pairs)throw Error('Preference pairs require prepared version3.');
  let validation,validationPairs;
  for(const split of ['train','validation']){
    const meta=m[split],rows=m.rounds.filter(r=>r.split===split),count=rows.reduce((n,r)=>n+r.examples,0);
    if(!rows.length||meta?.path!==split+'.f32'||meta.rounds!==rows.length||meta.examples!==count||meta.bytes!==count*106*4||!digest(meta.sha256))throw Error('Invalid teacher shard metadata.');
    const bytes=await readFile(join(dir,meta.path));
    if(bytes.length!==meta.bytes||sha(bytes)!==meta.sha256)throw Error('Teacher shard checksum mismatch.');
    if(split==='validation')validation=bytes;
  }
  if(m.version===3){
    if(m.pairs?.format!=='best-turn-pairs-v1'||m.pairs.recordBytes!==24)throw Error('Invalid pair format.');
    for(const split of ['train','validation']){
      const meta=m.pairs[split],rows=m.rounds.filter(r=>r.split===split);
      if(rows.some(r=>!integer(r.pairs,0,r.examples)))throw Error('Invalid round pair count.');
      const count=rows.reduce((n,r)=>n+r.pairs,0);
      if(!count||meta?.path!==split+'-pairs.bin'||meta.count!==count||meta.bytes!==count*24||!digest(meta.sha256))throw Error('Invalid pair metadata.');
      const bytes=await readFile(join(dir,meta.path));
      if(bytes.length!==meta.bytes||sha(bytes)!==meta.sha256)throw Error('Pair checksum mismatch.');
      if(split==='validation')validationPairs=bytes;
    }
  }
  const meta=m.validationTurns;
  if(meta?.path!=='validation-turns.jsonl'||!integer(meta.turns,1,1280000)||!digest(meta.sha256))throw Error('Invalid teacher roots.');
  const bytes=await readFile(join(dir,meta.path));
  if(bytes.length!==meta.bytes||sha(bytes)!==meta.sha256)throw Error('Teacher roots checksum mismatch.');
  const roots=bytes.toString().trimEnd().split('\n').map(JSON.parse);let cursor=0,offset=0,pairOffset=0;
  for(const r of m.rounds.filter(r=>r.split==='validation')){
    const rowStart=offset/(106*4),groups=[];
    const count=Math.min(r.sourceTurns,m.teacher.turnsPerRound);let examples=0;
    const rolls=m.teacher.sampling==='even-played-turns-v1'?playedRolls(r.seed,r.sourceTurns):null;
    for(let i=0;i<count;i++){
      const root=roots[cursor++],index=count===1?0:Math.floor(i*(r.sourceTurns-1)/(count-1));
      if(root?.roundIndex!==r.index||root.roundSeed!==r.seed||root.turnIndex!==index)throw Error('Validation root is outside its held-out round.');
      // Check independent dice and regenerate numeric targets from this exact input.
      const expectedDice=rolls?rolls[index]:teacherDice(r.seed,index);
      if(JSON.stringify(root.input?.remaining)!==JSON.stringify(expectedDice))throw Error('Teacher root dice mismatch.');
      const group=m.version===3?teacherGroup(root.input):null;if(group)groups.push(group);
      for(const example of group?group.examples:teacherAfterstates(root.input)){
        const record=Buffer.alloc(106*4);encodePreRoll(example.state).forEach((v,j)=>record.writeFloatLE(v,j*4));
        record.writeFloatLE(example.target,104*4);record.writeFloatLE(1/r.examples,105*4);
        if(!record.equals(validation.subarray(offset,offset+record.length)))throw Error('Validation root/encoded target mismatch.');
        offset+=record.length;examples++;
      }
    }
    if(examples!==r.examples)throw Error('Validation root example count mismatch.');
    if(m.version===3){
      const pairs=buildRoundPairs(groups,rowStart);
      if(JSON.stringify(pairs.metadata)!==JSON.stringify(r.groups)||pairs.count!==r.pairs
        ||!pairs.bytes.equals(validationPairs.subarray(pairOffset,pairOffset+pairs.bytes.length)))throw Error('Validation preference group/pair mismatch.');
      pairOffset+=pairs.bytes.length;
    }
  }
  if(cursor!==roots.length||cursor!==meta.turns||offset!==validation.length)throw Error('Validation root count mismatch.');
  if(validationPairs&&pairOffset!==validationPairs.length)throw Error('Validation pair count mismatch.');
  return {manifest:m,manifestSha256:sha(raw),roots};
}
export function evaluateTeacherRanking(policy,roots){
  let agreements=0,choiceTurns=0,choiceAgreements=0,regret=0,maxRegret=0,avoidableMotherExposure=0,exactWinTurns=0;
  const signature=p=>JSON.stringify([p.position,p.remaining,p.outcome]);
  for(const [i,root] of roots.entries()){
    const input=structuredClone(root.input),ranked=rankStrategyTurns(input);
    const plan=policy.choose(structuredClone(input),createSeededRandom('teacher-ranking-v1',String(i)));
    replayPlan({...createGame(),...structuredClone(input),phase:'moving'},plan);
    const chosen=ranked.find(r=>signature(r.plan)===signature(plan));
    if(!chosen)throw Error('Policy result is absent from complete legal turns.');
    const gap=Math.max(0,ranked[0].value.value-chosen.value.value),agrees=gap<=1e-7;
    agreements+=Number(agrees);regret+=gap;maxRegret=Math.max(maxRegret,gap);
    if(ranked.length>1){choiceTurns++;choiceAgreements+=Number(agrees);}
    if(ranked.some(r=>r.kind==='round-win'))exactWinTurns++;
    const exposed=p=>p.position.points[startPoint(input.active)].count[input.active]===1;
    const safe=p=>p.outcome?.winner===input.active||!exposed(p);
    if(!safe(plan)&&ranked.some(r=>safe(r.plan)))avoidableMotherExposure++;
  }
  return {turns:roots.length,agreements,agreement:agreements/roots.length,choiceTurns,choiceAgreements,
    choiceAgreement:choiceTurns?choiceAgreements/choiceTurns:null,meanTeacherRegret:regret/roots.length,maxTeacherRegret:maxRegret,
    avoidableMotherExposure,exactWinTurns};
}
