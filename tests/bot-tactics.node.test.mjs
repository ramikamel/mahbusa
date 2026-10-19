import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {emptyPosition,generateTurns} from '../src/lib/engine.ts';
import {loadDenseModel} from '../src/lib/bot/dense-model.ts';
import {createModelPolicy} from '../src/lib/bot/model-policy.ts';
import {evaluateMotherTactics} from '../scripts/lib/mother-tactics.mjs';
import {makeArtifact,writeArtifact,sha} from './helpers/model-artifact.mjs';
const cli=fileURLToPath(new URL('../scripts/check-bot-tactics.mjs',import.meta.url));
const run=args=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:20000});
const fixtures=cases=>({format:'mahbusa-model-tactics',version:1,rulesVersion:'mahbusa-engine-v1',cases});
function input(stacks,dice){const position=emptyPosition();for(const [point,light,dark] of stacks)position.points[point]={count:[light,dark],top:light?0:1};return {position,active:0,remaining:dice,score:[0,0]};}
function reflect(state){return {...state,active:1,score:[...state.score].reverse(),position:{off:[...state.position.off].reverse(),points:[...state.position.points].reverse().map(p=>({count:[...p.count].reverse(),top:p.top===null?null:1-p.top}))}};}
async function vulnerableModel(){const w=new Float32Array(30081);w[1]=1;w[13440]=1;w[29952]=1;const a=makeArtifact(w);return createModelPolicy(await loadDenseModel(a.manifest,a.bytes),a.manifest.sha256);}
test('tactical check catches avoidable mother exposure in both colors through actual model choices',async()=>{
  const state=input([[23,2,0],[12,13,0],[0,0,15]],[1]),before=structuredClone(state),policy=await vulnerableModel();
  const report=evaluateMotherTactics(policy,fixtures([{id:'light',state},{id:'dark',state:reflect(state)}]));
  assert.equal(report.status,'failed');assert.equal(report.failed,2);assert.equal(report.passed,0);
  assert.deepEqual(report.cases.map(c=>c.reason),['avoidable-exposure','avoidable-exposure']);
  assert.deepEqual(report.cases.map(c=>c.safeAlternatives),[1,1]);assert.deepEqual(state,before);
  assert.deepEqual(report.cases[0].moves,[{from:23,to:22,die:1}]);
});
test('forced exposure and an immediate winning game remain valid tactical exceptions',async()=>{
  const forced=input([[23,2,0],[12,13,0],[11,0,2],[0,0,13]],[1]);
  const a=evaluateMotherTactics(await vulnerableModel(),fixtures([{id:'forced',state:forced}]));
  assert.equal(a.status,'passed');assert.equal(a.cases[0].safeAlternatives,0);assert.equal(a.cases[0].reason,'forced');
  const winning=input([[23,2,0],[1,1,0],[12,12,0],[0,0,1],[8,0,14]],[1,1]);winning.score=[1,0];
  const policy={id:'winning-tactical-fixture',choose:state=>generateTurns(state).find(p=>p.outcome?.winner===0&&p.position.points[23].count[0]===1)};
  const b=evaluateMotherTactics(policy,fixtures([{id:'win',state:winning}]));
  assert.equal(b.status,'passed');assert.equal(b.cases[0].reason,'win');assert.ok(b.cases[0].moves.some(m=>m.from===23));
});
test('invalid tactical fixtures and illegal selected turns are errors rather than passes',async()=>{
  const policy=await vulnerableModel(),state=input([[23,2,0],[12,13,0],[0,0,15]],[1]);
  for(const raw of [null,fixtures([]),{...fixtures([{id:'x',state}]),rulesVersion:'other'},
    fixtures([{id:'x',state},{id:'x',state}]),fixtures([{id:'x',state:{...state,score:[3,0]}}])])assert.throws(()=>evaluateMotherTactics(policy,raw));
  assert.throws(()=>evaluateMotherTactics({id:'illegal',choose:()=>({moves:[],position:state.position,remaining:[1],outcome:null})},fixtures([{id:'x',state}])));
});
test('tactics CLI gates real model files, reports actual fixture hash and preserves existing output',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'mahbusa-tactics-'));
  try{
    const model=join(dir,'model'),out=join(dir,'report.json'),artifact=await writeArtifact(model);
    const result=run(['--model',model,'--out',out]),report=JSON.parse(result.stdout);
    assert.equal(result.status,report.status==='passed'?0:2,result.stderr);assert.equal(report.cases.length,3);
    assert.equal(report.modelArtifact.weightsSha256,artifact.manifest.sha256);
    const raw=await readFile(new URL('./fixtures/model-tactics-v1.json',import.meta.url));assert.equal(report.fixturesSha256,sha(raw));
    assert.deepEqual(JSON.parse(await readFile(out,'utf8')),report);
    const saved=await readFile(out);assert.equal(run(['--model',model,'--out',out]).status,1);assert.deepEqual(await readFile(out),saved);
    await writeFile(join(model,'weights.bin'),Buffer.alloc(4));assert.equal(run(['--model',model]).status,1);
    assert.equal(run(['--help']).status,0);for(const args of [[],['--wat','x'],['--model',model,'--model',model]])assert.equal(run(args).status,1);
  }finally{await rm(dir,{recursive:true,force:true});}
});
