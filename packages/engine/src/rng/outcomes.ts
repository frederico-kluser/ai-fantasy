/**
 * How each kind of draw turns its natural value into an outcome, and which
 * outcomes the MOST_LIKELY mode and forcing may give (simulation-model §15).
 */
import { BP_MAX } from "../domain/bp.ts";
import { div } from "../domain/math.ts";
import { MAX_DRAW_BOUND } from "./uniform.ts";

/** MOST_LIKELY: a chance succeeds if and only if `p ≥ 5000` (simulation-model §15). */
const MOST_LIKELY_MIN_CHANCE = 5000;

/**
 * The outcome rules of one kind of draw. `A` is what the draw is about: the bound
 * of a raw draw, the chance `p` of a chance draw or the weights of a weighted one.
 */
export interface DrawOutcomes<A> {
  /** The outcome of the natural value `value`, drawn in `[0, bound)`. */
  readonly natural: (value: number, about: A) => number;
  /** The outcome in MOST_LIKELY mode. */
  readonly mostLikely: (about: A) => number;
  /** Whether the natural draw could give `outcome`: forcing only picks possible outcomes. */
  readonly isPossible: (outcome: number, about: A) => boolean;
}

/**
 * The index picked by `u` in `[0, total)`: the first option whose cumulative
 * weight exceeds `u`. Options of weight 0 are never picked.
 */
export function pickWeighted(weights: readonly number[], u: number): number {
  let remaining = u;
  let index = 0;
  for (const weight of weights) {
    remaining -= weight;
    if (remaining < 0) {
      break;
    }
    index += 1;
  }
  return index;
}

/**
 * The index of the heaviest option, the lowest one on ties. A loop, not
 * `Math.max(...weights)`, so any number of options fits on the stack. The weights
 * are already checked (integers ≥ 0, total > 0), so the heaviest weighs more than 0.
 */
export function heaviestIndex(weights: readonly number[]): number {
  let heaviest = 0;
  let heaviestWeight = 0;
  let index = 0;
  for (const weight of weights) {
    if (weight > heaviestWeight) {
      heaviest = index;
      heaviestWeight = weight;
    }
    index += 1;
  }
  return heaviest;
}

/** Raw draws: the outcome is the value in `[0, bound)`; MOST_LIKELY gives `div(bound − 1, 2)`. */
export const rawOutcomes: DrawOutcomes<number> = {
  natural: (value) => value,
  mostLikely: (bound) => div(bound - 1, 2),
  isPossible: (outcome, bound) => Number.isSafeInteger(outcome) && outcome >= 0 && outcome < bound,
};

/**
 * Chance draws: `u` in `[0, 10000)` succeeds (1) if `u < p`, else fails (0).
 * Success is possible only with `p > 0`, failure only with `p < 10000`.
 */
export const chanceOutcomes: DrawOutcomes<number> = {
  natural: (value, p) => Number(value < p),
  mostLikely: (p) => Number(p >= MOST_LIKELY_MIN_CHANCE),
  isPossible: (outcome, p) => (outcome === 1 && p > 0) || (outcome === 0 && p < BP_MAX),
};

/**
 * Weighted draws: the outcome is an option index; MOST_LIKELY gives the heaviest
 * option, the lowest index on ties. Only options with weight > 0 are possible.
 */
export const weightedOutcomes: DrawOutcomes<readonly number[]> = {
  natural: (value, weights) => pickWeighted(weights, value),
  mostLikely: (weights) => heaviestIndex(weights),
  isPossible: (outcome, weights) => (weights[outcome] ?? 0) > 0,
};

/**
 * Checks a chance in bp.
 *
 * @throws RangeError if `p` is not an integer in `0..10000`.
 */
export function requireChance(p: number): number {
  if (!Number.isSafeInteger(p) || p < 0 || p > BP_MAX) {
    throw new RangeError(`a chance must be an integer in 0..10000 bp, got ${p}`);
  }
  return p;
}

/**
 * The total of the weights of a weighted draw: its bound.
 *
 * @throws RangeError if a weight is not an integer ≥ 0 or the total is not in `1..2^31`.
 */
export function totalWeight(weights: readonly number[]): number {
  let total = 0;
  for (const weight of weights) {
    if (!Number.isSafeInteger(weight) || weight < 0) {
      throw new RangeError(`weights must be integers ≥ 0, got ${weight}`);
    }
    total += weight;
  }
  if (total < 1 || total > MAX_DRAW_BOUND) {
    throw new RangeError(`the total weight must be in 1..2147483648, got ${total}`);
  }
  return total;
}
