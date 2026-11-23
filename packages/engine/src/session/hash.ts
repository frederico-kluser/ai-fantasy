/**
 * Hash of the engine state (simulation-model §15). Replays compare it after every
 * step; it is not cryptographic.
 */
import { fnv1a64 } from "../domain/fnv.ts";
import { canonicalize } from "./canonical.ts";

/**
 * FNV-1a 64 of the canonical serialization of `state`, in 16 lowercase
 * hexadecimal digits. Equal states give equal hashes, whatever their key order.
 *
 * @throws as {@link canonicalize} for values the state may not hold.
 * @example
 * hashState({ b: -1, a: [true, null, "x"] }); // "6b9a08c32f4ecf51"
 */
export function hashState(state: unknown): string {
  return fnv1a64(canonicalize(state));
}
