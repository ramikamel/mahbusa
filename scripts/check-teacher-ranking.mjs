import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createModelPolicy} from '../src/lib/bot/model-policy.ts';
import {loadModelArtifact} from './lib/model-artifact.mjs';
import {loadTeacherValidation,evaluateTeacherRanking} from './lib/teacher-ranking.mjs';
const usage='Usage: node scripts/check-teacher-ranking.mjs --data DIR --model DIR [--out NEW_FILE]';
try{
  const args=process.argv.slice(2),v={};
  if(args.length===1&&args[0]==='--help')console.log(usage);
  else{
    for(let i=0;i<args.length;i+=2){const key=args[i]?.slice(2),value=args[i+1];
      if(!args[i].startsWith('--')||!['data','model','out'].includes(key)||Object.hasOwn(v,key)||!value||value.startsWith('--'))throw Error(usage);
      v[key]=value;
    }
    if(!v.data||!v.model)throw Error(usage);
    const data=await loadTeacherValidation(v.data),loaded=await loadModelArtifact(v.model);
    if(!Array.isArray(loaded.training.splitHistory))throw Error('Model lacks checked split history.');
    const trained=new Set(loaded.training.splitHistory.filter(r=>r.split==='train').map(r=>r.seed));
    if(data.roots.some(r=>trained.has(r.roundSeed)))throw Error('Ranking validation rounds were used to train this model.');
    const policy=createModelPolicy(loaded.model,loaded.manifest.sha256);
    const cwd=fileURLToPath(new URL('..',import.meta.url)),git=args=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
    const report={format:'mahbusa-teacher-ranking-result',version:1,status:'complete',teacher:data.manifest.teacher,
      preparedManifestSha256:data.manifestSha256,validationTurnsSha256:data.manifest.validationTurns.sha256,
      modelArtifact:loaded.provenance,policyId:policy.id,rounds:data.manifest.validation.rounds,
      sourceRevision:git(['rev-parse','HEAD']),sourceDirty:!!git(['status','--porcelain']),
      ...evaluateTeacherRanking(policy,data.roots)};
    const text=JSON.stringify(report,null,2)+'\n';if(v.out)await writeFile(v.out,text,{flag:'wx'});process.stdout.write(text);
  }
}catch(error){console.error(error.message);process.exitCode=1;}
