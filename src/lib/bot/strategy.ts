import { distance, other, rawMoves, startPoint } from '../engine.ts';
import type { Move, Player, Position } from '../engine';
import type { PositionEvaluator, PositionValue, PreRollState } from './types';

/** Provisional, versioned development weights; not trained or calibrated. */
export const STRATEGY_WEIGHTS = Object.freeze({
  score: 180, progress: 36, borneOff: 28, pinned: -90, motherExposure: -90,
  motherThreat: -360, pins: 42, pinReserves: 28, pinPassage: 18,
  twoPointLeverage: 28, blotPressure: -60, isolation: -24,
  supported: 12, mobility: 12, initiative: 1,
});
type FeatureKey = keyof typeof STRATEGY_WEIGHTS;
type Features = Record<FeatureKey, number>;
const labels: Record<FeatureKey, string> = {
  score: 'Round score', progress: 'Race progress', borneOff: 'Borne off',
  pinned: 'Pinned checkers', motherExposure: 'Exposed mother',
  motherThreat: 'Mother-capture rolls', pins: 'Pins and location',
  pinReserves: 'Pin cover reserves', pinPassage: 'Checkers past pins',
  twoPointLeverage: 'Two-point leverage', blotPressure: 'Direct blot pressure',
  isolation: 'Isolated contact checkers', supported: 'Supported checkers',
  mobility: 'Single-die mobility', initiative: 'Next to roll',
};
export type FeatureContribution = {
  key: FeatureKey; label: string; own: number; opponent: number;
  weight: number; contribution: number;
};
export type StrategyExplanation = {
  evaluatorId: string; kind: 'heuristic'; value: number; rawValue: number;
  perspective: Player; contributions: FeatureContribution[];
};

function checkPlayer(player: Player) {
  if (player !== 0 && player !== 1) throw new Error('Unknown player.');
}
export function validatePreRollState(state: PreRollState) {
  checkPlayer(state.active);
  if (state.score.length !== 2 || state.score.some(s => !Number.isInteger(s) || s < 0 || s > 2)) {
    throw new Error('Invalid pre-roll score.');
  }
}

/** Immediate mother wins need a single forward route. Friendly moves cannot
 * remove opponent blocks, so testing these routes suffices. rawMoves supplies
 * blocking/landing legality; a virtual source follows the checker without
 * changing original positions. Bear-off results are never attack routes.
 */
function motherAttackChance(position: Position, defender: Player): number {
  const target = startPoint(defender), mother = position.points[target];
  if (mother.count[defender] !== 1 || mother.top !== defender) return 0;
  const attacker = other(defender);
  const sources = position.points.flatMap((p, i) => p.top === attacker && p.count[attacker] ? [i] : []);
  const virtual = new Map<number, Position>(), memo = new Map<string, boolean>();
  function reaches(from: number, dice: number[]): boolean {
    const key = from + '|' + dice.join(',');
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let board = virtual.get(from);
    if (!board) {
      const points = [...position.points], count: [number, number] = [...points[from].count];
      count[attacker]++;
      points[from] = { count, top: attacker };
      board = { points, off: position.off };
      virtual.set(from, board);
    }
    for (const die of new Set(dice)) {
      const move = rawMoves(board, attacker, die).find(m => m.from === from);
      if (!move || move.to === -1) continue;
      if (move.to === target) { memo.set(key, true); return true; }
      const rest = [...dice]; rest.splice(rest.indexOf(die), 1);
      if (rest.length && reaches(move.to, rest)) { memo.set(key, true); return true; }
    }
    memo.set(key, false);
    return false;
  }
  let wins = 0;
  for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) {
    const dice = a === b ? [a, a, a, a] : [a, b];
    if (sources.some(from => reaches(from, dice))) wins += a === b ? 1 : 2;
  }
  return wins / 36;
}

function features(state: PreRollState, player: Player, faces: [Move[][], Move[][]]): Features {
  const { position, score } = state, opponent = other(player);
  const ownPoints = position.points.flatMap((p, i) => p.top === player && p.count[player] ? [i] : []);
  const attackers = position.points.flatMap((p, i) => p.top === opponent && p.count[opponent] ? [i] : []);
  const enemyDirection = opponent === 0 ? -1 : 1;
  let pips = 0, pinned = 0, supported = 0, pins = 0, reserves = 0, passage = 0;
  let leverage = 0, pressure = 0, isolation = 0;
  for (let i = 0; i < 24; i++) {
    const point = position.points[i], count = point.count[player], d = distance(player, i);
    if (!count) continue;
    pips += count * d;
    if (point.top !== player) { pinned += count; continue; }
    if (count >= 2) supported += count;
    if (point.count[opponent]) {
      const location = 1 + Math.max(0, (7 - d) / 6);
      const passed = position.off[player] + position.points.reduce((n, p, j) => n + (distance(player, j) < d ? p.count[player] : 0), 0);
      pins += location;
      reserves += location * Math.log2(count) / 4;
      passage += location * passed / 15;
      if (!position.off[opponent] && score[player] < 2 && distance(opponent, i) > 6) leverage += location;
    }
    if (count === 1) {
      const directFaces = faces[opponent].filter(moves => moves.some(m => m.to === i)).length;
      pressure += (1 + d / 24) * directFaces / 6;
      if (attackers.some(from => (i - from) * enemyDirection > 0)) {
        const gap = Math.min(24, ...ownPoints.filter(j => j !== i).map(j => Math.abs(i - j)));
        isolation += Math.max(0, gap - 6) / 18;
      }
    }
  }
  const mother = position.points[startPoint(player)];
  return {
    score: score[player] / 3, progress: 1 - pips / 360,
    borneOff: position.off[player] / 15, pinned: pinned / 15,
    motherExposure: mother.count[player] === 1 && mother.top === player ? 1 : 0,
    motherThreat: motherAttackChance(position, player),
    pins: Math.min(1, pins / 5), pinReserves: Math.min(1, reserves / 5),
    pinPassage: Math.min(1, passage / 5), twoPointLeverage: Math.min(1, leverage / 5),
    blotPressure: pressure / 15, isolation: isolation / 15, supported: supported / 15,
    mobility: faces[player].reduce((n, moves) => n + moves.length, 0) / 90,
    initiative: state.active === player ? 1 : 0,
  };
}

export function explainStrategy(state: PreRollState, perspective: Player = state.active): StrategyExplanation {
  validatePreRollState(state); checkPlayer(perspective);
  const faces = ([0, 1] as const).map(player =>
    Array.from({ length: 6 }, (_, i) => rawMoves(state.position, player, i + 1))) as [Move[][], Move[][]];
  const sides = [features(state, 0, faces), features(state, 1, faces)];
  const contributions = (Object.keys(STRATEGY_WEIGHTS) as FeatureKey[]).map(key => {
    const own = sides[perspective][key], opponent = sides[other(perspective)][key];
    const weight = STRATEGY_WEIGHTS[key];
    return { key, label: labels[key], own, opponent, weight, contribution: (own - opponent) * weight };
  });
  const rawValue = contributions.reduce((n, c) => n + c.contribution, 0);
  return { evaluatorId: 'strategy-v1', kind: 'heuristic', value: Math.tanh(rawValue / 100),
    rawValue, perspective, contributions };
}
export function evaluateStrategy(state: PreRollState): PositionValue {
  return { kind: 'heuristic', value: explainStrategy(state).value };
}
export const strategyEvaluator: PositionEvaluator = { id: 'strategy-v1', evaluate: evaluateStrategy };
