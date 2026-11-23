/**
 * Errors of the cast generator (presets §10.1): values, each with a code and
 * the path of the item, so the review sheet can point at the bad field.
 */

/**
 * Why a cast input was rejected:
 * - `INVALID_INPUT`: the input breaks its schema (an unknown archetype, a
 *   missing name, more than 8 characters, an impossible locked character…);
 * - `UNKNOWN_CHARACTER` / `SELF_BOND` / `DUPLICATE_BOND`: a bond names a
 *   character that does not exist, the same character twice, or a pair that
 *   already has a bond;
 * - `AUTHOR_OUTSIDE_PAIR`: an event done by someone outside its pair;
 * - `STRANGERS_WITH_EVENTS`: `strangers` pairs take no events (presets §10);
 * - `IMPOSSIBLE_DRAFT`: a locked bond whose secrets do not fit its events;
 * - `TOO_MANY_SPOUSES` / `TOO_MANY_PARTNERS`: more than one `SPOUSE` or
 *   `PARTNER` per character (presets §6);
 * - `PARENT_CYCLE`: someone would be their own ancestor;
 * - `FAMILY_CONFLICT`: a pair with two different kinships after the
 *   transitive family (parent, sibling, grandparent).
 */
export type CastErrorCode =
  | "INVALID_INPUT"
  | "UNKNOWN_CHARACTER"
  | "SELF_BOND"
  | "DUPLICATE_BOND"
  | "AUTHOR_OUTSIDE_PAIR"
  | "STRANGERS_WITH_EVENTS"
  | "IMPOSSIBLE_DRAFT"
  | "TOO_MANY_SPOUSES"
  | "TOO_MANY_PARTNERS"
  | "PARENT_CYCLE"
  | "FAMILY_CONFLICT";

/**
 * A problem of the cast input. `path` names the item, with dots: a field of the
 * input (`characters.1.archetype`, `bonds.2`) or a pair (`pair.<lower id>.<other id>`).
 */
export interface CastError {
  readonly code: CastErrorCode;
  readonly path: string;
  readonly message: string;
}

/** Builds a {@link CastError}. */
export function castError(code: CastErrorCode, path: string, message: string): CastError {
  return { code, path, message };
}
