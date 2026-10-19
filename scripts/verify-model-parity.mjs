import {loadModelArtifact} from './lib/model-artifact.mjs';
const usage='Usage: node scripts/verify-model-parity.mjs --model DIR';
try{
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='--help')console.log(usage);
  else{
    if(args.length!==2||args[0]!=='--model'||!args[1]||args[1].startsWith('--'))throw Error(usage);
    console.log(JSON.stringify((await loadModelArtifact(args[1])).parityResult));
  }
}catch(error){process.stderr.write((error instanceof Error?error.message:String(error))+'\n');process.exitCode=1;}
