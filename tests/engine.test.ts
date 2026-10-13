import { describe, it, expect } from 'vitest';
import { createGame, startRound, openingRoll, startGame, availableMoves, applyMove, endTurnAndRoll, undo, emptyPosition, legalMoves } from '../src/lib/engine';
describe('framework test runner integration', () => {
  it('runs a complete legal turn and undo without mutation', () => {
    const initial = startGame(openingRoll(openingRoll(startRound(), 0, 6), 1, 1), [2, 3]);
    const moved = applyMove(initial, availableMoves(initial)[0]);
    expect(undo(moved)).toEqual(initial);
    let game = moved;
    while (availableMoves(game).length) game = applyMove(game, availableMoves(game)[0]);
    const next = endTurnAndRoll(game, [5, 6]);
    expect(next.active).toBe(1);
    expect(next.phase).toBe('moving');
    expect(next.dice).toEqual([5, 6]);
    expect(next.history).toEqual([]);
    expect(initial.remaining).toEqual([2, 3]);
  });
  it('filters out low die when either die is playable but only one can be used', () => {
    const p = emptyPosition();
    p.points[5] = { count: [1, 0], top: 0 };
    p.points[2] = { count: [0, 2], top: 1 };
    p.off = [14, 13];
    expect(legalMoves(p, 0, [1, 2])).toEqual([{ from: 5, to: 3, die: 2 }]);
    expect(createGame().score).toEqual([0, 0]);
  });
});
