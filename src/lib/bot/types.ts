import type { Move, Outcome, Pair, Player, Position } from '../engine';

/** Valid engine-produced position during a turn. No dice RNG or UI history. */
export type TurnInput = { position: Position; active: Player; remaining: number[] };

/** One representative sequence per distinct complete-turn result. */
export type TurnPlan = {
  moves: Move[];
  position: Position;
  /** Sorted unused dice on a blocked turn; empty after an immediate win. */
  remaining: number[];
  outcome: Outcome | null;
};

/** Before rolling, including updated score and next game's starting player. */
export type PreRollState = { position: Position; active: Player; score: Pair };

/** Both values use [-1, 1] from active's perspective; negate when sides change.
 * Learned value = 2 * P(active wins the round) - 1. Heuristics are not probabilities.
 */
export type PositionValue = { kind: 'heuristic' | 'round-win-expectation'; value: number };
export interface PositionEvaluator {
  readonly id: string;
  evaluate(state: PreRollState): PositionValue;
}

export type SearchRequest = {
  type: 'search'; requestId: string; revision: number;
  state: TurnInput & { score: Pair }; budgetMs: number; modelId: string;
};
export type SearchStats = { nodes: number; completedDepth: number; elapsedMs: number };
/** Publish a legal plan early so the controller retains a watchdog fallback. */
export type SearchReply = {
  type: 'progress' | 'complete'; requestId: string; revision: number; modelId: string;
  plan: TurnPlan; stats: SearchStats;
} | { type: 'error'; requestId: string; revision: number; modelId: string; message: string };

export type ModelManifest = {
  formatVersion: 1; id: string; rulesVersion: string; featureSchemaVersion: string;
  inputSize: number; hiddenSizes: number[]; outputSize: 1; sha256: string;
  valueKind?: PositionValue['kind'];
  architecture: 'dense-relu-sigmoid-v1'; byteLength: number; status: 'experimental';
};
