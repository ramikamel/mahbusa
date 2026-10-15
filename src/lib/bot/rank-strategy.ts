import { generateTurns, initialPosition, other } from '../engine';
import type { Pair } from '../engine';
import type { PositionValue, PreRollState, TurnInput, TurnPlan } from './types';
import { explainStrategy, validatePreRollState } from './strategy';
import type { StrategyExplanation } from './strategy';

export type RankedTurn = {
  plan: TurnPlan;
  /** Always from the player choosing this turn, including after handover. */
  value: PositionValue;
  explanation: StrategyExplanation | null;
  continuation: PreRollState | null;
  kind: 'handover' | 'next-game' | 'round-win';
};

/** Development baseline: ranks every complete legal turn without search,
 * random choices, or hard strategy filters. Exact round wins have value +1.
 * Other results remain provisional heuristic estimates, even after a game win.
 */
export function rankStrategyTurns(input: TurnInput & { score: Pair }): RankedTurn[] {
  validatePreRollState(input);
  const rows = generateTurns(input).map((plan): RankedTurn => {
    const score: Pair = [...input.score];
    let continuation: PreRollState;
    let kind: RankedTurn['kind'] = 'handover';
    if (plan.outcome) {
      const { winner, points } = plan.outcome;
      score[winner] += points;
      if (score[winner] >= 3) {
        return { plan, kind: 'round-win', continuation: null, explanation: null,
          value: { kind: 'round-win-expectation', value: 1 } };
      }
      kind = 'next-game';
      continuation = { position: initialPosition(), active: winner, score };
    } else {
      continuation = { position: plan.position, active: other(input.active), score };
    }
    const explanation = explainStrategy(continuation, input.active);
    return { plan, kind, continuation, explanation,
      value: { kind: 'heuristic', value: explanation.value } };
  });
  // Array.sort is stable: equal estimates retain deterministic generator order.
  return rows.sort((a, b) => b.value.value - a.value.value);
}
