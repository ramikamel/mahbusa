import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import * as E from '../src/lib/engine';
import type { TurnInput, TurnPlan } from '../src/lib/bot/types';
import { botFixtures, mirrored, turnFixture } from './helpers/bot-fixtures';
import { referenceTurns } from './helpers/reference-turns';

function keys(plans: TurnPlan[]) {
  return plans.map(p => JSON.stringify([
    p.position.points.map(point => [point.count[0], point.count[1], point.top]),
    p.position.off, p.remaining,
    p.outcome && [p.outcome.winner, p.outcome.points, p.outcome.reason],
  ])).sort();
}
function stacks(plan: TurnPlan) {
  return plan.position.points.flatMap((p, i) => p.count[0] + p.count[1] ? [[i, ...p.count]] : []);
}
function checkReplay(input: TurnInput, plan: TurnPlan) {
  let game: E.Game = { ...E.createGame(), phase: 'moving', active: input.active,
    position: structuredClone(input.position), remaining: [...input.remaining] };
  for (const move of plan.moves) game = E.applyMove(game, move);
  expect(game.position).toEqual(plan.position);
  expect([...game.remaining].sort((a, b) => a - b)).toEqual(plan.remaining);
  expect(game.outcome).toEqual(plan.outcome);
  expect(E.availableMoves(game)).toEqual([]);
  for (const player of [0, 1]) {
    expect(plan.position.off[player] + plan.position.points.reduce((n, p) => n + p.count[player], 0)).toBe(15);
  }
}

describe('complete legal turns', () => {
  it('includes split-checker and combined opening plays, without duplicate orders', () => {
    const plans = E.generateTurns(botFixtures.opening());
    expect(plans.map(stacks)).toEqual(expect.arrayContaining([
      [[0, 0, 15], [17, 1, 0], [23, 14, 0]],
      [[0, 0, 15], [19, 1, 0], [21, 1, 0], [23, 13, 0]],
    ]));
    expect(plans).toHaveLength(2);
    expect(plans.every(p => p.moves.length === 2 && p.remaining.length === 0)).toBe(true);
  });

  it('includes both ways to split different dice between different source points', () => {
    const input = turnFixture([[8, 1, 0], [12, 1, 0], [0, 0, 15]], [13, 0], [1, 2]);
    const plans = E.generateTurns(input);
    expect(plans.map(stacks)).toEqual(expect.arrayContaining([
      [[0, 0, 15], [7, 1, 0], [10, 1, 0]],
      [[0, 0, 15], [6, 1, 0], [11, 1, 0]],
      [[0, 0, 15], [5, 1, 0], [12, 1, 0]],
      [[0, 0, 15], [8, 1, 0], [9, 1, 0]],
    ]));
    expect(plans).toHaveLength(4);
  });

  it('returns one pass for a blocked turn, preserving unused dice', () => {
    const input = botFixtures.blocked();
    expect(E.generateTurns(input)).toEqual([
      { moves: [], position: input.position, remaining: [1, 2], outcome: null },
    ]);
  });

  it('returns one complete empty turn after all dice are consumed', () => {
    const input = { ...botFixtures.opening(), remaining: [] };
    expect(E.generateTurns(input)).toEqual([
      { moves: [], position: input.position, remaining: [], outcome: null },
    ]);
  });

  it('preserves the forced dice order and maximum dice usage', () => {
    const plans = E.generateTurns(botFixtures.forcedOrder());
    expect(plans).toHaveLength(1);
    expect(plans[0].moves).toEqual([{ from: 5, to: 4, die: 1 }, { from: 4, to: 2, die: 2 }]);
  });

  it('uses the higher die when only one nonwinning move can be played', () => {
    const plans = E.generateTurns(botFixtures.higherDie());
    expect(plans).toHaveLength(1);
    expect(plans[0].moves).toEqual([{ from: 5, to: 3, die: 2 }]);
    expect(plans[0].remaining).toEqual([1]);
  });

  it('finds all three doubles distributions across two checkers', () => {
    const plans = E.generateTurns(botFixtures.doubles());
    expect(plans.map(stacks)).toEqual(expect.arrayContaining([
      [[0, 1, 0], [8, 1, 0], [12, 0, 15]],
      [[2, 1, 0], [6, 1, 0], [12, 0, 15]],
      [[4, 2, 0], [12, 0, 15]],
    ]));
    expect(plans).toHaveLength(3);
    expect(plans.every(p => p.moves.length === 4)).toBe(true);
  });

  it('respects partial doubles and blocked continuations', () => {
    const input = { ...botFixtures.doubles(), remaining: [2, 2, 2] };
    expect(keys(E.generateTurns(input))).toEqual(keys(referenceTurns(input)));
    expect(E.generateTurns(input).every(p => p.moves.length === 3)).toBe(true);
  });

  it('includes immediate mother wins without requiring another die first', () => {
    const plans = E.generateTurns(botFixtures.motherCapture());
    expect(plans.some(p => p.moves.length === 1 && p.moves[0].from === 1 && p.moves[0].to === 0)).toBe(true);
    for (const p of plans.filter(p => p.outcome)) {
      expect(p.outcome).toEqual({ winner: 0, points: 2, reason: 'mother' });
      expect(p.moves.at(-1)?.to).toBe(0);
      expect(p.remaining).toEqual([]);
    }
  });

  it('includes retaining a pin and legal releases instead of imposing strategy rules', () => {
    const plans = E.generateTurns(botFixtures.pinRetention());
    expect(plans.some(p => p.position.points[2].top === 0)).toBe(true);
    const forced = E.generateTurns(botFixtures.forcedRelease());
    expect(forced).toHaveLength(1);
    expect(forced[0].position.points[2]).toEqual({ count: [0, 1], top: 1 });
    expect(forced[0].position.points[1]).toEqual({ count: [1, 0], top: 0 });
  });

  it('never moves a checker from under a pin', () => {
    const input = turnFixture([[8, 1, 1, 1], [5, 14, 0], [12, 0, 14]], [0, 0], [1, 2]);
    const plans = E.generateTurns(input);
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every(p => p.moves.every(m => m.from !== 8))).toBe(true);
    expect(plans.every(p => p.position.points[8].top === 1)).toBe(true);
  });

  it('finishes bearing off immediately and leaves scoring to the caller', () => {
    const input = botFixtures.bearOff();
    const plans = E.generateTurns(input);
    expect(plans).toHaveLength(1);
    expect(plans[0].position.off).toEqual([15, 1]);
    expect(plans[0].outcome).toEqual({ winner: 0, points: 1, reason: 'bear-off' });
    expect(plans[0].moves).toHaveLength(2);
    const twoPoint = E.generateTurns(turnFixture([[0, 1, 0], [12, 0, 15]], [14, 0], [1, 6]));
    expect(twoPoint).toHaveLength(1);
    expect(twoPoint[0].moves).toHaveLength(1);
    expect(twoPoint[0].outcome).toEqual({ winner: 0, points: 2, reason: 'bear-off' });
  });

  it('is stable when dice order changes', () => {
    const input = botFixtures.opening();
    expect(E.generateTurns(input)).toEqual(E.generateTurns({ ...input, remaining: [4, 2] }));
  });

  it('does not mutate inputs or share mutable output positions, moves or dice', () => {
    const input = botFixtures.opening(), before = structuredClone(input);
    const plans = E.generateTurns(input), saved = structuredClone(plans[1]);
    expect(input).toEqual(before);
    plans[0].position.points[0].count[1] = 0;
    plans[0].position.off[0] = 99;
    plans[0].moves[0].from = 99;
    plans[0].remaining.push(6);
    expect(input).toEqual(before);
    expect(plans[1]).toEqual(saved);
  });

  it.each([[0], [7], [NaN], [1.5], [1, 2, 3], [1, 1, 2], [1, 1, 1, 1, 1]].map(remaining => ({ remaining })))('rejects invalid remaining dice $remaining', ({ remaining }) => {
    expect(() => E.generateTurns({ ...botFixtures.opening(), remaining })).toThrow('dice');
  });

  it('rejects an unknown active player', () => {
    expect(() => E.generateTurns({ ...botFixtures.opening(), active: 2 as E.Player })).toThrow('player');
  });
});

describe('independent exhaustive turn oracle', () => {
  for (const [name, build] of Object.entries(botFixtures)) {
    for (const swap of [false, true]) {
      it(`matches ${name}, ${swap ? 'Dark' : 'Light'}, and every plan replays legally`, () => {
        const original = build(), input = swap ? mirrored(original) : original;
        const plans = E.generateTurns(input);
        expect(keys(plans)).toEqual(keys(referenceTurns(input)));
        expect(new Set(keys(plans)).size).toBe(plans.length);
        for (const plan of plans) checkReplay(input, plan);
      });
    }
  }

  it('matches all 21 rolls for both colors on a two-checker contact board', () => {
    for (const active of [0, 1]) for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) {
      const base = turnFixture([[8, 1, 0], [12, 1, 0], [0, 0, 15]], [13, 0], a === b ? [a, a, a, a] : [a, b]);
      const input = active === 0 ? base : mirrored(base);
      expect(keys(E.generateTurns(input))).toEqual(keys(referenceTurns(input)));
    }
  });

  it('records complete spread-board doubles cost without touching UI history', () => {
    const position = E.emptyPosition();
    for (let i = 0; i < 15; i++) position.points[i] = { count: [1, 0], top: 0 };
    position.points[20] = { count: [0, 15], top: 1 };
    const before = performance.now();
    const plans = E.generateTurns({ position, active: 0, remaining: [1, 1, 1, 1] });
    console.log(`Complete spread-board double-1: ${(performance.now() - before).toFixed(1)} ms (${plans.length} final positions)`);
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every(p => p.moves.length === 4)).toBe(true);
    expect(new Set(keys(plans)).size).toBe(plans.length);
  });
});
