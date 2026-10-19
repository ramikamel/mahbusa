import {createGame,generateTurns,startPoint} from '../../src/lib/engine.ts';
import {validateSearchState} from '../../src/lib/bot/validation.ts';
import {replayPlan} from '../../src/lib/bot/replay.ts';
import {createSeededRandom} from '../../src/lib/bot/seeded.ts';
import {RULES_VERSION} from '../../src/lib/bot/versions.ts';

/** Diagnostic only: legal plans stay intact, including forced tactical losses. */
export function evaluateMotherTactics(policy,raw){
  if(raw?.format!=='mahbusa-model-tactics'||raw.version!==1||raw.rulesVersion!==RULES_VERSION
    ||!Array.isArray(raw.cases)||!raw.cases.length||raw.cases.length>128)throw Error('Invalid tactical fixtures.');
  const ids=new Set(),cases=[];
  for(const row of raw.cases){
    if(typeof row?.id!=='string'||!row.id||row.id.length>80||ids.has(row.id))throw Error('Invalid/duplicate tactical case.');
    ids.add(row.id);validateSearchState(row.state);
    if(!row.state.remaining.length)throw Error('Tactical case requires a roll.');
    const state=structuredClone(row.state),home=startPoint(state.active);
    const wins=plan=>plan.outcome?.winner===state.active;
    const exposed=plan=>plan.position.points[home].count[state.active]===1;
    const safeAlternatives=generateTurns(state).filter(plan=>wins(plan)||!exposed(plan)).length;
    const plan=policy.choose(structuredClone(state),createSeededRandom('mother-tactics-v1',row.id));
    replayPlan({...createGame(),...structuredClone(state),phase:'moving'},plan);
    const reason=wins(plan)?'win':!exposed(plan)?'safe':!safeAlternatives?'forced':'avoidable-exposure';
    cases.push({id:row.id,passed:reason!=='avoidable-exposure',reason,safeAlternatives,moves:structuredClone(plan.moves)});
  }
  const passed=cases.filter(c=>c.passed).length;
  return {format:'mahbusa-bot-tactics-result',version:1,rulesVersion:RULES_VERSION,policyId:policy.id,
    status:passed===cases.length?'passed':'failed',passed,failed:cases.length-passed,cases};
}
