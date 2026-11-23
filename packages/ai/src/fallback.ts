/**
 * Fallback lines (ai-integration §5.3 step 5): when the text model fails,
 * refuses or times out, the act is still voiced by a ready line for its act and
 * tone. The choice is deterministic: the caller passes an index (for example a
 * value drawn by the engine or the turn number), never `Math.random`.
 */
import type { ActId, ToneId } from "@ai-fantasy/engine";

import type { RenderedLine } from "./line.ts";
import { FALLBACK_LINES } from "./prompts/fallback-data.ts";

/** The vocative placeholder of the templates: replaced by the name, or removed. */
export const TARGET_PLACEHOLDER = ", {alvo}";

/**
 * The fallback line for `act` and `tone`.
 *
 * @param index any safe integer; it picks a template by `index mod count`.
 * @param targetName the name for the vocative; without it the vocative goes away.
 * @throws RangeError if `index` is not a safe integer.
 */
export function fallbackLine(
  act: ActId,
  tone: ToneId,
  index: number,
  targetName?: string,
): RenderedLine {
  if (!Number.isSafeInteger(index)) {
    throw new RangeError(`the fallback index must be a safe integer, got ${index}`);
  }
  const templates = FALLBACK_LINES[act][tone];
  const count = templates.length;
  const [fala, gesto] = templates[((index % count) + count) % count] ?? ["", ""];
  const vocative = targetName === undefined ? "" : `, ${targetName}`;
  return { fala: fala.replaceAll(TARGET_PLACEHOLDER, vocative), gesto };
}
