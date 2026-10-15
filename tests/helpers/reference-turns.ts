import { applyMove, availableMoves, createGame } from '../../src/lib/engine';
import type { Game, Move } from '../../src/lib/engine';
import type { TurnInput, TurnPlan } from '../../src/lib/bot/types';

/** Deliberately exhaustive, checked public rules only. No traversal cache.
 * This oracle must not import the optimized generator or its internal helpers.
 */
export function referenceTurns(input: TurnInput): TurnPlan[] {
  const results: TurnPlan[] = [];
  function visit(game: Game, steps: Move[]) {
    const moves = availableMoves(game);
    if (game.outcome || !moves.length) {
      results.push({ moves: steps, position: game.position,
        remaining: [...game.remaining].sort((a, b) => a - b), outcome: game.outcome });
      return;
    }
    for (const move of moves) visit(applyMove(game, move), [...steps, move]);
  }
  visit({ ...createGame(), phase: 'moving', active: input.active,
    position: structuredClone(input.position), remaining: [...input.remaining] }, []);
  // Deduplicate only after enumerating every checked sequence.
  const unique = new Map<string, TurnPlan>();
  for (const plan of results) {
    const key = JSON.stringify([plan.position, plan.remaining, plan.outcome]);
    if (!unique.has(key)) unique.set(key, plan);
  }
  return [...unique.values()];
}
