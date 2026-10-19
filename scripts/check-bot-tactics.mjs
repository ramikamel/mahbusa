import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolvePolicy} from './lib/resolve-policy.mjs';
import {evaluateMotherTactics} from './lib/mother-tactics.mjs';
const usage='Usage: node scripts/check-bot-tactics.mjs --model DIR [--out NEW_FILE]';
try{
  const args=process.argv.slice(2),values={},seen=new Set();
  if(args.length===1&&args[0]==='--help')console.log(usage);
  else{
    for(let i=0;i<args.length;i+=2){const key=args[i]?.slice(2),value=args[i+1];
      if(!args[i].startsWith('--')||!['model','out'].includes(key)||seen.has(key)||!value||value.startsWith('--'))throw Error(usage);
      seen.add(key);values[key]=value;
    }
    if(!values.model)throw Error(usage);
    const {policy,modelArtifact}=await resolvePolicy('model',values.model);
    const fixtures=await readFile(new URL('../tests/fixtures/model-tactics-v1.json',import.meta.url));
    const gitOptions={cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'};
    const report={...evaluateMotherTactics(policy,JSON.parse(fixtures)),modelArtifact,
      fixturesSha256:createHash('sha256').update(fixtures).digest('hex'),
      sourceRevision:execFileSync('git',['rev-parse','HEAD'],gitOptions).trim(),
      sourceDirty:!!execFileSync('git',['status','--porcelain'],gitOptions).trim()};
    const text=JSON.stringify(report,null,2)+'\n';
    if(values.out){const out=resolve(values.out);await mkdir(dirname(out),{recursive:true});await writeFile(out,text,{flag:'wx'});}
    process.stdout.write(text);process.exitCode=report.status==='passed'?0:2;
  }
}catch(error){process.stderr.write((error instanceof Error?error.message:String(error))+'\n');process.exitCode=1;}
