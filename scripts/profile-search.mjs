import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {searchTurns} from '../src/lib/bot/search.ts';

const root=fileURLToPath(new URL('..',import.meta.url));
const usage='Usage: node scripts/profile-search.mjs --out PATH [--nodes 1000|20000] [--repetitions 1..5]';
try{
 const args=process.argv.slice(2),values={nodes:'20000',repetitions:'3'},seen=new Set();
 for(let i=0;i<args.length;i+=2){
  const key=args[i]?.slice(2),value=args[i+1];
  if(!args[i].startsWith('--')||!['out','nodes','repetitions'].includes(key)||seen.has(key)||!value||value.startsWith('--'))throw Error(usage);
  seen.add(key);values[key]=value;
 }
 if(!values.out||!['1000','20000'].includes(values.nodes)||! /^[1-5]$/.test(values.repetitions))throw Error(usage);
 const bytes=await readFile(new URL('../tests/fixtures/exact-search-v1.json',import.meta.url)),corpus=JSON.parse(bytes);
 const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 const nodes=Number(values.nodes),repetitions=Number(values.repetitions),results=[],sweeps=[];
 const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const dirty=!!execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim();
 for(let repetition=-1;repetition<repetitions;repetition++){
  const sweepStart=performance.now();
  for(const row of corpus.roots){
   const started=performance.now(),result=searchTurns(row.input,{maxDepth:1,maxNodes:nodes,cacheEntries:10000}),wallMs=performance.now()-started;
   const expected=row.expected['search'+nodes];
   if(hash(result.plan)!==expected.planSha256||Math.abs(result.value.value-expected.value.value)>1e-12||result.value.kind!==expected.value.kind||result.stopReason!==expected.stopReason
    ||JSON.stringify({...result.stats,elapsedMs:0})!==JSON.stringify(expected.stats))throw Error('Frozen search changed: '+row.name);
   if(repetition>=0)results.push({name:row.name,repetition,wallMs,nodes:result.stats.nodes,completedDepth:result.stats.completedDepth,stopReason:result.stopReason});
  }
  const elapsed=performance.now()-sweepStart;
  if(repetition>=0)sweeps.push(elapsed);
  process.stderr.write((repetition<0?'Warmup':'Sweep '+(repetition+1))+' complete\n');
 }
 const sorted=[...sweeps].sort((a,b)=>a-b);
 const medianSweepMs=(sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.floor(sorted.length/2)])/2;
 const report={format:'mahbusa-exact-search-profile',version:1,sourceRevision:revision,sourceDirty:dirty,node:process.version,
  corpusSha256:createHash('sha256').update(bytes).digest('hex'),options:{maxDepth:1,maxNodes:nodes,cacheEntries:10000},repetitions,
  note:'One discarded warmup; sequential sweeps; local diagnostic, no CI speed threshold or device/strength qualification.',
  sweepsMs:sweeps,medianSweepMs,results};
 const path=resolve(values.out);await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({sourceRevision:revision,sourceDirty:dirty,roots:corpus.roots.length,sweepsMs:sweeps,medianSweepMs:report.medianSweepMs}));
}catch(error){process.stderr.write((error instanceof Error?error.message:String(error))+'\n');process.exitCode=1;}
