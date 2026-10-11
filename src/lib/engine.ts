export type Player = 0 | 1;
export type Pair = [number, number];
export type Point = { count: Pair; top: Player | null };
export type Position = { points: Point[]; off: Pair };
export type Move = { from: number; to: number; die: number };
export type Outcome = { winner: Player; points: 1 | 2; reason: 'mother' | 'bear-off' };
export type Snapshot = { position: Position; remaining: number[] };
export type Game = {
  position: Position; active: Player; score: Pair;
  phase: 'ready' | 'opening' | 'roll' | 'moving' | 'gameOver' | 'roundOver';
  dice: Pair | null; opening: Pair | null; remaining: number[];
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
export function openingRoll(game: Game, dice: Pair): Game {
  if (game.phase !== 'opening') throw new Error('Not the opening contest.');
  validDice(dice);
  return { ...game, opening: [...dice], active: dice[0] > dice[1] ? 0 : 1,
    phase: dice[0] === dice[1] ? 'opening' : 'roll' };
}
export function roll(game: Game, dice: Pair): Game {
  if (game.phase !== 'roll') throw new Error('Finish the current turn before rolling.');
  validDice(dice);
  return { ...game, opening: null, dice: [...dice], remaining: dice[0] === dice[1] ? Array(4).fill(dice[0]) : [...dice],
    phase: 'moving', history: [] };
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
export function legalMoves(position: Position, player: Player, remaining: number[]): Move[] {
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
  return evaluate(position, remaining).moves;
}
export function availableMoves(game: Game): Move[] {
  return game.phase === 'moving' ? legalMoves(game.position, game.active, game.remaining) : [];
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
