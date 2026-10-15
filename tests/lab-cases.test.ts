import { describe, expect, it } from 'vitest';
import * as E from '../src/lib/engine';
import { exportLabCollection, parseLabCollection, previewTurn, resultKey, validateLabInput } from '../src/lib/lab/cases';
import type { LabCollection } from '../src/lib/lab/cases';
import { botFixtures, mirrored } from './helpers/bot-fixtures';

const input = () => ({ ...botFixtures.opening(), score: [0, 0] as E.Pair });
function collection(): LabCollection {
  const state = input(), plans = E.generateTurns(state);
  return { format: 'mahbusa-expert-lab', version: 1, cases: [
    { id: 'opening', title: 'Opening choices', input: state, annotations: plans.map((p, i) => ({
      resultKey: resultKey(p), judgment: i ? 'acceptable' : 'preferred', note: 'Keep support.',
    })) },
  ] };
}
describe('expert lab boundaries', () => {
  it.each(['opening', 'pinRetention', 'motherCapture', 'unsupportedMother'] as const)('accepts structurally valid %s for both colors and owns data', key => {
    const original = { ...botFixtures[key](), score: [1, 2] as E.Pair };
    expect(validateLabInput(original)).toEqual(original);
    expect(validateLabInput({ ...mirrored(original), score: [2, 1] })).toMatchObject({ active: 1 });
    const copy = validateLabInput(original); copy.position.points[0].count[1] = 0; copy.score[0] = 2;
    expect(original.score).toEqual([1, 2]);
    expect(original.position.points[0].count[1]).toBe(botFixtures[key]().position.points[0].count[1]);
  });

  const invalid: [string, (x: any) => void][] = [
    ['point count', x => x.position.points.pop()],
    ['sparse points', x => { delete x.position.points[5]; }],
    ['fractional count', x => x.position.points[23].count[0] = 14.5],
    ['negative count', x => x.position.points[1].count[0] = -1],
    ['wrong total', x => x.position.points[23].count[0] = 14],
    ['empty top', x => x.position.points[2].top = 0],
    ['wrong single color top', x => x.position.points[23].top = 1],
    ['multiple captives', x => { x.position.points[23].count = [13, 2]; x.position.points[23].top = 0; x.position.off = [2, 0]; x.position.points[0].count[1] = 13; }],
    ['captured mother', x => { x.position.points[23] = { count: [1, 1], top: 1 }; x.position.points[22] = { count: [14, 0], top: 0 }; x.position.points[0].count[1] = 14; }],
    ['completed board', x => { x.position.points[23] = { count: [0, 0], top: null }; x.position.off[0] = 15; }],
    ['invalid score', x => x.score = [3, 0]],
    ['fractional score', x => x.score = [0.1, 0]],
    ['unknown active', x => x.active = 2],
    ['partial roll', x => x.remaining = [1]],
    ['unexpanded doubles', x => x.remaining = [2, 2]],
    ['mixed doubles', x => x.remaining = [2, 2, 2, 3]],
    ['invalid die', x => x.remaining = [0, 2]],
    ['sparse dice', x => { delete x.remaining[1]; }],
  ];
  it.each(invalid)('rejects %s', (_, mutate) => {
    const state = input(); mutate(state);
    expect(() => validateLabInput(state)).toThrow();
  });
  it('rejects arbitrary null and array inputs', () => {
    for (const value of [null, [], {}, { position: null }]) expect(() => validateLabInput(value)).toThrow();
  });
  it('accepts expanded doubles and a blocked full roll', () => {
    expect(validateLabInput({ ...input(), remaining: [4, 4, 4, 4] }).remaining).toHaveLength(4);
    expect(validateLabInput({ ...botFixtures.blocked(), score: [0, 0] }).active).toBe(0);
  });

  it('round trips multiple labels and notes without cached values', () => {
    const original = collection(), text = exportLabCollection(original);
    expect(parseLabCollection(text)).toEqual(original);
    expect(text).not.toContain('rawValue');
    const parsed = parseLabCollection(text); parsed.cases[0].annotations[0].note = 'Changed';
    expect(original.cases[0].annotations[0].note).toBe('Keep support.');
    original.cases[0].annotations[1].judgment = 'preferred';
    expect(parseLabCollection(exportLabCollection(original)).cases[0].annotations
      .every(a => a.judgment === 'preferred')).toBe(true);
  });
  it('keys final results independently of move ordering and object property ordering', () => {
    const plan = E.generateTurns(input())[0];
    expect(resultKey({ ...plan, moves: [...plan.moves].reverse() })).toBe(resultKey(plan));
    expect(resultKey({ ...plan, position: { off: plan.position.off,
      points: plan.position.points.map(p => ({ top: p.top, count: p.count })) } })).toBe(resultKey(plan));
  });

  const badCollection: [string, (x: any) => void][] = [
    ['version', x => x.version = 2],
    ['format', x => x.format = 'other'],
    ['empty cases', x => x.cases = []],
    ['too many cases', x => x.cases = Array.from({ length: 21 }, (_, i) => ({ ...x.cases[0], id: String(i) }))],
    ['duplicate case ID', x => x.cases.push(structuredClone(x.cases[0]))],
    ['too many labels', x => x.cases[0].annotations = Array(101).fill(x.cases[0].annotations[0])],
    ['duplicate label', x => x.cases[0].annotations.push(x.cases[0].annotations[0])],
    ['stale result', x => x.cases[0].annotations[0].resultKey = 'obsolete'],
    ['judgment', x => x.cases[0].annotations[0].judgment = 'great'],
    ['long note', x => x.cases[0].annotations[0].note = 'x'.repeat(4001)],
    ['long title', x => x.cases[0].title = 'x'.repeat(161)],
    ['blank title', x => x.cases[0].title = '   '],
    ['invalid board', x => x.cases[0].input.position.points[0].count[1] = 0],
  ];
  it.each(badCollection)('rejects collection %s atomically', (_, mutate) => {
    const original = collection(), bad = structuredClone(original); mutate(bad);
    const before = structuredClone(original);
    expect(() => parseLabCollection(JSON.stringify(bad))).toThrow();
    expect(original).toEqual(before);
  });
  it('rejects malformed and over-limit UTF-8 JSON before parsing cases', () => {
    expect(() => parseLabCollection('{bad')).toThrow();
    expect(() => parseLabCollection('é'.repeat(524289))).toThrow(/MiB/);
  });
});

describe('checked candidate preview', () => {
  it('previews the original, each prefix, and final position without touching case or plan', () => {
    const state = input(), plan = E.generateTurns(state)[0], before = structuredClone({ state, plan });
    expect(previewTurn(state, null, 0).position).toEqual(state.position);
    let game = previewTurn(state, null, 0);
    for (let i = 0; i <= plan.moves.length; i++) {
      expect(previewTurn(state, plan, i).position).toEqual(game.position);
      if (i < plan.moves.length) game = E.applyMove(game, plan.moves[i]);
    }
    expect(previewTurn(state, plan, plan.moves.length).position).toEqual(plan.position);
    expect({ state, plan }).toEqual(before);
  });
  it('previews immediate mother win and exact score without next-game reset', () => {
    const state = { ...botFixtures.motherCapture(), score: [1, 0] as E.Pair };
    const plan = E.generateTurns(state).find(p => p.outcome)!;
    expect(previewTurn(state, plan, plan.moves.length)).toMatchObject({
      phase: 'roundOver', score: [3, 0], position: plan.position,
    });
  });
  it('rejects illegal replay steps and out-of-range prefixes', () => {
    const state = input(), plan = E.generateTurns(state)[0];
    for (const count of [-1, .5, 3]) expect(() => previewTurn(state, plan, count)).toThrow();
    expect(() => previewTurn(state, { ...plan, moves: [{ from: 0, to: 1, die: 1 }] }, 1)).toThrow(/legal/);
  });
});
