/**
 * Unbiased integers below a bound, by rejection (simulation-model §15).
 */
import { nextU32, type Sfc32 } from "./sfc32.ts";

/** 2^32: the number of distinct u32 outputs. */
const U32_RANGE = 4294967296;

/** Largest bound of a draw: 2^31. */
export const MAX_DRAW_BOUND = 2147483648;

/**
 * A uniform integer in `[0, bound)`: draws u32 values `x` until
 * `x < 2^32 − (2^32 mod bound)` and returns `x mod bound`, so every value has the
 * same number of u32 values behind it.
 *
 * @throws RangeError if `bound` is not an integer in `1..2^31`; nothing is drawn then.
 */
export function uniformBelow(state: Sfc32, bound: number): number {
  if (!Number.isSafeInteger(bound) || bound < 1 || bound > MAX_DRAW_BOUND) {
    throw new RangeError(`a draw bound must be an integer in 1..2147483648, got ${bound}`);
  }
  const limit = U32_RANGE - (U32_RANGE % bound);
  let value = nextU32(state);
  while (value >= limit) {
    value = nextU32(state);
  }
  return value % bound;
}
