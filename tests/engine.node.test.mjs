import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import * as E from '../src/lib/engine.ts';
function position(stacks, off = [0, 0]) {
  const p = E.emptyPosition(); p.off = off;
  for (const [index, a, b, top] of stacks) p.points[index] = { count: [a, b], top: top ?? (a ? 0 : 1) };
  return p;
}
function game(p, dice, active = 0, score = [0, 0]) {
  return E.roll({ ...E.createGame(), position: p, active, score, phase: 'roll' }, dice);
}
function move(g, from, to, die) { return E.applyMove(g, { from, to, die }); }
function totals(p) { return [0, 1].map(player => p.off[player] + p.points.reduce((n, point) => n + point.count[player], 0)); }

test('starts with 15 pieces each and fresh opening dice', () => {
  assert.deepEqual(totals(E.createGame().position), [15, 15]);
  let g = E.openingRoll(E.openingRoll(E.startRound(), 0, 3), 1, 3); assert.equal(g.phase, 'opening');
  g = E.openingRoll(E.openingRoll(g, 0, 2), 1, 5); assert.equal(g.active, 1); assert.equal(g.phase, 'roll');
  assert.deepEqual(E.roll(g, [4, 4]).remaining, [4, 4, 4, 4]);
  assert.equal(E.roll(g, [4, 4]).opening, null);
  assert.throws(() => E.roll(g, [0, 7]));
});
test('opening waits for both players, in either order, and prevents repeated rolls', () => {
  for (const first of [0, 1]) {
    const initial = E.startRound();
    const partial = E.openingRoll(initial, first, first === 0 ? 6 : 1);
    assert.equal(partial.phase, 'opening');
    assert.equal(partial.opening[1 - first], null);
    assert.deepEqual(E.availableMoves(partial), []);
    assert.throws(() => E.roll(partial, [2, 3]));
    assert.throws(() => E.openingRoll(partial, first, 4));
    const decided = E.openingRoll(partial, 1 - first, first === 0 ? 1 : 6);
    assert.equal(decided.phase, 'roll');
    assert.equal(decided.active, 0);
    assert.deepEqual(decided.opening, [6, 1]);
    assert.equal(decided.dice, null);
    assert.throws(() => E.openingRoll(decided, 1, 6));
    assert.equal(initial.opening, null);
  }
});
test('ties discard both old dice before either player rerolls', () => {
  const tied = E.openingRoll(E.openingRoll(E.startRound(), 0, 3), 1, 3);
  for (const first of [0, 1]) {
    const partial = E.openingRoll(tied, first, 5);
    assert.equal(partial.phase, 'opening');
    assert.equal(partial.opening[1 - first], null);
    assert.deepEqual(tied.opening, [3, 3]);
    const tiedAgain = E.openingRoll(partial, 1 - first, 5);
    assert.equal(tiedAgain.phase, 'opening');
    const final = E.openingRoll(E.openingRoll(tiedAgain, 1, 6), 0, 2);
    assert.equal(final.phase, 'roll');
    assert.equal(final.active, 1);
    assert.deepEqual(E.roll(final, [1, 4]).remaining, [1, 4]);
  }
});
test('invalid opening rolls are rejected without changing the board', () => {
  const initial = E.startRound();
  for (const die of [0, 7, 1.5, NaN]) assert.throws(() => E.openingRoll(initial, 0, die));
  assert.throws(() => E.openingRoll(initial, 2, 3));
  assert.throws(() => E.openingRoll(E.createGame(), 0, 3));
  assert.equal(initial.opening, null);
  assert.deepEqual(totals(initial.position), [15, 15]);
});
test('players move in opposite directions', () => {
  assert.deepEqual(E.rawMoves(E.initialPosition(), 0, 3), [{ from: 23, to: 20, die: 3 }]);
  assert.deepEqual(E.rawMoves(E.initialPosition(), 1, 3), [{ from: 0, to: 3, die: 3 }]);
});
test('Start game waits for a decided contest and rolls fresh dice once', () => {
  const opening = E.startRound();
  const partial = E.openingRoll(opening, 0, 6);
  const tied = E.openingRoll(partial, 1, 6);
  for (const g of [E.createGame(), opening, partial, tied]) assert.throws(() => E.startGame(g, [2, 4]));
  const decided = E.openingRoll(partial, 1, 1);
  assert.deepEqual(decided.opening, [6, 1]);
  assert.deepEqual(E.availableMoves(decided), []);
  const started = E.startGame(decided, [2, 4]);
  assert.equal(started.phase, 'moving'); assert.equal(started.active, 0);
  assert.deepEqual(started.dice, [2, 4]); assert.equal(started.opening, null);
  assert.throws(() => E.startGame(started, [1, 1]));
  assert.throws(() => E.startGame(decided, [0, 7]));
  assert.deepEqual(decided.opening, [6, 1]);
});
test('End turn rolls for the opponent atomically and closes the undo boundary', () => {
  const original = game(E.initialPosition(), [2, 4]);
  assert.throws(() => E.endTurnAndRoll(original, [3, 3]));
  const moved = E.applyMovePath(original, E.availableMovePaths(original, 23).find(p => p.to === 17));
  assert.deepEqual(E.undo(moved), original);
  const next = E.endTurnAndRoll(moved, [3, 3]);
  assert.equal(next.phase, 'moving'); assert.equal(next.active, 1);
  assert.deepEqual(next.dice, [3, 3]); assert.deepEqual(next.remaining, [3, 3, 3, 3]);
  assert.deepEqual(next.position, moved.position); assert.deepEqual(next.history, []);
  assert.throws(() => E.undo(next)); assert.throws(() => E.endTurnAndRoll(next, [2, 4]));
  assert.throws(() => E.endTurnAndRoll(moved, [0, 7]));
  assert.equal(moved.active, 0);
});
test('a blocked automatic roll stays on that player until explicit End turn', () => {
  const p = position([[8, 13, 0], [10, 2, 0], [9, 0, 13], [7, 0, 2]]);
  const waiting = game(p, [1, 1], 1);
  assert.deepEqual(E.availableMoves(waiting), []);
  const passed = E.endTurnAndRoll(waiting, [1, 1]);
  assert.equal(passed.active, 0); assert.equal(passed.phase, 'moving');
  assert.deepEqual(passed.dice, [1, 1]);
  assert.deepEqual(E.availableMoves(passed), []);
  assert.equal(E.endTurnAndRoll(passed, [1, 1]).active, 1);
});
test('Next game preserves scores and rolls immediately for the previous winner', () => {
  const won = move(game(position([[0, 1, 0], [12, 0, 14]], [14, 1]), [1, 6]), 0, -1, 1);
  const next = E.nextGameAndRoll(won, [2, 4]);
  assert.equal(next.phase, 'moving'); assert.equal(next.active, won.outcome.winner);
  assert.deepEqual(next.score, [1, 0]); assert.deepEqual(next.position, E.initialPosition());
  assert.deepEqual(next.remaining, [2, 4]); assert.deepEqual(next.history, []);
  assert.throws(() => E.nextGameAndRoll(next, [1, 1]));
  const roundWon = { ...won, phase: 'roundOver', score: [3, 0] };
  assert.throws(() => E.nextGameAndRoll(roundWon, [1, 1]));
  const newRound = E.startRound();
  assert.deepEqual(newRound.score, [0, 0]); assert.equal(newRound.phase, 'opening');
});
test('combined destinations include 2, 4 and 6 for either player and undo as one action', () => {
  for (const active of [0, 1]) {
    const from = active === 0 ? 23 : 0;
    const sign = active === 0 ? -1 : 1;
    const original = game(E.initialPosition(), [2, 4], active);
    const paths = E.availableMovePaths(original, from);
    assert.deepEqual(new Set(paths.map(p => p.to)), new Set([2, 4, 6].map(n => from + sign * n)));
    const combined = paths.filter(p => p.to === from + sign * 6);
    assert.equal(combined.length, 1); // Equivalent legal dice orders need no prompt.
    const moved = E.applyMovePath(original, combined[0]);
    assert.equal(moved.position.points[from].count[active], 14);
    assert.equal(moved.position.points[from + sign * 6].count[active], 1);
    assert.deepEqual(moved.remaining, []);
    assert.deepEqual(totals(moved.position), [15, 15]);
    assert.deepEqual(E.undo(moved), original);
    assert.equal(E.endTurn(moved).active, 1 - active);
  }
});
test('combined routes cannot jump blocks and can use the only legal dice order', () => {
  const oneRoute = game(position([[8, 15, 0], [6, 0, 2], [12, 0, 13]]), [2, 4]);
  const path = E.availableMovePaths(oneRoute, 8).find(p => p.to === 2);
  assert.deepEqual(path.steps.map(m => m.die), [4, 2]);
  const bothBlocked = game(position([[8, 15, 0], [6, 0, 2], [4, 0, 2], [12, 0, 11]]), [2, 4]);
  assert.deepEqual(E.availableMovePaths(bothBlocked, 8), []);
  const finalBlocked = game(position([[8, 15, 0], [2, 0, 2], [12, 0, 13]]), [2, 4]);
  assert.ok(!E.availableMovePaths(finalBlocked, 8).some(p => p.to === 2));
});
test('combined routes obey forced dice use, pins and immediate wins', () => {
  const forced = game(position([[5, 1, 0], [3, 0, 2], [0, 0, 2]], [14, 11]), [1, 2]);
  const route = E.availableMovePaths(forced, 5).find(p => p.to === 2);
  assert.deepEqual(route.steps.map(m => m.die), [1, 2]);
  const higher = game(position([[5, 1, 0], [2, 0, 2]], [14, 13]), [1, 2]);
  assert.deepEqual(E.availableMovePaths(higher, 5).map(p => p.steps.map(m => m.die)), [[2]]);
  const pinned = game(position([[8, 15, 0], [6, 0, 1], [12, 0, 14]]), [2, 4]);
  const pinRoute = E.availableMovePaths(pinned, 8).find(p => p.to === 2);
  const moved = E.applyMovePath(pinned, pinRoute);
  assert.deepEqual(moved.position.points[6], { count: [0, 1], top: 1 });
  assert.deepEqual(E.undo(moved), pinned);
  const mother = game(position([[5, 1, 0], [23, 14, 0], [0, 0, 1], [12, 0, 14]]), [2, 3]);
  const winning = E.availableMovePaths(mother, 5).find(p => p.to === 0);
  const won = E.applyMovePath(mother, winning);
  assert.equal(won.outcome.reason, 'mother');
  assert.deepEqual(won.score, [2, 0]);
  assert.throws(() => E.undo(won));
});
test('doubles offer two, three and four-step totals while preserving earlier undo history', () => {
  const original = game(E.initialPosition(), [2, 2]);
  const paths = E.availableMovePaths(original, 23);
  assert.deepEqual(paths.map(p => p.to), [21, 19, 17, 15]);
  const first = E.applyMovePath(original, paths.find(p => p.to === 19));
  assert.deepEqual(first.remaining, [2, 2]);
  const second = E.applyMovePath(first, E.availableMovePaths(first, 19).find(p => p.to === 15));
  assert.deepEqual(second.remaining, []);
  assert.deepEqual(E.undo(second), first);
  assert.deepEqual(E.undo(E.undo(second)), original);
});
test('combined bear-off keeps distinct dice choices and never follows a checker off the board', () => {
  const original = game(position([[5, 1, 0], [12, 0, 15]], [14, 0]), [2, 4]);
  const paths = E.availableMovePaths(original, 5).filter(p => p.to === -1);
  assert.equal(paths.length, 1);
  assert.equal(paths[0].steps.length, 2);
  assert.equal(E.applyMovePath(original, paths[0]).outcome.reason, 'bear-off');
  const ambiguous = game(position([[0, 2, 0], [12, 0, 15]], [13, 0]), [1, 6]);
  assert.deepEqual(E.availableMovePaths(ambiguous, 0).map(p => p.steps.map(m => m.die)), [[1], [6]]);
});
test('invalid combined routes cannot consume dice or move another checker', () => {
  const original = game(E.initialPosition(), [2, 4]);
  const before = JSON.stringify(original);
  for (const path of [
    { from: 23, to: 17, steps: [] },
    { from: 23, to: 17, steps: [{ from: 23, to: 17, die: 6 }] },
    { from: 23, to: 19, steps: [{ from: 23, to: 21, die: 2 }, { from: 23, to: 19, die: 4 }] },
    { from: 23, to: 17, steps: [{ from: 23, to: 21, die: 2 }] },
  ]) assert.throws(() => E.applyMovePath(original, path));
  assert.equal(JSON.stringify(original), before);
});
test('blocked destinations and illegal actions preserve state', () => {
  const g = game(position([[8, 15, 0], [6, 0, 2], [12, 0, 13]]), [2, 3]);
  const before = JSON.stringify(g);
  assert.throws(() => move(g, 8, 6, 2)); assert.equal(JSON.stringify(g), before);
});
test('pin prevents movement and moving final cover releases it', () => {
  let g = game(position([[8, 15, 0], [6, 0, 1], [12, 0, 14]]), [2, 1]);
  g = move(g, 8, 6, 2);
  assert.deepEqual(g.position.points[6], { count: [1, 1], top: 0 });
  assert.ok(!E.rawMoves(g.position, 1, 1).some(m => m.from === 6));
  assert.ok(!E.rawMoves(position([[7, 0, 1], [6, 1, 1, 0]]), 1, 1).some(m => m.to === 6));
  g = move(g, 6, 5, 1);
  assert.deepEqual(g.position.points[6], { count: [0, 1], top: 1 });
  assert.deepEqual(totals(g.position), [15, 15]);
});
test('undo restores pins and dice; cannot reroll or end prematurely', () => {
  const original = game(position([[8, 15, 0], [6, 0, 1], [12, 0, 14]]), [2, 1]);
  const g = move(original, 8, 6, 2);
  assert.deepEqual(E.undo(g), original);
  assert.throws(() => E.roll(g, [6, 6])); assert.throws(() => E.endTurn(g));
});
test('must choose sequence using both dice instead of stranding one', () => {
  const p = position([[5, 1, 0], [3, 0, 2], [0, 0, 2]], [14, 11]);
  assert.deepEqual(E.legalMoves(p, 0, [1, 2]), [{ from: 5, to: 4, die: 1 }]);
});
test('higher die mandatory when only one of either can be played', () => {
  const p = position([[5, 1, 0], [2, 0, 2]], [14, 13]);
  assert.deepEqual(E.legalMoves(p, 0, [1, 2]), [{ from: 5, to: 3, die: 2 }]);
});
test('doubles consume four moves and support partial blocked doubles', () => {
  let g = game(E.initialPosition(), [3, 3]);
  for (let i = 0; i < 4; i++) g = move(g, 23, 20, 3);
  assert.equal(g.remaining.length, 0); assert.equal(E.endTurn(g).active, 1);
  let partial = game(position([[8, 1, 0], [4, 0, 2]], [14, 13]), [2, 2]);
  partial = move(partial, 8, 6, 2); assert.equal(E.availableMoves(partial).length, 0);
  assert.equal(E.endTurn(partial).phase, 'roll');
});
test('blocked turns permit handover without changing board', () => {
  const g = game(position([[8, 15, 0], [7, 0, 2], [6, 0, 2]], [0, 11]), [1, 2]);
  assert.equal(E.availableMoves(g).length, 0);
  assert.deepEqual(E.endTurn(g).position, g.position);
});
test('mother pin ends immediately despite both mothers being home', () => {
  let g = game(position([[1, 1, 0], [23, 14, 1, 0], [0, 0, 1], [12, 0, 13]]), [1, 6]);
  // White covers a black checker at 23: that fixture is a legal existing pin.
  g = move(g, 1, 0, 1);
  assert.equal(g.phase, 'gameOver'); assert.deepEqual(g.score, [2, 0]);
  assert.deepEqual(g.outcome, { winner: 0, points: 2, reason: 'mother' });
  assert.throws(() => E.undo(g)); assert.throws(() => move(g, 23, 17, 6));
  const next = E.nextGame(g); assert.deepEqual(next.score, [2, 0]); assert.equal(next.active, 0);
});
test('mother capture works in both directions and finishes round', () => {
  const g = move(game(position([[22, 0, 15], [23, 1, 0], [10, 14, 0]]), [1, 4], 1, [0, 1]), 22, 23, 1);
  assert.equal(g.phase, 'roundOver'); assert.deepEqual(g.score, [0, 3]);
  assert.throws(() => E.nextGame(g)); assert.deepEqual(E.startRound().score, [0, 0]);
});
test('bearing off home restriction includes pinned checkers', () => {
  const p = position([[0, 14, 0], [8, 1, 1, 1], [15, 0, 14]]);
  assert.ok(!E.rawMoves(p, 0, 1).some(m => m.to === -1));
});
test('exact and oversize bearing off, but never oversize from lower point', () => {
  const p = position([[5, 1, 0], [1, 14, 0], [12, 0, 15]]);
  assert.ok(E.rawMoves(p, 0, 6).some(m => m.from === 5 && m.to === -1));
  assert.ok(!E.rawMoves(p, 0, 4).some(m => m.to === -1));
  const q = position([[1, 15, 0], [12, 0, 15]]);
  assert.ok(E.rawMoves(q, 0, 6).some(m => m.to === -1));
  const mirrored = position([[22, 0, 15], [10, 15, 0]]);
  assert.ok(E.rawMoves(mirrored, 1, 6).some(m => m.to === -1));
});
test('normal win earns one, mars earns two, score awards exactly once', () => {
  for (const opponentOff of [0, 1]) {
    const g = move(game(position([[0, 1, 0], [12, 0, 15 - opponentOff]], [14, opponentOff]), [1, 6], 0, [2, 0]), 0, -1, 1);
    assert.equal(g.outcome.points, opponentOff ? 1 : 2);
    assert.equal(g.phase, 'roundOver'); assert.deepEqual(g.score, [opponentOff ? 3 : 4, 0]);
    assert.throws(() => E.endTurn(g));
  }
});
test('complete deterministic games conserve pieces and terminate', () => {
  let g = E.openingRoll(E.openingRoll(E.startRound(), 0, 6), 1, 1);
  let seed = 42; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed; };
  let turns = 0;
  while (g.phase !== 'roundOver' && turns < 2000) {
    if (g.phase === 'gameOver') g = E.nextGame(g);
    if (g.phase === 'roll') { g = E.roll(g, [rand() % 6 + 1, rand() % 6 + 1]); turns++; }
    let moves = E.availableMoves(g);
    while (moves.length) {
      g = E.applyMove(g, moves[rand() % moves.length]);
      assert.deepEqual(totals(g.position), [15, 15]);
      for (const point of g.position.points) {
        assert.ok(point.count.every(n => n >= 0));
        if (point.count[0] && point.count[1]) assert.equal(point.count[E.other(point.top)], 1);
      }
      moves = E.availableMoves(g);
    }
    if (g.phase === 'moving') g = E.endTurn(g);
  }
  assert.equal(g.phase, 'roundOver'); assert.ok(turns < 2000);
});
test('worst-case doubles performance is recorded', () => {
  const p = position(Array.from({ length: 15 }, (_, i) => [i, 1, 0]).concat([[20, 0, 15]]));
  const before = performance.now(); const moves = E.legalMoves(p, 0, [1, 1, 1, 1]);
  const duration = performance.now() - before;
  console.log(`Spread-board double-1 evaluation: ${duration.toFixed(1)} ms (${moves.length} first moves)`);
  assert.ok(moves.length > 0); assert.ok(duration < 2000);
  const pathsStart = performance.now();
  const paths = E.availableMovePaths(game(p, [1, 1]), 14);
  const pathsDuration = performance.now() - pathsStart;
  console.log(`Spread-board combined destinations: ${pathsDuration.toFixed(1)} ms (${paths.length} routes)`);
  assert.ok(paths.length > 0); assert.ok(pathsDuration < 2000);
});
