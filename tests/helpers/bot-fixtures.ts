import { emptyPosition } from '../../src/lib/engine';
import type { Pair, Player } from '../../src/lib/engine';
import type { TurnInput } from '../../src/lib/bot/types';

/** Literal stacks are zero-based: point, Light count, Dark count, optional top. */
export function turnFixture(stacks: [number, number, number, Player?][], off: Pair,
  remaining: number[], active: Player = 0): TurnInput {
  const position = emptyPosition();
  position.off = [...off];
  for (const [point, light, dark, top] of stacks) {
    position.points[point] = { count: [light, dark], top: top ?? (light ? 0 : 1) };
  }
  return { position, active, remaining: [...remaining] };
}

/** Factories ensure reviews/tests never share mutable positions. */
export const botFixtures = {
  opening: () => turnFixture([[23, 15, 0], [0, 0, 15]], [0, 0], [2, 4]),
  blocked: () => turnFixture([[8, 15, 0], [7, 0, 2], [6, 0, 2]], [0, 11], [1, 2]),
  forcedOrder: () => turnFixture([[5, 1, 0], [3, 0, 2], [0, 0, 2]], [14, 11], [1, 2]),
  higherDie: () => turnFixture([[5, 1, 0], [2, 0, 2]], [14, 13], [1, 2]),
  motherCapture: () => turnFixture([[1, 1, 0], [23, 14, 0], [0, 0, 1], [12, 0, 14]], [0, 0], [1, 6]),
  pinRetention: () => turnFixture([[2, 3, 1, 0], [4, 12, 0], [12, 0, 14]], [0, 0], [1, 2]),
  forcedRelease: () => turnFixture([[2, 1, 1, 0], [12, 0, 14]], [14, 0], [1]),
  unsupportedMother: () => turnFixture([[23, 2, 0], [18, 13, 0], [20, 0, 1], [0, 0, 14]], [0, 0], [1, 2]),
  bearOff: () => turnFixture([[0, 2, 0], [12, 0, 14]], [13, 1], [1, 6]),
  doubles: () => turnFixture([[8, 2, 0], [12, 0, 15]], [13, 0], [2, 2, 2, 2]),
};

export function mirrored(input: TurnInput): TurnInput {
  return {
    active: input.active === 0 ? 1 : 0, remaining: [...input.remaining],
    position: {
      off: [input.position.off[1], input.position.off[0]],
      points: [...input.position.points].reverse().map(point => ({
        count: [point.count[1], point.count[0]],
        top: point.top === null ? null : point.top === 0 ? 1 : 0,
      })),
    },
  };
}
