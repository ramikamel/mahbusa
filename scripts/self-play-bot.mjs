import {mkdir,open,writeFile,rename} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {generateSelfPlayRound} from '../src/lib/bot/self-play.ts';
import {strategyPolicy,RULES_VERSION} from '../src/lib/bot/simulation.ts';
import {createSeededRandom,RNG_VERSION} from '../src/lib/bot/seeded.ts';
import {createSearchPolicy} from '../src/lib/bot/search-policy.ts';

const usage='Usage: node scripts/self-play-bot.mjs [--seed VALUE] [--rounds 1..10000] [--max-turns 1..100000] [--policy strategy|search] --out NEW_DIRECTORY';
const policies={strategy:strategyPolicy,search:createSearchPolicy()};
const message=error=>error instanceof Error?error.message:String(error);
async function fingerprint(path){
  const hash=createHash('sha256');let bytes=0;
  for await(const chunk of createReadStream(path)){bytes+=chunk.length;hash.update(chunk);}
  return {path:'rounds.jsonl',bytes,sha256:hash.digest('hex')};
}
async function generate(values){
  const out=resolve(values.out),seed=values.seed,rounds=Number(values.rounds),maxTurns=Number(values['max-turns']);
  const policy=policies[values.policy];
  const gitOptions={cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'};
  const sourceRevision=execFileSync('git',['rev-parse','HEAD'],gitOptions).trim();
  const sourceDirty=!!execFileSync('git',['status','--porcelain','--untracked-files=normal'],gitOptions).trim();
  // Claim a new directory exclusively; never change any existing dataset.
  await mkdir(dirname(out),{recursive:true});await mkdir(out);
  const manifest={format:'mahbusa-self-play-dataset',version:1,status:'running',seed,rounds,maxTurns,
    policy:policy.id,rngVersion:RNG_VERSION,rulesVersion:RULES_VERSION,sourceRevision,sourceDirty,
    startedAt:new Date().toISOString(),attemptedRounds:0,completedRounds:0,examples:0,incompleteRounds:[],
    dataset:{path:'rounds.jsonl',bytes:null,sha256:null}};
  let handle;
  try{
    await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
    handle=await open(join(out,'rounds.jsonl'),'wx');
    for(let index=0;index<rounds;index++){
      const round=generateSelfPlayRound({seed,index,maxTurns,policy});
      manifest.attemptedRounds++;
      if(round.result.status==='complete'){
        await handle.writeFile(JSON.stringify(round)+'\n');
        manifest.completedRounds++;manifest.examples+=round.examples.length;
      }else manifest.incompleteRounds.push({index,seed:round.result.seed});
      process.stderr.write('Round '+(index+1)+'/'+rounds+' '+round.result.status+'\n');
    }
    await handle.close();handle=undefined;
    manifest.status=manifest.incompleteRounds.length?'incomplete':'complete';
  }catch(error){manifest.status='failed';manifest.error=message(error);}
  finally{if(handle)try{await handle.close();}catch(error){manifest.status='failed';manifest.error=message(error);}}
  try{manifest.dataset=await fingerprint(join(out,'rounds.jsonl'));}
  catch(error){manifest.status='failed';manifest.error=message(error);}
  manifest.finishedAt=new Date().toISOString();
  // Interrupted processes retain a running manifest, never a false completion.
  const temporary=join(out,'manifest.tmp');
  await writeFile(temporary,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  await rename(temporary,join(out,'manifest.json'));
  process.stdout.write(JSON.stringify(manifest,null,2)+'\n');
  if(manifest.error)process.stderr.write(manifest.error+'\n');
  process.exitCode=manifest.status==='complete'?0:manifest.status==='incomplete'?2:1;
}
try{
  const args=process.argv.slice(2),values={seed:'mahbusa-self-play-v1',rounds:'100','max-turns':'2000',policy:'strategy'};
  if(args.length===1&&args[0]==='--help')console.log(usage);
  else{
    const seen=new Set();
    for(let i=0;i<args.length;i+=2){
      const key=args[i]?.slice(2),value=args[i+1];
      if(!args[i].startsWith('--')||!['seed','rounds','max-turns','out','policy'].includes(key)||seen.has(key)||!value||value.startsWith('--'))throw new Error('Invalid or duplicate argument. '+usage);
      seen.add(key);values[key]=value;
    }
    if(!values.out||!Object.hasOwn(policies,values.policy)||!/^\d+$/.test(values.rounds)||!/^\d+$/.test(values['max-turns'])
      ||!Number.isInteger(Number(values.rounds))||Number(values.rounds)<1||Number(values.rounds)>10000
      ||!Number.isInteger(Number(values['max-turns']))||Number(values['max-turns'])<1||Number(values['max-turns'])>100000)throw new Error('Invalid self-play option. '+usage);
    createSeededRandom(values.seed,'validate');
    await generate(values);
  }
}catch(error){process.stderr.write(message(error)+'\n');process.exitCode=1;}
