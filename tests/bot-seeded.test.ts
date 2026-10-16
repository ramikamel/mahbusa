import { describe, expect, it } from 'vitest';
import { boundedInteger, createSeededRandom, RNG_VERSION } from '../src/lib/bot/seeded';

describe('simulation random streams', () => {
  it('matches independently computed SHA-256 little-endian words', () => {
    const random = createSeededRandom('test', 'dice');
    expect(RNG_VERSION).toBe('sha256-counter-v1');
    expect(Array.from({ length: 8 }, () => random.uint32())).toEqual([
      1154488519,338692528,3737359495,1818646361,2038948914,1887217644,2006667450,3392797811,
    ]);
  });
  it('repeats seeds and separates streams across several blocks', () => {
    const a = createSeededRandom('test','dice'), b = createSeededRandom('test','dice');
    const c = createSeededRandom('test','actions'), d = createSeededRandom('other','dice');
    const draws = (r: typeof a) => Array.from({length:100},()=>r.uint32());
    const expected = draws(a);
    expect(draws(b)).toEqual(expected); expect(draws(c)).not.toEqual(expected); expect(draws(d)).not.toEqual(expected);
  });
  it('rejects the incomplete top bucket before modulo mapping', () => {
    const values = [4294967295,4294967294,4294967293,4294967292,5];
    expect(boundedInteger(()=>values.shift()!,6)).toBe(5);
    expect(values).toEqual([]);
    expect(boundedInteger(()=>4294967295,4294967296)).toBe(4294967295);
    expect(boundedInteger(()=>123,1)).toBe(0);
  });
  it('rejects invalid bounds and source values', () => {
    for (const bound of [0,-1,.5,NaN,4294967297]) expect(()=>boundedInteger(()=>0,bound)).toThrow();
    for (const value of [-1,.1,NaN,4294967296]) expect(()=>boundedInteger(()=>value,6)).toThrow();
    for (const args of [['','dice'],['s',''],['s'.repeat(257),'d']]) expect(()=>createSeededRandom(...args as [string,string])).toThrow();
  });
  it('covers all 36 ordered rolls including doubles with broad deterministic frequency checks', () => {
    const random = createSeededRandom('dice-validation-v1','dice'), counts = Array(36).fill(0);
    for (let i=0;i<36000;i++) counts[random.int(6)*6+random.int(6)]++;
    expect(counts.every(n=>n>800 && n<1200)).toBe(true);
    expect([0,7,14,21,28,35].every(i=>counts[i]>0)).toBe(true);
  });
  it('action draws cannot advance the dice stream', () => {
    const dice=createSeededRandom('s','dice'), actions=createSeededRandom('s','action:a');
    const control=createSeededRandom('s','dice');
    for(let i=0;i<100;i++){ for(let j=0;j<i;j++) actions.int(7); expect(dice.int(6)).toBe(control.int(6)); }
  });
});
