/**
 * Integer arithmetic of the engine (simulation-model §2).
 *
 * Every function takes safe integers and returns a safe integer; anything else
 * is a programming error and throws a `RangeError` (development-rules §4). This
 * is the only engine file allowed to use `/` (eslint.config.js): everywhere
 * else, "/" in a formula means {@link div}.
 */

/** The bp value of 1.0 (100%): the divisor of {@link mulBp}, {@link approach} and {@link relax}. */
export const BP_SCALE = 10000;

function requireSafeInteger(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`expected a safe integer, got ${value}`);
  }
  return value;
}

/**
 * Integer division truncated toward zero: `div(-7, 2)` is `-3` (simulation-model §2).
 *
 * @throws RangeError if `b` is 0 or an argument is not a safe integer.
 */
export function div(a: number, b: number): number {
  requireSafeInteger(a);
  requireSafeInteger(b);
  if (b === 0) {
    throw new RangeError("div: division by zero");
  }
  // `+ 0` turns a negative zero (as in div(-1, 2)) into 0.
  return Math.trunc(a / b) + 0;
}

/**
 * Clamps `value` to `min..max`, both inclusive (simulation-model §2: every value
 * is clamped to its scale at the end of each rule). Never returns `-0`.
 *
 * @throws RangeError if an argument is not a safe integer or `min > max`.
 */
export function clampInt(value: number, min: number, max: number): number {
  requireSafeInteger(value);
  requireSafeInteger(min);
  requireSafeInteger(max);
  if (min > max) {
    throw new RangeError(`clampInt: empty range ${min}..${max}`);
  }
  return Math.min(Math.max(value, min), max) + 0;
}

/**
 * Product in bp: `div(a × b, 10000)`. A factor of ×1.5 is `mulBp(x, 15000)`
 * (simulation-model §2).
 *
 * @throws RangeError if the product is not a safe integer.
 */
export function mulBp(a: number, b: number): number {
  return div(a * b, BP_SCALE);
}

/**
 * Moves `value` toward `target` by `rate` bp of the distance:
 * `value + div((target − value) × rate, 10000)` (simulation-model §2).
 *
 * @throws RangeError if an argument or the result is not a safe integer.
 */
export function approach(value: number, target: number, rate: number): number {
  return requireSafeInteger(value + div((target - value) * rate, BP_SCALE));
}

/**
 * Brings `value` back toward `base`, keeping `rate` bp of the distance:
 * `base + div((value − base) × rate, 10000)` (simulation-model §2).
 *
 * @throws RangeError if an argument or the result is not a safe integer.
 */
export function relax(value: number, base: number, rate: number): number {
  return requireSafeInteger(base + div((value - base) * rate, BP_SCALE));
}
