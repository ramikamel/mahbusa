import { generateTurns } from '../engine.ts';
import type { Pair } from '../engine';
import type { PositionValue, PreRollState, TurnInput, TurnPlan } from './types';
import { explainStrategy, validatePreRollState } from './strategy.ts';
import type { StrategyExplanation } from './strategy';
import { continuationAfterTurn } from './continuation.ts';

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
    const next = continuationAfterTurn(input,plan), kind = next.kind;
    if (next.kind === 'round-win') return { plan, kind, continuation: null, explanation: null,
      value: { kind: 'round-win-expectation', value: 1 } };
    const continuation = next.state;
    const explanation = explainStrategy(continuation, input.active);
    return { plan, kind, continuation, explanation,
      value: { kind: 'heuristic', value: explanation.value } };
  });
  // Array.sort is stable: equal estimates retain deterministic generator order.
  return rows.sort((a, b) => b.value.value - a.value.value);
}
