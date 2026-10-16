import { applyMove, availableMoves, createGame, generateTurns, startPoint } from '../engine';
import type { Game, Pair, Player, Point } from '../engine';
import type { TurnInput, TurnPlan } from '../bot/types';

export type LabInput = TurnInput & { score: Pair };
export type Judgment = 'preferred' | 'acceptable' | 'bad';
export type LabAnnotation = { resultKey: string; judgment: Judgment; note: string };
export type LabCase = { id: string; title: string; input: LabInput; annotations: LabAnnotation[] };
export type LabCollection = { format: 'mahbusa-expert-lab'; version: 1; cases: LabCase[] };
export const MAX_LAB_BYTES = 1024 * 1024;
export const MAX_LAB_CASES = 20;

function fail(message: string): never { throw new Error(message); }
function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(name + ' must be an object.');
  return value as Record<string, unknown>;
}
function integer(value: unknown, min: number, max: number, name: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    fail(name + ' must be an integer from ' + min + ' to ' + max + '.');
  }
  return value;
}
function pair(value: unknown, max: number, name: string): Pair {
  if (!Array.isArray(value) || value.length !== 2) fail(name + ' must have two counts.');
  return [integer(value[0], 0, max, name), integer(value[1], 0, max, name)];
}
function string(value: unknown, max: number, name: string, allowBlank = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowBlank && !value.trim())) {
    fail(name + ' must be ' + (allowBlank ? 'at most ' : '1–') + max + ' characters.');
  }
  return value;
}

/** Structural editor boundary, not a proof of reachability from the opening.
 * Never pass an unvalidated draft/import into the engine or evaluator.
 */
export function validateLabInput(value: unknown): LabInput {
  const input = object(value, 'Input'), board = object(input.position, 'Position');
  const active = integer(input.active, 0, 1, 'Player') as Player;
  const score = pair(input.score, 2, 'Score'), off = pair(board.off, 14, 'Borne off');
  if (!Array.isArray(board.points) || board.points.length !== 24) fail('Board must have 24 points.');
  const points = Array.from(board.points, (raw, i): Point => {
    const point = object(raw, 'Point ' + (i + 1)), count = pair(point.count, 15, 'Point ' + (i + 1));
    const top = point.top;
    if (top !== null && top !== 0 && top !== 1) fail('Invalid top color on point ' + (i + 1) + '.');
    if (!count[0] && !count[1]) {
      if (top !== null) fail('Empty point ' + (i + 1) + ' must have no top color.');
    } else if (top === null || count[top] === 0) {
      fail('Top color must have checkers on point ' + (i + 1) + '.');
    } else if (count[0] && count[1] && count[top === 0 ? 1 : 0] !== 1) {
      fail('A mixed stack must have exactly one pinned checker.');
    }
    return { count, top };
  });
  for (const player of [0, 1] as const) {
    if (off[player] + points.reduce((n, p) => n + p.count[player], 0) !== 15) {
      fail((player === 0 ? 'Light' : 'Dark') + ' must have exactly 15 checkers including borne off.');
    }
    const mother = points[startPoint(player)];
    if (mother.count[player] === 1 && mother.top !== player) fail('A captured mother is a finished game.');
  }
  if (!Array.isArray(input.remaining)) fail('Dice must be an array.');
  const remaining = Array.from(input.remaining, d => integer(d, 1, 6, 'Die')).sort((a, b) => a - b);
  if (!((remaining.length === 2 && remaining[0] !== remaining[1])
    || (remaining.length === 4 && remaining.every(d => d === remaining[0])))) {
    fail('Use a full roll: two distinct dice or four equal dice for doubles.');
  }
  return { position: { points, off }, active, score, remaining };
}

/** Exact structural identity, independent of representative path or heuristics. */
export function resultKey(plan: TurnPlan): string {
  return JSON.stringify([plan.position.points.map(p => [p.count[0], p.count[1], p.top]),
    plan.position.off, [...plan.remaining].sort((a, b) => a - b),
    plan.outcome ? [plan.outcome.winner, plan.outcome.points, plan.outcome.reason] : null]);
}

export function parseLabCollection(text: string): LabCollection {
  if (new TextEncoder().encode(text).byteLength > MAX_LAB_BYTES) fail('JSON exceeds 1 MiB.');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { fail('Invalid JSON.'); }
  const data = object(raw, 'Collection');
  if (data.format !== 'mahbusa-expert-lab' || data.version !== 1) fail('Unsupported lab format or version.');
  if (!Array.isArray(data.cases) || !data.cases.length || data.cases.length > MAX_LAB_CASES) {
    fail('A collection must contain 1–20 cases.');
  }
  const ids = new Set<string>();
  const cases = data.cases.map(rawCase => {
    const row = object(rawCase, 'Case'), id = string(row.id, 80, 'Case ID');
    if (ids.has(id)) fail('Duplicate case ID.'); ids.add(id);
    const title = string(row.title, 160, 'Title'), input = validateLabInput(row.input);
    if (!Array.isArray(row.annotations) || row.annotations.length > 100) fail('Use at most 100 annotations per case.');
    const legalKeys = row.annotations.length ? new Set(generateTurns(input).map(resultKey)) : new Set<string>();
    const seen = new Set<string>();
    const annotations = row.annotations.map((rawAnnotation): LabAnnotation => {
      const annotation = object(rawAnnotation, 'Annotation');
      const key = string(annotation.resultKey, 4096, 'Result key');
      if (!legalKeys.has(key)) fail('Annotation refers to a stale or illegal result.');
      if (seen.has(key)) fail('Duplicate result annotation.'); seen.add(key);
      const judgment = annotation.judgment;
      if (judgment !== 'preferred' && judgment !== 'acceptable' && judgment !== 'bad') fail('Invalid judgment.');
      return { resultKey: key, judgment, note: string(annotation.note, 4000, 'Note', true) };
    });
    return { id, title, input, annotations };
  });
  return { format: 'mahbusa-expert-lab', version: 1, cases };
}

/** Transactional size guard for trusted editor mutations. Use parseLabCollection
 * for untrusted data; do not regenerate every legal label on each keystroke.
 */
export function withLabCase(data: LabCollection, next: LabCase): LabCollection {
  const cases = data.cases.some(c => c.id === next.id)
    ? data.cases.map(c => c.id === next.id ? next : c) : [...data.cases, next];
  if (cases.length > MAX_LAB_CASES) fail('Collection is full (20 cases). Export, then start a new collection.');
  const result = { ...data, cases };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > MAX_LAB_BYTES) {
    fail('Collection would exceed 1 MiB. This edit was not saved; export before starting another collection.');
  }
  return result;
}

export function exportLabCollection(data: LabCollection): string {
  const clean = parseLabCollection(JSON.stringify(data));
  const pretty = JSON.stringify(clean, null, 2);
  // Accepted compact imports must remain exportable; formatting is optional.
  return new TextEncoder().encode(pretty).byteLength <= MAX_LAB_BYTES ? pretty : JSON.stringify(clean);
}

export function previewTurn(input: LabInput, plan: TurnPlan | null, steps: number): Game {
  const clean = validateLabInput(input);
  if (!Number.isInteger(steps) || steps < 0 || steps > (plan?.moves.length ?? 0)) fail('Invalid preview step.');
  let game: Game = { ...createGame(), ...clean, phase: 'moving',
    dice: [clean.remaining[0], clean.remaining[clean.remaining.length - 1]] };
  for (const move of plan?.moves.slice(0, steps) ?? []) {
    if (!availableMoves(game).some(m => m.from === move.from && m.to === move.to && m.die === move.die)) {
      fail('Cannot preview an illegal move.');
    }
    game = applyMove(game, move);
  }
  return game;
}
