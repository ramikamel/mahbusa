import { createGame, emptyPosition, roll } from './engine';
import type { Game, Pair, Player } from './engine';
function setup(stacks: [number, number, number, Player?][], off: Pair, dice: Pair, active: Player = 0, score: Pair = [0, 0]): Game {
  const position = emptyPosition(); position.off = off;
  for (const [index, a, b, top] of stacks) position.points[index] = { count: [a, b], top: top ?? (a ? 0 : 1) };
  return roll({ ...createGame(), position, active, score, phase: 'roll' }, dice);
}
export const scenarios: Record<string, () => Game> = {
  'pin-and-release': () => setup([[8, 15, 0], [6, 0, 1], [12, 0, 14]], [0, 0], [2, 1]),
  'blocked-turn': () => setup([[8, 15, 0], [7, 0, 2], [6, 0, 2]], [0, 11], [1, 2]),
  'forced-order': () => setup([[5, 1, 0], [3, 0, 2], [0, 0, 2]], [14, 11], [1, 2]),
  'higher-die': () => setup([[5, 1, 0], [2, 0, 2]], [14, 13], [1, 2]),
  'mother-win': () => setup([[1, 1, 0], [23, 14, 0], [0, 0, 1], [12, 0, 14]], [0, 0], [1, 6]),
  'normal-win': () => setup([[0, 1, 0], [12, 0, 14]], [14, 1], [1, 6]),
  'double-win': () => setup([[0, 1, 0], [12, 0, 15]], [14, 0], [1, 6]),
  'round-win': () => setup([[0, 1, 0], [12, 0, 14]], [14, 1], [1, 6], 0, [2, 0]),
  'ambiguous-bear-off': () => setup([[0, 2, 0], [12, 0, 15]], [13, 0], [1, 6]),
};
