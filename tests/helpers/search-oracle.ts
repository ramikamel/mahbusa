import * as E from '../../src/lib/engine';
import type { PositionEvaluator, TurnInput } from '../../src/lib/bot/types';

/** Deliberately uses public move replay, 36 ordered rolls, and fixed-root
 * max/min rather than the search's negamax/continuation/cache helpers. */
function completeTurns(game:E.Game):E.Game[]{
  const moves=E.availableMoves(game);
  return moves.length?moves.flatMap(move=>completeTurns(E.applyMove(game,move))):[game];
}
export function searchOracle(input:TurnInput & {score:E.Pair},depth:number,evaluator:PositionEvaluator){
  const root=input.active;
  function afterTurn(game:E.Game,remainingDepth:number):number{
    if(game.phase==='roundOver')return game.outcome!.winner===root?1:-1;
    const next=game.phase==='gameOver'?E.nextGame(game):E.endTurn(game);
    if(!remainingDepth){
      const value=evaluator.evaluate({position:next.position,active:next.active,score:next.score}).value;
      return next.active===root?value:-value;
    }
    let sum=0;
    for(let a=1;a<=6;a++)for(let b=1;b<=6;b++){
      const values=completeTurns(E.roll(next,[a,b])).map(g=>afterTurn(g,remainingDepth-1));
      sum+=next.active===root?Math.max(...values):Math.min(...values);
    }
    return sum/36;
  }
  const game:E.Game={...E.createGame(),...structuredClone(input),phase:'moving'};
  return Math.max(...completeTurns(game).map(g=>afterTurn(g,depth)));
}
