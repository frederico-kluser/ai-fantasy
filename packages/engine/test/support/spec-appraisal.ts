/**
 * The appraisal table of dialogue-acts.md (§7.1) read from the document: each
 * row's valence and the effects of its three effect columns as `[id, k]`
 * pairs. Test support for `src/acts/appraisal-spec.test.ts`.
 */
import { cell, tableOf } from "./spec-markdown.ts";

/** The effects of one row of §7.1, by column, each sorted. */
export interface SpecRow {
  readonly label: string;
  readonly valence: number;
  readonly emotions: readonly (readonly [string, number])[];
  readonly bonds: readonly (readonly [string, number])[];
  readonly drives: readonly (readonly [string, number])[];
}

/** "−2" or "+1" as a number (the document uses the minus sign U+2212). */
function signed(text: string): number {
  return Number(text.replace("−", "-").replace("+", ""));
}

/** Every "`id` (…) ±k" of a cell, as `[id, k]`, sorted. */
export function effectsOf(text: string): [string, number][] {
  const found = [...text.matchAll(/`(\w+)`(?: \([^)]*\))? ([+−]\d)/g)];
  return found.map((match): [string, number] => [match[1] ?? "", signed(match[2] ?? "0")]).sort();
}

/** The first signed number of the valence cell, or 0. */
function valenceOf(text: string): number {
  const match = /[+−]\d/.exec(text);
  return match === null ? 0 : signed(match[0]);
}

/** The rows of the table of §7.1, in order. */
export function specAppraisalRows(): SpecRow[] {
  return tableOf("dialogue-acts", "### 7.1 Unidade e tabela").rows.map((row) => ({
    label: cell(row, 0),
    valence: valenceOf(cell(row, 1)),
    emotions: effectsOf(cell(row, 2)),
    bonds: effectsOf(cell(row, 3)),
    drives: effectsOf(cell(row, 4)),
  }));
}
