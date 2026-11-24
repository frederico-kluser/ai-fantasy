/**
 * The end of the slice (simulation-model §11 item 6): when one person or
 * nobody is left (those leaving count until they reach the exit), or after
 * 60 ticks of silence in a row (`SILENCE_END_TICKS`, "a conversa morreu").
 */
import { SILENCE_END_TICKS } from "../domain/constants.ts";

/** Why a slice ends. */
export type SliceEnd = "ALONE" | "SILENCE";

/**
 * Whether the slice ends now, and why (simulation-model §11 item 6): `ALONE`
 * with `present` ≤ 1, `SILENCE` after 60 silent ticks; `null` while it goes on.
 *
 * @param present how many characters are still in the scene.
 */
export function checkSliceEnd(present: number, silentTicks: number): SliceEnd | null {
  if (present <= 1) {
    return "ALONE";
  }
  return silentTicks >= SILENCE_END_TICKS ? "SILENCE" : null;
}
