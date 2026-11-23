/**
 * Building blocks of the SOM questions: options from a catalog and the
 * `score` ruler of intensity (ai-integration §4.1: concrete situations from 2
 * to 10).
 */

/** The options of a `choice` question: label → rubric (`null` when the label says it all). */
export type Options = Readonly<Record<string, string | null>>;

/** A catalog entry with an id and a display name. */
export interface Named {
  readonly id: string;
  readonly name: string;
}

/** Options from `[label, rubric]` pairs, in order. */
export function optionsFrom(entries: readonly (readonly [string, string | null])[]): Options {
  return Object.fromEntries(entries);
}

/** Options whose labels say it all (rubric `null`), in order. */
export function bare(labels: readonly string[]): Options {
  return optionsFrom(labels.map((label) => [label, null]));
}

/** The options of a catalog, in catalog order, with the display name as rubric. */
export function catalogOptions(entries: readonly Named[]): Options {
  return optionsFrom(entries.map(({ id, name }) => [id, name]));
}

/** The intensity ruler, from level 2 (lowest) to level 10 (highest). */
const INTENSITY_LEVELS = [
  "2: barely there; a passing remark said lightly",
  "3: mild; polite and low-key",
  "4: noticeable but calm",
  "5: moderate; clear intent with ordinary emphasis",
  "6: firm; emphatic, some emotion shows",
  "7: strong; heated or very warm, hard to ignore",
  "8: very strong; insistent, feelings run high",
  "9: intense; close to the limit, shaking with emotion",
  "10: extreme; the strongest this person could say it",
] as const;

/** The 9 levels of the intensity ruler, lowest first. */
export function intensityCriteria(): string[] {
  return [...INTENSITY_LEVELS];
}
