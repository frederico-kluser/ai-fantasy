/**
 * Branded ids (development-rules §4). An id is a safe integer ≥ 0; the cast
 * generation (CORE-05) numbers characters 0..n−1 in creation order, and every
 * tie in the engine is broken by increasing id (simulation-model §16).
 */
import { err, ok, type Result } from "./result.ts";

/** Id of a character: a safe integer ≥ 0. Build it with {@link toCharacterId}. */
export type CharacterId = number & { readonly __brand: "CharacterId" };

/** Why a number is not a valid id. */
export type IdError = "INVALID_ID";

/**
 * Validates `value` as a {@link CharacterId}. Negative zero becomes 0.
 *
 * @returns the id, or `INVALID_ID` if `value` is not a safe integer ≥ 0.
 */
export function toCharacterId(value: number): Result<CharacterId, IdError> {
  if (!Number.isSafeInteger(value) || value < 0) {
    return err("INVALID_ID");
  }
  // The brand is earned here: the value was just checked; `+ 0` turns -0 into 0.
  return ok((value + 0) as CharacterId);
}

/**
 * Orders ids by increasing number, for `Array.prototype.sort`: always sort by
 * id instead of relying on insertion or iteration order (development-rules §5).
 *
 * @example
 * const ordered = [...present].sort(compareIds);
 */
export function compareIds<T extends number>(a: T, b: T): number {
  return a - b;
}
