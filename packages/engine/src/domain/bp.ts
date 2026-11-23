/**
 * Basis-point scales of the engine (simulation-model §2). Values are branded
 * integers built by clamping, because every value is clamped to its scale at
 * the end of each rule.
 */
import { BP_SCALE, clampInt } from "./math.ts";

/** A unipolar value: an integer in `0..10000` (0 = nothing or fine; 10000 = maximum). */
export type Bp = number & { readonly __brand: "Bp" };

/** A bipolar value: an integer in `-10000..10000`. */
export type BipolarBp = number & { readonly __brand: "BipolarBp" };

/** Top of both bp scales (simulation-model §2); the unipolar scale starts at 0. */
export const BP_MAX = BP_SCALE;

/** Bottom of the bipolar scale (simulation-model §2). */
export const BIPOLAR_MIN = -BP_MAX;

/**
 * Clamps `value` to the unipolar scale `0..10000`.
 *
 * @throws RangeError if `value` is not a safe integer.
 */
export function toBp(value: number): Bp {
  // The brand is earned here: clampInt has just put the value in 0..BP_MAX.
  return clampInt(value, 0, BP_MAX) as Bp;
}

/**
 * Clamps `value` to the bipolar scale `-10000..10000`.
 *
 * @throws RangeError if `value` is not a safe integer.
 */
export function toBipolarBp(value: number): BipolarBp {
  // The brand is earned here: clampInt has just put the value in BIPOLAR_MIN..BP_MAX.
  return clampInt(value, BIPOLAR_MIN, BP_MAX) as BipolarBp;
}
