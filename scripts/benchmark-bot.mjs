import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {runBenchmark} from '../src/lib/bot/benchmark.ts';
import {resolvePolicy} from './lib/resolve-policy.mjs';
const usage='Usage: node scripts/benchmark-bot.mjs [--seed VALUE] [--pairs 1..500] [--max-turns N] [--a strategy|search|random|first|model] [--b strategy|search|random|first|model] [--a-model DIR] [--b-model DIR] [--out PATH]';
try{
  const args=process.argv.slice(2),values={seed:'mahbusa-benchmark-v1',pairs:'100','max-turns':'2000',a:'strategy',b:'strategy'};
  let output;const seen=new Set();
  if(args.length===1&&args[0]==='--help')console.log(usage);
  else{
    for(let i=0;i<args.length;i+=2){
      const key=args[i]?.slice(2),value=args[i+1];
      if(!args[i].startsWith('--')||!['seed','pairs','max-turns','a','b','a-model','b-model','out'].includes(key)||seen.has(key)||!value||value.startsWith('--'))throw new Error('Invalid or duplicate argument. '+usage);
      seen.add(key);if(key==='out')output=value;else values[key]=value;
    }
    if(!/^\d+$/.test(values.pairs)||!/^\d+$/.test(values['max-turns']))throw new Error('Invalid benchmark option. '+usage);
    const entrants=await Promise.all([resolvePolicy(values.a,values['a-model']),resolvePolicy(values.b,values['b-model'])]);
    const gitOptions={cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'};
    const sourceRevision=execFileSync('git',['rev-parse','HEAD'],gitOptions).trim();
    const sourceDirty=!!execFileSync('git',['status','--porcelain','--untracked-files=normal'],gitOptions).trim();
    const report={...runBenchmark({seed:values.seed,pairs:Number(values.pairs),maxTurns:Number(values['max-turns']),policies:entrants.map(e=>e.policy),
      onPair:n=>process.stderr.write('Pair '+n+'/'+values.pairs+' complete\n')}),sourceRevision,sourceDirty,
      ...(entrants.some(e=>e.modelArtifact)?{modelArtifacts:entrants.map(e=>e.modelArtifact)}:{})};
    const text=JSON.stringify(report,null,2)+'\n';
    if(output){const path=resolve(output);await mkdir(dirname(path),{recursive:true});await writeFile(path,text,{flag:'wx'});}
    process.stdout.write(text);process.exitCode=report.metrics.truncatedRounds?2:0;
  }
}catch(error){process.stderr.write((error instanceof Error?error.message:String(error))+'\n');process.exitCode=1;}
