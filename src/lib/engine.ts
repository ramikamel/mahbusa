import type { TurnInput, TurnPlan } from './bot/types';
export type Player = 0 | 1;
export type Pair = [number, number];
export type OpeningDice = [number | null, number | null];
export type Point = { count: Pair; top: Player | null };
export type Position = { points: Point[]; off: Pair };
export type Move = { from: number; to: number; die: number };
export type MovePath = { from: number; to: number; steps: Move[] };
export type Outcome = { winner: Player; points: 1 | 2; reason: 'mother' | 'bear-off' };
export type Snapshot = { position: Position; remaining: number[] };
export type Game = {
  position: Position; active: Player; score: Pair;
  phase: 'ready' | 'opening' | 'roll' | 'moving' | 'gameOver' | 'roundOver';
  dice: Pair | null; opening: OpeningDice | null; remaining: number[];
  history: Snapshot[]; outcome: Outcome | null;
};
export const other = (p: Player): Player => p === 0 ? 1 : 0;
export const startPoint = (p: Player) => p === 0 ? 23 : 0;
export const distance = (p: Player, point: number) => p === 0 ? point + 1 : 24 - point;
export function emptyPosition(): Position {
  return { points: Array.from({ length: 24 }, () => ({ count: [0, 0], top: null })), off: [0, 0] };
}
export function initialPosition(): Position {
  const position = emptyPosition();
  position.points[23] = { count: [15, 0], top: 0 };
  position.points[0] = { count: [0, 15], top: 1 };
  return position;
}
export function createGame(): Game {
  return { position: initialPosition(), active: 0, score: [0, 0], phase: 'ready', dice: null,
    opening: null, remaining: [], history: [], outcome: null };
}
export function startRound(): Game { return { ...createGame(), phase: 'opening' }; }
function validDice(dice: Pair) {
  if (!dice.every(n => Number.isInteger(n) && n >= 1 && n <= 6)) throw new Error('Dice must be 1–6.');
}
export function openingRoll(game: Game, player: Player, die: number): Game {
  if (game.phase !== 'opening') throw new Error('Not the opening contest.');
  if (player !== 0 && player !== 1) throw new Error('Unknown player.');
  validDice([die, die]);
  const tied = game.opening?.[0] != null && game.opening[0] === game.opening[1];
  const opening: OpeningDice = tied || !game.opening ? [null, null] : [...game.opening];
  if (opening[player] !== null) throw new Error('This player has already rolled.');
  opening[player] = die;
  if (opening[0] === null || opening[1] === null || opening[0] === opening[1]) {
    return { ...game, opening };
  }
  return { ...game, opening, active: opening[0] > opening[1] ? 0 : 1, phase: 'roll' };
}
export function roll(game: Game, dice: Pair): Game {
  if (game.phase !== 'roll') throw new Error('Finish the current turn before rolling.');
  validDice(dice);
  return { ...game, opening: null, dice: [...dice], remaining: dice[0] === dice[1] ? Array(4).fill(dice[0]) : [...dice],
    phase: 'moving', history: [] };
}
export function startGame(game: Game, dice: Pair): Game {
  if (game.phase !== 'roll' || game.opening?.[0] == null || game.opening[1] == null || game.opening[0] === game.opening[1]) {
    throw new Error('Finish the opening contest before starting.');
  }
  return roll(game, dice);
}
export function endTurnAndRoll(game: Game, dice: Pair): Game {
  return roll(endTurn(game), dice);
}
export function nextGameAndRoll(game: Game, dice: Pair): Game {
  return roll(nextGame(game), dice);
}
function clone(position: Position): Position {
  return { off: [...position.off], points: position.points.map(p => ({ count: [...p.count], top: p.top })) };
}
export function rawMoves(position: Position, player: Player, die: number): Move[] {
  const opponent = other(player);
  const home = position.points.every((p, i) => p.count[player] === 0 || distance(player, i) <= 6);
  const result: Move[] = [];
  for (let from = 0; from < 24; from++) {
    const source = position.points[from];
    if (source.top !== player || source.count[player] === 0) continue;
    const to = from + (player === 0 ? -die : die);
    if (to >= 0 && to < 24) {
      const target = position.points[to];
      if (target.top === opponent && (target.count[opponent] >= 2 || target.count[player] > 0)) continue;
      result.push({ from, to, die });
    } else if (home) {
      const d = distance(player, from);
      const higher = position.points.some((p, i) => p.count[player] > 0 && distance(player, i) > d);
      if (die === d || (die > d && !higher)) result.push({ from, to: -1, die });
    }
  }
  return result;
}
function step(position: Position, player: Player, move: Move): { position: Position; outcome: Outcome | null } {
  const next = clone(position);
  const source = next.points[move.from];
  source.count[player]--;
  if (!source.count[player]) source.top = source.count[other(player)] ? other(player) : null;
  let outcome: Outcome | null = null;
  if (move.to === -1) {
    next.off[player]++;
    if (next.off[player] === 15) outcome = { winner: player, points: next.off[other(player)] ? 1 : 2, reason: 'bear-off' };
  } else {
    const target = next.points[move.to];
    if (move.to === startPoint(other(player)) && target.count[other(player)] === 1 && target.top === other(player)) {
      outcome = { winner: player, points: 2, reason: 'mother' };
    }
    target.count[player]++;
    target.top = player;
  }
  return { position: next, outcome };
}
type Evaluation = { length: number; winning: boolean; moves: Move[] };
function key(position: Position, dice: number[]) {
  return position.points.map(p => `${p.count[0]},${p.count[1]},${p.top ?? '-'}`).join(';') + '|' + position.off.join(',') + '|' + [...dice].sort().join(',');
}
// One analysis context can serve every branch of a complete-turn traversal.
// Existing callers still get a fresh context through legalMoves().
function legalMoveGenerator(player: Player) {
  const memo = new Map<string, Evaluation>();
  function evaluate(pos: Position, dice: number[]): Evaluation {
    if (!dice.length) return { length: 0, winning: false, moves: [] };
    const cacheKey = key(pos, dice);
    const cached = memo.get(cacheKey);
    if (cached) return cached;
    const branches: { move: Move; length: number; winning: boolean }[] = [];
    for (const die of new Set(dice)) {
      const rest = [...dice]; rest.splice(rest.indexOf(die), 1);
      for (const move of rawMoves(pos, player, die)) {
        const next = step(pos, player, move);
        const continuation = next.outcome ? { length: 0, winning: true } : evaluate(next.position, rest);
        branches.push({ move, length: 1 + continuation.length, winning: continuation.winning });
      }
    }
    const length = Math.max(0, ...branches.map(b => b.length));
    let allowed = branches.filter(b => b.winning || b.length === length);
    if (length === 1 && new Set(dice).size > 1) {
      const highest = Math.max(...allowed.map(b => b.move.die));
      allowed = allowed.filter(b => b.winning || b.move.die === highest);
    }
    const result = { length, winning: branches.some(b => b.winning), moves: allowed.map(b => b.move) };
    memo.set(cacheKey, result);
    return result;
  }
  return (position: Position, remaining: number[]) => evaluate(position, remaining).moves;
}
export function legalMoves(position: Position, player: Player, remaining: number[]): Move[] {
  return legalMoveGenerator(player)(position, remaining);
}
export function availableMoves(game: Game): Move[] {
  return game.phase === 'moving' ? legalMoves(game.position, game.active, game.remaining) : [];
}
/** Complete turns across any checkers, with one deterministic representative
 * per final position/dice/outcome. Input must be a valid in-progress position.
 * This does not roll dice, advance score/player, or construct UI history.
 */
export function generateTurns(input: TurnInput): TurnPlan[] {
  const { position, active } = input;
  if (active !== 0 && active !== 1) throw new Error('Unknown player.');
  const remaining = [...input.remaining].sort((a, b) => a - b);
  if (remaining.length > 4 || remaining.some(d => !Number.isInteger(d) || d < 1 || d > 6)
    || (remaining.length > 2 && new Set(remaining).size !== 1)) {
    throw new Error('Invalid remaining dice.');
  }
  const legal = legalMoveGenerator(active);
  const memo = new Map<string, TurnPlan[]>();
  function visit(pos: Position, dice: number[]): TurnPlan[] {
    const stateKey = key(pos, dice);
    const cached = memo.get(stateKey);
    if (cached) return cached;
    const moves = legal(pos, dice);
    if (!moves.length) {
      const leaf = [{ moves: [], position: pos, remaining: dice, outcome: null }];
      memo.set(stateKey, leaf);
      return leaf;
    }
    const results = new Map<string, TurnPlan>();
    for (const move of moves) {
      // Only legal generated moves reach the private transition. Public applyMove
      // retains its checks; sharing step keeps rules identical without histories.
      const next = step(pos, active, move);
      const rest = [...dice]; rest.splice(rest.indexOf(move.die), 1);
      const suffixes: TurnPlan[] = next.outcome
        ? [{ moves: [], position: next.position, remaining: [], outcome: next.outcome }]
        : visit(next.position, rest);
      for (const suffix of suffixes) {
        const finalKey = key(suffix.position, suffix.remaining) + '|' + JSON.stringify(suffix.outcome);
        if (!results.has(finalKey)) results.set(finalKey, { ...suffix, moves: [move, ...suffix.moves] });
      }
    }
    const plans = [...results.values()];
    memo.set(stateKey, plans);
    return plans;
  }
  // Internal suffixes share cached structure. Public results own all their data.
  return visit(position, remaining).map(plan => ({
    moves: plan.moves.map(move => ({ ...move })), position: clone(plan.position),
    remaining: [...plan.remaining], outcome: plan.outcome ? { ...plan.outcome } : null,
  }));
}
// Offer every legal prefix of a route followed by the same checker. Each step
// uses the normal rules, including maximum dice usage and intermediate pins.
export function availableMovePaths(game: Game, from: number): MovePath[] {
  const result: MovePath[] = [];
  const seen = new Set<string>();
  function visit(current: Game, point: number, steps: Move[]) {
    for (const move of availableMoves(current).filter(m => m.from === point)) {
      const next = applyMove(current, move);
      const route = [...steps, move];
      const stateKey = `${move.to}|${key(next.position, next.remaining)}|${next.phase}`;
      if (seen.has(stateKey)) continue;
      seen.add(stateKey);
      result.push({ from, to: move.to, steps: route });
      if (move.to !== -1 && next.phase === 'moving') visit(next, move.to, route);
    }
  }
  visit(game, from, []);
  return result;
}
export function applyMovePath(game: Game, path: MovePath): Game {
  if (!path.steps.length || path.steps[0].from !== path.from || path.steps.at(-1)!.to !== path.to) {
    throw new Error('Invalid checker route.');
  }
  let next = game;
  let point = path.from;
  for (const move of path.steps) {
    if (point === -1 || move.from !== point) throw new Error('Follow the same checker.');
    next = applyMove(next, move);
    point = move.to;
  }
  // A destination tap is one action, so Undo restores its full route.
  return next.outcome ? next : { ...next, history: [...game.history, { position: game.position, remaining: game.remaining }] };
}
export function applyMove(game: Game, move: Move): Game {
  if (!availableMoves(game).some(m => m.from === move.from && m.to === move.to && m.die === move.die)) throw new Error('Illegal move.');
  const result = step(game.position, game.active, move);
  const remaining = [...game.remaining]; remaining.splice(remaining.indexOf(move.die), 1);
  if (result.outcome) {
    const score: Pair = [...game.score]; score[game.active] += result.outcome.points;
    return { ...game, ...result, remaining: [], history: [], score, phase: score[game.active] >= 3 ? 'roundOver' : 'gameOver' };
  }
  return { ...game, ...result, remaining, history: [...game.history, { position: game.position, remaining: game.remaining }] };
}
export function undo(game: Game): Game {
  if (game.phase !== 'moving' || !game.history.length) throw new Error('Nothing to undo.');
  return { ...game, ...game.history[game.history.length - 1], history: game.history.slice(0, -1) };
}
export function endTurn(game: Game): Game {
  if (game.phase !== 'moving' || availableMoves(game).length) throw new Error('Required moves remain.');
  return { ...game, active: other(game.active), phase: 'roll', dice: null, remaining: [], history: [] };
}
export function nextGame(game: Game): Game {
  if (game.phase !== 'gameOver' || !game.outcome) throw new Error('The game is not finished.');
  return { ...createGame(), score: [...game.score], active: game.outcome.winner, phase: 'roll' };
}
export function randomDie(): number {
  const bytes = new Uint8Array(1);
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= 252);
  return bytes[0] % 6 + 1;
}
