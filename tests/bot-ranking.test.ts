import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import * as E from '../src/lib/engine';
import { rankStrategyTurns } from '../src/lib/bot/rank-strategy';
import { evaluateStrategy } from '../src/lib/bot/strategy';
import { botFixtures, mirrored, turnFixture } from './helpers/bot-fixtures';

function choice(score: E.Pair = [0, 0]) {
  return { ...turnFixture([[1, 1, 0], [0, 0, 1]], [14, 14], [1, 2]), score };
}

describe('strategy turn ranking', () => {
  it('prefers a two-point game to one point before either ends the round', () => {
    const rows = rankStrategyTurns(choice());
    expect(rows.map(r => r.plan.outcome?.points)).toEqual([2, 1]);
    expect(rows.map(r => r.kind)).toEqual(['next-game', 'next-game']);
    expect(rows[0].value.value).toBeGreaterThan(rows[1].value.value);
    for (const row of rows) {
      expect(row.continuation).toEqual({ position: E.initialPosition(), active: 0,
        score: [row.plan.outcome!.points, 0] });
      expect(row.explanation?.perspective).toBe(0);
      expect(row.value.value).toBe(row.explanation?.value);
    }
  });

  it('recognizes the round-winning value rather than resetting the board again', () => {
    const rows = rankStrategyTurns(choice([1, 0]));
    expect(rows[0].plan.outcome?.points).toBe(2);
    expect(rows[0]).toMatchObject({ kind: 'round-win', continuation: null,
      explanation: null, value: { kind: 'round-win-expectation', value: 1 } });
    expect(rows[1].kind).toBe('next-game');
    expect(rows[1].continuation?.score).toEqual([2, 0]);
  });

  it('keeps stable generation order when either award wins the round', () => {
    const input = choice([2, 1]), rows = rankStrategyTurns(input);
    expect(rows.map(r => r.plan)).toEqual(E.generateTurns(input));
    expect(rows.every(r => r.kind === 'round-win' && r.value.value === 1)).toBe(true);
  });

  it('ranks an immediate mother round win above all nonwinning choices', () => {
    const input = { ...botFixtures.motherCapture(), score: [1, 2] as E.Pair };
    const rows = rankStrategyTurns(input);
    expect(rows.some(r => r.kind === 'handover')).toBe(true);
    expect(rows[0].kind).toBe('round-win');
    expect(rows[0].plan.outcome?.reason).toBe('mother');
    expect(rows.filter(r => r.kind === 'handover').every(r => r.value.value < 1)).toBe(true);
  });

  it('evaluates a blocked handover from the original player perspective', () => {
    const input = { ...botFixtures.blocked(), score: [1, 2] as E.Pair };
    const rows = rankStrategyTurns(input);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.kind).toBe('handover');
    expect(row.continuation).toEqual({ position: input.position, active: 1, score: input.score });
    expect(row.value.kind).toBe('heuristic');
    expect(row.value.value).toBeCloseTo(-evaluateStrategy(row.continuation!).value, 14);
    expect(row.explanation?.perspective).toBe(0);
  });

  it('handles color reflection, score reflection and winning starter together', () => {
    const input = choice([1, 2]);
    const dark = { ...mirrored(input), score: [2, 1] as E.Pair };
    const lightRows = rankStrategyTurns(input), darkRows = rankStrategyTurns(dark);
    expect(darkRows.map(r => r.value)).toEqual(lightRows.map(r => r.value));
    expect(darkRows.map(r => r.kind)).toEqual(lightRows.map(r => r.kind));
    expect(darkRows[1].continuation).toEqual({ position: E.initialPosition(), active: 1, score: [2, 2] });
    expect(darkRows[1].explanation?.perspective).toBe(1);
  });

  it.each(Object.entries(botFixtures))('preserves every legal plan and replays %s through checked rules', (_, fixture) => {
    const input = { ...fixture(), score: [1, 0] as E.Pair };
    const before = structuredClone(input), rows = rankStrategyTurns(input);
    const key = (p: unknown) => JSON.stringify(p);
    expect(rows.map(r => key(r.plan)).sort()).toEqual(E.generateTurns(input).map(key).sort());
    expect(rows).toEqual(rankStrategyTurns(input));
    expect(input).toEqual(before);
    for (const [i, row] of rows.entries()) {
      if (i) expect(rows[i - 1].value.value).toBeGreaterThanOrEqual(row.value.value);
      let game: E.Game = { ...E.createGame(), ...structuredClone(input), phase: 'moving' };
      for (const move of row.plan.moves) {
        expect(E.availableMoves(game)).toContainEqual(move);
        game = E.applyMove(game, move);
      }
      expect(game.position).toEqual(row.plan.position);
      expect(game.outcome).toEqual(row.plan.outcome);
      if (row.kind === 'next-game') {
        expect(E.nextGame(game)).toMatchObject(row.continuation!);
      } else if (row.kind === 'round-win') expect(game.phase).toBe('roundOver');
      else expect(row.continuation).toMatchObject({ active: E.other(input.active), score: input.score });
    }
  });

  it('leaves forced pin releases and mother exposure as legal options', () => {
    expect(rankStrategyTurns({ ...botFixtures.forcedRelease(), score: [0, 0] })[0]
      .plan.position.points[2]).toEqual({ count: [0, 1], top: 1 });
    const rows = rankStrategyTurns({ ...botFixtures.unsupportedMother(), score: [0, 0] });
    expect(rows.some(r => r.plan.position.points[23].count[0] === 1)).toBe(true);
  });

  it('owns continuation scores and boards without mutating caller state', () => {
    const input = choice(), rows = rankStrategyTurns(input), before = structuredClone(input);
    rows[0].continuation!.score[0] = 99;
    rows[0].continuation!.position.points[23].count[0] = 0;
    expect(rows[1].continuation!.score).toEqual([1, 0]);
    expect(rows[1].continuation!.position).toEqual(E.initialPosition());
    expect(input).toEqual(before);
  });

  it('rejects a finished score before considering any legal turns', () => {
    expect(() => rankStrategyTurns(choice([3, 0]))).toThrow(/score/);
  });

  it('records local spread-board double-1 ranking cost', () => {
    const input = { ...turnFixture([[6, 1, 0], [8, 1, 0], [10, 1, 0], [12, 1, 0],
      [14, 1, 0], [16, 1, 0], [18, 1, 0], [0, 0, 15]], [8, 0], [1, 1, 1, 1]),
      score: [0, 0] as E.Pair };
    const started = performance.now(), rows = rankStrategyTurns(input);
    console.log('Spread-board double-1 ranking: ' + (performance.now() - started).toFixed(1)
      + ' ms (' + rows.length + ' final positions)');
    expect(rows.length).toBeGreaterThan(100);
  });
});
