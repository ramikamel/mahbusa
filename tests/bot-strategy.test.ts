import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { initialPosition } from '../src/lib/engine';
import type { Pair, Player } from '../src/lib/engine';
import type { PreRollState } from '../src/lib/bot/types';
import { evaluateStrategy, explainStrategy, strategyEvaluator } from '../src/lib/bot/strategy';
import { botFixtures, mirrored, turnFixture } from './helpers/bot-fixtures';

function state(stacks: [number, number, number, Player?][], off: Pair = [0, 0], score: Pair = [0, 0]): PreRollState {
  return { ...turnFixture(stacks, off, []), score: [...score] };
}
function feature(input: PreRollState, key: string, perspective: Player = input.active) {
  const item = explainStrategy(input, perspective).contributions.find(c => c.key === key);
  if (!item) throw new Error('Missing feature: ' + key);
  return item;
}
const mother = () => state([[23, 1, 0], [18, 14, 0], [20, 0, 1], [0, 0, 14]]);

describe('inspectable strategy evaluator', () => {
  it('prefers protecting the mother over a little extra progress', () => {
    const protectedState = state([[23, 2, 0], [18, 13, 0], [20, 0, 1], [0, 0, 14]]);
    const exposedState = state([[23, 1, 0], [22, 1, 0], [18, 13, 0], [20, 0, 1], [0, 0, 14]]);
    expect(evaluateStrategy(protectedState).value).toBeGreaterThan(evaluateStrategy(exposedState).value);
  });

  it('counts direct, combined and repeated-double mother attacks without double-counting', () => {
    // Distance 3: rolls containing 3 (11/36), 1+2 (2/36), double 1 (1/36).
    expect(feature(mother(), 'motherThreat').own).toBeCloseTo(14 / 36, 12);
  });

  it('respects blocked intermediate points in mother attack routes', () => {
    const input = state([[23, 1, 0], [21, 2, 0], [22, 2, 0], [18, 10, 0], [20, 0, 1], [0, 0, 14]]);
    // Both 1+2 routes and repeated ones blocked; only rolls containing 3 survive.
    expect(feature(input, 'motherThreat').own).toBeCloseTo(11 / 36, 12);
  });

  it('finds a mother attack that needs three uses of a double', () => {
    const input = state([[23, 1, 0], [22, 14, 0], [5, 0, 15]]);
    expect(feature(input, 'motherThreat').own).toBeCloseTo(1 / 36, 12);
  });

  it('does not invent mother danger from a pinned attacking checker', () => {
    const input = state([[23, 1, 0], [18, 13, 0], [20, 1, 1, 0], [0, 0, 14]]);
    expect(feature(input, 'motherThreat').own).toBe(0);
  });

  it('does not treat a protected or departed mother as exposed', () => {
    const opening = { position: initialPosition(), active: 0 as Player, score: [0, 0] as Pair };
    expect(feature(opening, 'motherExposure').own).toBe(0);
    expect(feature(opening, 'motherThreat').own).toBe(0);
    expect(feature(state([[10, 15, 0], [0, 0, 15]]), 'motherExposure').own).toBe(0);
  });

  it('values pin cover reserves and advancing checkers past a held pin', () => {
    const thin = state([[2, 1, 1, 0], [4, 14, 0], [12, 0, 14]]);
    const covered = state([[2, 3, 1, 0], [4, 12, 0], [12, 0, 14]]);
    const passed = state([[2, 3, 1, 0], [4, 11, 0], [1, 1, 0], [12, 0, 14]]);
    expect(feature(covered, 'pinReserves').own).toBeGreaterThan(feature(thin, 'pinReserves').own);
    expect(evaluateStrategy(covered).value).toBeGreaterThan(evaluateStrategy(thin).value);
    expect(feature(passed, 'pinPassage').own).toBeGreaterThan(feature(covered, 'pinPassage').own);
    expect(evaluateStrategy(passed).value).toBeGreaterThan(evaluateStrategy(covered).value);
  });

  it('gives pins nearer the opponents start greater location value', () => {
    const near = state([[1, 3, 1, 0], [5, 12, 0], [12, 0, 14]]);
    const far = state([[5, 3, 1, 0], [1, 12, 0], [12, 0, 14]]);
    expect(feature(near, 'pins').own).toBeGreaterThan(feature(far, 'pins').own);
  });

  it('limits two-point leverage to relevant pins, scores and opponents with none off', () => {
    const held = state([[2, 3, 1, 0], [4, 12, 0], [12, 0, 14]]);
    expect(feature(held, 'twoPointLeverage').own).toBeGreaterThan(0);
    expect(feature({ ...held, score: [2, 0] }, 'twoPointLeverage').own).toBe(0);
    const oneOff = state([[2, 3, 1, 0], [4, 12, 0], [12, 0, 13]], [0, 1]);
    expect(feature(oneOff, 'twoPointLeverage').own).toBe(0);
    const captiveHome = state([[20, 3, 1, 0], [22, 12, 0], [12, 0, 14]]);
    expect(feature(captiveHome, 'twoPointLeverage').own).toBe(0);
  });

  it('prefers supported checkers over directly pinnable singletons', () => {
    const hanging = state([[10, 1, 0], [18, 14, 0], [8, 0, 1], [0, 0, 14]]);
    const supported = state([[10, 2, 0], [18, 13, 0], [8, 0, 1], [0, 0, 14]]);
    expect(feature(hanging, 'blotPressure').own).toBeGreaterThan(0);
    expect(feature(supported, 'blotPressure').own).toBe(0);
    expect(evaluateStrategy(supported).value).toBeGreaterThan(evaluateStrategy(hanging).value);
  });

  it('penalizes isolated contact checkers but not unreachable race singletons', () => {
    const far = state([[10, 1, 0], [18, 14, 0], [8, 0, 1], [0, 0, 14]]);
    const near = state([[10, 1, 0], [14, 14, 0], [8, 0, 1], [0, 0, 14]]);
    expect(feature(far, 'isolation').own).toBeGreaterThan(feature(near, 'isolation').own);
    const race = state([[10, 1, 0], [18, 14, 0], [20, 0, 15]]);
    expect(feature(race, 'isolation').own).toBe(0);
    expect(feature(race, 'blotPressure').own).toBe(0);
  });

  it('rewards race progress and bearing off when contact safety is equal', () => {
    const behind = state([[10, 15, 0], [20, 0, 15]]);
    const ahead = state([[8, 15, 0], [20, 0, 15]]);
    expect(evaluateStrategy(ahead).value).toBeGreaterThan(evaluateStrategy(behind).value);
    const home = state([[0, 15, 0], [20, 0, 15]]);
    const off = state([[0, 14, 0], [20, 0, 15]], [1, 0]);
    expect(evaluateStrategy(off).value).toBeGreaterThan(evaluateStrategy(home).value);
  });

  it('recognizes score advantage without interpreting a heuristic as a probability', () => {
    const base = { position: initialPosition(), active: 0 as Player, score: [0, 0] as Pair };
    const ahead = evaluateStrategy({ ...base, score: [2, 0] });
    expect(ahead.value).toBeGreaterThan(evaluateStrategy(base).value);
    expect(ahead.kind).toBe('heuristic');
    expect(strategyEvaluator.evaluate(base)).toEqual(evaluateStrategy(base));
  });

  it('explains the actual weighted score and supports the opposite perspective', () => {
    const input = mother(), report = explainStrategy(input), opposite = explainStrategy(input, 1);
    expect(report.contributions.length).toBeGreaterThan(10);
    expect(report.rawValue).toBeCloseTo(report.contributions.reduce((n, c) => n + c.contribution, 0), 12);
    expect(report.value).toBeCloseTo(Math.tanh(report.rawValue / 100), 12);
    expect(opposite.value).toBeCloseTo(-report.value, 12);
    expect(opposite.rawValue).toBeCloseTo(-report.rawValue, 12);
    expect(report.evaluatorId).toBe(strategyEvaluator.id);
    expect(report.perspective).toBe(0);
    expect(report.contributions.every(c => Number.isFinite(c.own) && Number.isFinite(c.opponent) && c.label.length > 0)).toBe(true);
  });

  it('is deterministic, bounded, nonmutating and color symmetric on all fixtures', () => {
    for (const build of Object.values(botFixtures)) {
      const fixture = build(), input = { position: fixture.position, active: fixture.active, score: [1, 2] as Pair };
      const before = structuredClone(input), result = evaluateStrategy(input);
      expect(evaluateStrategy(input)).toEqual(result);
      expect(input).toEqual(before);
      expect(Number.isFinite(result.value)).toBe(true);
      expect(Math.abs(result.value)).toBeLessThan(1);
      const swapped = mirrored(fixture);
      expect(evaluateStrategy({ ...swapped, score: [2, 1] }).value).toBeCloseTo(result.value, 12);
    }
  });

  it.each([[3, 0], [-1, 0], [0.5, 1], [NaN, 0]])('rejects invalid pre-roll score %j', (a, b) => {
    expect(() => evaluateStrategy({ position: initialPosition(), active: 0, score: [a, b] })).toThrow('score');
  });

  it('rejects unknown active players and explanation perspectives', () => {
    const input = mother();
    expect(() => evaluateStrategy({ ...input, active: 2 as Player })).toThrow('player');
    expect(() => explainStrategy(input, 2 as Player)).toThrow('player');
  });

  it('records baseline evaluation cost for a mother-contact position', () => {
    const input = mother(), before = performance.now();
    for (let i = 0; i < 100; i++) evaluateStrategy(input);
    console.log('Strategy evaluator, 100 contact positions: ' + (performance.now() - before).toFixed(1) + ' ms');
    expect(evaluateStrategy(input).kind).toBe('heuristic');
  });
});
