import {mkdir,open,readFile,writeFile,rename} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {encodePreRoll,INPUT_SIZE,FEATURE_SCHEMA_VERSION} from '../src/lib/bot/encoding.ts';
import {RULES_VERSION} from '../src/lib/bot/versions.ts';
import {RNG_VERSION} from '../src/lib/bot/seeded.ts';
import {teacherGroup,buildRoundPairs} from './lib/teacher-pairs.mjs';
import {TEACHER,teacherInputs,teacherAfterstates,validateRecordedTurns} from './lib/teacher-data.mjs';
import {validatePoolSnapshot,selectPoolPolicies} from './lib/opponent-pool.mjs';

const usage='Usage: node scripts/prepare-training.mjs --dataset DIR --out NEW_DIR [--seed SPLIT_SEED] [--teacher strategy --turns-per-round 16] [--ranking true]';
const sha=value=>createHash('sha256').update(value).digest('hex');
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const pair=(v,max)=>Array.isArray(v)&&v.length===2&&[v[0],v[1]].every(n=>integer(n,0,max));
const message=e=>e instanceof Error?e.message:String(e);
async function fingerprint(path){let bytes=0;const hash=createHash('sha256');for await(const chunk of createReadStream(path)){bytes+=chunk.length;hash.update(chunk);}return {bytes,sha256:hash.digest('hex')};}
async function prepare(values){
  const dataset=resolve(values.dataset),out=resolve(values.out),splitSeed=values.seed;
  const sourceBytes=await readFile(join(dataset,'manifest.json')),source=JSON.parse(sourceBytes);
  if(source.format!=='mahbusa-self-play-dataset'||![1,2,3].includes(source.version)||source.status!=='complete'
    ||source.rulesVersion!==RULES_VERSION||source.rngVersion!==RNG_VERSION||!integer(source.rounds,2,10000)
    ||source.attemptedRounds!==source.rounds||source.completedRounds!==source.rounds||!Array.isArray(source.incompleteRounds)||source.incompleteRounds.length
    ||!integer(source.maxTurns,1,100000)||!integer(source.examples,1,1000000000)
    ||typeof source.seed!=='string'||!source.seed||source.seed.length>256||typeof source.policy!=='string'||!source.policy||source.policy.length>80
    ||typeof source.sourceRevision!=='string'||!/^[a-f0-9]{40}$/.test(source.sourceRevision)||typeof source.sourceDirty!=='boolean'
    ||source.dataset?.path!=='rounds.jsonl'||!digest(source.dataset.sha256)||!integer(source.dataset.bytes,1,Number.MAX_SAFE_INTEGER))throw Error('Invalid or incomplete self-play manifest.');
  if(source.version===3&&source.turnRecording!=='rolled-turn-input-v1')throw Error('Invalid turn recording version.');
  const pool=source.version===2||source.version===3&&source.pool?validatePoolSnapshot(source.pool):null;
  if(pool&&source.policy!=='pool-v1/'+pool.sha256)throw Error('Pool identity mismatch.');
  const gitOptions={cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'};
  const sourceRevision=execFileSync('git',['rev-parse','HEAD'],gitOptions).trim();
  const sourceDirty=!!execFileSync('git',['status','--porcelain'],gitOptions).trim();
  await mkdir(dirname(out),{recursive:true});await mkdir(out);
  const manifest={format:'mahbusa-training-data',version:values.ranking?3:values.teacher?2:1,status:'running',featureSchemaVersion:FEATURE_SCHEMA_VERSION,
    rulesVersion:RULES_VERSION,inputSize:INPUT_SIZE,recordSize:106,endian:'little',splitVersion:'round-sha256-v1',splitSeed,
    sourceRevision,sourceDirty,sourceDataset:{...source,manifestSha256:sha(sourceBytes)},rounds:[],
    train:{path:'train.f32',rounds:0,examples:0},validation:{path:'validation.f32',rounds:0,examples:0}};
  if(values.teacher){manifest.teacher={...TEACHER,...(source.version===3?{sampling:'even-played-turns-v1'}:{}),turnsPerRound:values.turnsPerRound};manifest.validationTurns={path:'validation-turns.jsonl',turns:0};}
  if(values.ranking)manifest.pairs={format:'best-turn-pairs-v1',recordBytes:24,train:{path:'train-pairs.bin',count:0},validation:{path:'validation-pairs.bin',count:0}};
  const handles={};let input,lines,audit;
  try{
    await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
    for(const split of ['train','validation'])handles[split]=await open(join(out,manifest[split].path),'wx');
    if(values.ranking)for(const split of ['train','validation'])handles[split+'Pairs']=await open(join(out,manifest.pairs[split].path),'wx');
    if(values.teacher)audit=await open(join(out,manifest.validationTurns.path),'wx');
    const inputHash=createHash('sha256');let consumed=0,totalExamples=0;
    input=createReadStream(join(dataset,'rounds.jsonl'));
    input.on('data',chunk=>{consumed+=chunk.length;inputHash.update(chunk);});
    lines=createInterface({input,crlfDelay:Infinity});
    for await(const line of lines){
      const row=JSON.parse(line),r=row.result,index=manifest.rounds.length;
      const expectedSeed=sha(JSON.stringify(['self-play-v1',source.seed,index]));
      const expectedPolicies=pool?selectPoolPolicies(pool,source.seed,index):[source.policy,source.policy];
      if(row.format!=='mahbusa-self-play-round'||row.version!==(source.version===3?2:1)||row.index!==index||index>=source.rounds
        ||r?.status!=='complete'||r.seed!==expectedSeed||r.aColor!==index%2||![0,1].includes(r.winner)
        ||!Array.isArray(r.policies)||r.policies.length!==2||r.policies.some((p,i)=>p!==expectedPolicies[i])
        ||!pair(r.score,4)||r.score[r.winner]<3||r.score[1-r.winner]>=3||!integer(r.turns,1,source.maxTurns)
        ||!integer(r.games,1,5)||!Array.isArray(row.examples)||row.examples.length!==r.turns)throw Error('Invalid/duplicate/incomplete self-play round.');
      if(source.version===3)validateRecordedTurns(row);
      const winnerColor=r.winner===0?r.aColor:1-r.aColor;
      const fraction=createHash('sha256').update(JSON.stringify(['training-split-v1',splitSeed,r.seed])).digest().readUInt32BE(0)/4294967296;
      const split=fraction<.2?'validation':'train';
      // Validate every source example even when teacher sampling omits it.
      for(const example of row.examples){
        const state=example.state;
        if(!state||Object.keys(state).sort().join(',')!=='active,position,score'
          ||example.target!==(state.active===winnerColor?1:-1))throw Error('Invalid pre-roll state or final-round target.');
        encodePreRoll(state);
      }
      const roots=values.teacher?teacherInputs(row,values.turnsPerRound):[];
      const groups=values.ranking?roots.map(r=>teacherGroup(r.input)):null;
      const examples=groups?groups.flatMap(g=>g.examples):values.teacher?roots.flatMap(r=>teacherAfterstates(r.input)):row.examples;
      const preferences=groups?buildRoundPairs(groups,manifest[split].examples):null;
      if(preferences){await handles[split+'Pairs'].writeFile(preferences.bytes);manifest.pairs[split].count+=preferences.count;}
      if(!integer(examples.length,1,100000))throw Error('Invalid teacher example count.');
      if(audit&&split==='validation')for(const root of roots){
        await audit.writeFile(JSON.stringify({roundIndex:index,roundSeed:r.seed,turnIndex:root.index,input:root.input})+'\n');
        manifest.validationTurns.turns++;
      }
      const record=Buffer.alloc(examples.length*106*4);let offset=0;
      for(const example of examples){
        const state=example.state;
        const encoded=encodePreRoll(state);
        for(const value of encoded){record.writeFloatLE(value,offset);offset+=4;}
        record.writeFloatLE(values.teacher?example.target:example.target===1?1:0,offset);record.writeFloatLE(1/examples.length,offset+4);offset+=8;
      }
      await handles[split].writeFile(record);
      manifest.rounds.push({index,seed:r.seed,split,examples:examples.length,...(values.teacher?{sourceTurns:row.examples.length}:{}),...(preferences?{groups:preferences.metadata,pairs:preferences.count}:{})});
      manifest[split].examples+=examples.length;manifest[split].rounds++;totalExamples+=row.examples.length;
      process.stderr.write('Prepared round '+(index+1)+'/'+source.rounds+'\n');
    }
    if(consumed!==source.dataset.bytes||inputHash.digest('hex')!==source.dataset.sha256)throw Error('Source dataset checksum mismatch.');
    if(manifest.rounds.length!==source.rounds||totalExamples!==source.examples)throw Error('Source dataset count mismatch.');
    if(!manifest.train.rounds||!manifest.validation.rounds)throw Error('Both training and validation rounds are required.');
    if(values.ranking&&(!manifest.pairs.train.count||!manifest.pairs.validation.count))throw Error('Both splits need preference pairs.');
    manifest.status='complete';
  }catch(error){manifest.status='failed';manifest.error=message(error);}
  finally{
    lines?.close();input?.destroy();
    for(const handle of [...Object.values(handles),...(audit?[audit]:[])])try{await handle.close();}catch(error){manifest.status='failed';manifest.error=message(error);}
  }
  for(const split of ['train','validation'])try{Object.assign(manifest[split],await fingerprint(join(out,manifest[split].path)));}
  catch(error){manifest.status='failed';manifest.error=message(error);}
  if(manifest.validationTurns)try{Object.assign(manifest.validationTurns,await fingerprint(join(out,manifest.validationTurns.path)));}
  catch(error){manifest.status='failed';manifest.error=message(error);}
  if(manifest.pairs)for(const split of ['train','validation'])try{Object.assign(manifest.pairs[split],await fingerprint(join(out,manifest.pairs[split].path)));}
  catch(error){manifest.status='failed';manifest.error=message(error);}
  await writeFile(join(out,'manifest.tmp'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  await rename(join(out,'manifest.tmp'),join(out,'manifest.json'));
  process.stdout.write(JSON.stringify(manifest,null,2)+'\n');
  if(manifest.status==='failed'){process.stderr.write(manifest.error+'\n');process.exitCode=1;}
}
try{
  const args=process.argv.slice(2),values={seed:'mahbusa-training-split-v1'},seen=new Set();
  if(args.length===1&&args[0]==='--help')console.log(usage);
  else{
    for(let i=0;i<args.length;i+=2){const key=args[i]?.slice(2),value=args[i+1];
      if(!args[i].startsWith('--')||!['dataset','out','seed','teacher','turns-per-round','ranking'].includes(key)||seen.has(key)||!value||value.startsWith('--'))throw Error(usage);
      seen.add(key);values[key]=value;
    }
    if(!values.dataset||!values.out||values.seed.length>256||values.teacher&&values.teacher!=='strategy'
      ||seen.has('turns-per-round')&&!values.teacher)throw Error(usage);
    if(values.ranking!==undefined&&(values.ranking!=='true'||!values.teacher))throw Error(usage);
    values.ranking=values.ranking==='true';
    values.turnsPerRound=Number(values['turns-per-round']??16);
    if(!integer(values.turnsPerRound,1,128))throw Error(usage);
    await prepare(values);
  }
}catch(error){process.stderr.write(message(error)+'\n');process.exitCode=1;}
