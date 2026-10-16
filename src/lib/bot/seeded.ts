import { createHash } from 'node:crypto';

export const RNG_VERSION = 'sha256-counter-v1';
export type SeededRandom = { uint32(): number; int(bound: number): number };
const UINT32_RANGE = 4294967296;

export function boundedInteger(next: () => number, bound: number): number {
  if (!Number.isInteger(bound) || bound < 1 || bound > UINT32_RANGE) throw new Error('Invalid random bound.');
  const limit = Math.floor(UINT32_RANGE / bound) * bound;
  for (;;) {
    const value = next();
    if (!Number.isInteger(value) || value < 0 || value >= UINT32_RANGE) throw new Error('Invalid uint32 source.');
    if (value < limit) return value % bound;
  }
}

/** Node-only simulation RNG. Never imported by production gameplay. */
export function createSeededRandom(seed: string, stream: string): SeededRandom {
  if ([seed, stream].some(s => typeof s !== 'string' || !s.length || s.length > 256)) {
    throw new Error('Seed and stream must contain 1–256 characters.');
  }
  let counter = 0, offset = 32, block = Buffer.alloc(0);
  function uint32(): number {
    if (offset === 32) {
      if (!Number.isSafeInteger(counter)) throw new Error('Random stream exhausted.');
      block = createHash('sha256').update(JSON.stringify([RNG_VERSION, seed, stream, counter++])).digest();
      offset = 0;
    }
    const value = block.readUInt32LE(offset); offset += 4; return value;
  }
  return { uint32, int: bound => boundedInteger(uint32, bound) };
}
