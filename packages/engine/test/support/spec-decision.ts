/**
 * The decision tables of dialogue-acts.md §9.2 and §9.3 read from the
 * document, for the tests that compare them with the data of
 * `src/decision/`. Test support: it holds the parsing logic tests may not have.
 */
import { cell, code, codes, integer, section, tablesOf, type Table } from "./spec-markdown.ts";

const SATISFACTION = "### 9.2 Satisfação das vontades";
const BIASES = "### 9.3 Vieses";

/** The cells of the satisfaction table that name a drive in words. */
const WORDED_DRIVES: Readonly<Record<string, string>> = {
  "a vontade de quem recebe o objeto": "RECEIVER",
  "a vontade de quem dá o objeto": "GIVER",
  "a vontade que o pedido atende no alvo": "ANSWERED",
};

function drivesOf(text: string): string[] {
  const worded = Object.keys(WORDED_DRIVES).find((words) => text.startsWith(words));
  return worded === undefined ? codes(text) : [WORDED_DRIVES[worded] ?? ""];
}

/** §9.2: each act row as `drive:level` entries, in the order of the columns 3, 2, 1. */
export function specSatisfactionRows(): Map<string, string[]> {
  const [table] = tablesOf(section("dialogue-acts", SATISFACTION));
  if (table === undefined) {
    throw new Error("dialogue-acts §9.2: no table");
  }
  return new Map(
    table.rows.map((row) => {
      const act = codes(cell(row, 0))[0] ?? "";
      const levels = [3, 2, 1].flatMap((level, index) =>
        drivesOf(cell(row, index + 1)).map((drive) => `${drive}:${level}`),
      );
      return [act, levels] as const;
    }),
  );
}

/** One weighted entry of a bias cell: `` `CHAT` +1500 `` gives `["CHAT", 1500]`. */
function weightsOf(text: string): [string, number][] {
  return [...text.matchAll(/`([A-Z_]+)` ([+−-]\d+)/g)].map((match) => [
    match[1] ?? "",
    integer(match[2] ?? ""),
  ]);
}

/** A bias table of §9.3 as `{ source: { acts, tones } }`, with the sources as written. */
export interface SpecBiasTable {
  readonly [source: string]: {
    readonly acts: Readonly<Record<string, number>>;
    readonly tones: Readonly<Record<string, number>>;
  };
}

function biasTable(table: Table): SpecBiasTable {
  return Object.fromEntries(
    table.rows.map((row) => [
      code(cell(row, 0)),
      {
        acts: Object.fromEntries(weightsOf(cell(row, 1))),
        tones: Object.fromEntries(weightsOf(cell(row, 2))),
      },
    ]),
  );
}

/** §9.3: the four tables (emotions, traits, bond, perception), in order. */
export function specBiasTables(): SpecBiasTable[] {
  return tablesOf(section("dialogue-acts", BIASES)).map(biasTable);
}

/** §9.3: the weight of the lie variant written in the `honesty` row. */
export function specLieWeight(): number {
  const match = /`honesty` \| variante mentirosa: ([+−-]\d+)/.exec(
    section("dialogue-acts", BIASES),
  );
  return integer(match?.[1] ?? "");
}
