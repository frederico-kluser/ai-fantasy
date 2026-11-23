/**
 * Conversion of the SOM answers to the engine scale (ai-integration §4.2): the
 * engine only takes integers, so every probability and score becomes bp here,
 * rounded and clamped. Inputs are clamped before multiplying, so no value can
 * leave the safe-integer range.
 */
import { BP_MAX, toBp, type Bp } from "@ai-fantasy/engine";

/** Lowest level of the project's `score` ruler (ai-integration §4.1). */
export const SCORE_MIN = 2;

/** Highest level of the project's `score` ruler (ai-integration §4.1). */
export const SCORE_MAX = 10;

/** bp per level of the `score` ruler: `10000 / (10 − 2)`. */
const BP_PER_SCORE_LEVEL = 1250;

/** A `noul` reads as "yes" from this probability on, in bp (ai-integration §4.2). */
export const NOUL_YES_BP = 5000;

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/**
 * Probability `0..1` to bp: `clamp(Math.round(p × 10000), 0, 10000)`.
 *
 * @example probabilityToBp(0.73) // 7300
 */
export function probabilityToBp(probability: number): Bp {
  return toBp(Math.round(clamp(probability, 0, 1) * BP_MAX));
}

/**
 * Score on the `2..10` ruler to an intensity in bp:
 * `clamp(Math.round((score − 2) × 1250), 0, 10000)`.
 *
 * @example scoreToIntensity(7.3) // 6625
 */
export function scoreToIntensity(score: number): Bp {
  const level = clamp(score, SCORE_MIN, SCORE_MAX) - SCORE_MIN;
  return toBp(Math.round(level * BP_PER_SCORE_LEVEL));
}

/** A `noul` answer reads as `true` when its probability is at least {@link NOUL_YES_BP}. */
export function noulIsYes(noul: number): boolean {
  return probabilityToBp(noul) >= NOUL_YES_BP;
}
