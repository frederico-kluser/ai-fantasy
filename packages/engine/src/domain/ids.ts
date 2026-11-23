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
  return toId<CharacterId>(value);
}

/**
 * Id of a fact of the record (simulation-model §12): a safe integer ≥ 0, given
 * in sequence (0, 1, 2…) as facts are created, so a higher id is a more recent
 * fact. Build it with {@link toFactId}.
 */
export type FactId = number & { readonly __brand: "FactId" };

/**
 * Id of a thing (an object, a possession or an attachment; dialogue-acts §4,
 * simulation-model §5.7): a safe integer ≥ 0. Its name is presentation and stays
 * out of the hash. Build it with {@link toThingId}.
 */
export type ThingId = number & { readonly __brand: "ThingId" };

/**
 * Validates `value` as a {@link FactId}. Negative zero becomes 0.
 *
 * @returns the id, or `INVALID_ID` if `value` is not a safe integer ≥ 0.
 */
export function toFactId(value: number): Result<FactId, IdError> {
  return toId<FactId>(value);
}

/**
 * Validates `value` as a {@link ThingId}. Negative zero becomes 0.
 *
 * @returns the id, or `INVALID_ID` if `value` is not a safe integer ≥ 0.
 */
export function toThingId(value: number): Result<ThingId, IdError> {
  return toId<ThingId>(value);
}

/** Every id of the engine is a safe integer ≥ 0; `+ 0` turns -0 into 0. */
function toId<T extends number>(value: number): Result<T, IdError> {
  if (!Number.isSafeInteger(value) || value < 0) {
    return err("INVALID_ID");
  }
  // The brand is earned here: the value was just checked.
  return ok((value + 0) as T);
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
