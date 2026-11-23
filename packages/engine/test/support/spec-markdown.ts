/**
 * Reads the tables of the specification documents (docs/architecture) for the
 * test that compares them with the preset data (CORE-03 acceptance: "the tables
 * of the documents and the data match"). Test support: it uses Node.js and has
 * the parsing logic that `*.test.ts` files may not have.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The specification documents the presets come from. */
export type SpecName = "presets" | "simulation-model" | "dialogue-acts";

/** A Markdown table: the header cells and the body rows, every cell trimmed. */
export interface Table {
  readonly header: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

/** The dash that means "nothing" in a table cell. */
export const DASH = "—";

/**
 * The repository root: the closest folder above `start` that holds ROADMAP.md.
 * Climbing from this file works in the repository and in the Stryker sandbox.
 */
export function repositoryRoot(start = dirname(fileURLToPath(import.meta.url))): string {
  let folder = start;
  while (!existsSync(join(folder, "ROADMAP.md"))) {
    const parent = dirname(folder);
    if (parent === folder) {
      throw new Error(`ROADMAP.md not found above ${start}`);
    }
    folder = parent;
  }
  return folder;
}

const documents = new Map<SpecName, string>();

/** The text of a specification document, with `\n` line ends. */
export function readSpec(name: SpecName): string {
  const cached = documents.get(name);
  if (cached !== undefined) {
    return cached;
  }
  const path = join(repositoryRoot(), "docs", "architecture", `${name}.md`);
  const text = readFileSync(path, "utf8").replaceAll("\r\n", "\n");
  documents.set(name, text);
  return text;
}

function headingLevel(line: string): number {
  const marks = /^(#+) /.exec(line);
  return marks?.[1]?.length ?? 0;
}

/**
 * The body of the section whose heading line starts with `heading` (for example
 * `"## 2. Lugares"`), up to the next heading of the same or a higher level.
 */
export function section(spec: SpecName, heading: string): string {
  const lines = readSpec(spec).split("\n");
  const start = lines.findIndex((line) => line.startsWith(heading));
  if (start < 0) {
    throw new Error(`${spec}: heading not found: ${heading}`);
  }
  const level = headingLevel(heading);
  const after = lines.slice(start + 1);
  const end = after.findIndex((line) => {
    const other = headingLevel(line);
    return other > 0 && other <= level;
  });
  return after.slice(0, end < 0 ? after.length : end).join("\n");
}

function cellsOf(line: string): string[] {
  return line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

/** The Markdown tables of `text`, in order (the separator row is dropped). */
export function tablesOf(text: string): Table[] {
  const blocks: string[][][] = [];
  let current: string[][] = [];
  for (const line of [...text.split("\n"), ""]) {
    if (line.startsWith("|")) {
      current.push(cellsOf(line));
    } else if (current.length > 0) {
      blocks.push(current);
      current = [];
    }
  }
  return blocks.map(([header = [], , ...rows]) => ({ header, rows }));
}

/** The `index`-th table of a section. */
export function tableOf(spec: SpecName, heading: string, index = 0): Table {
  const found = tablesOf(section(spec, heading))[index];
  if (found === undefined) {
    throw new Error(`${spec}: no table ${index} under ${heading}`);
  }
  return found;
}

/** The `index`-th cell of a row; a missing cell is an error in the document. */
export function cell(row: readonly string[], index: number): string {
  const value = row[index];
  if (value === undefined) {
    throw new Error(`row without cell ${index}: ${row.join(" | ")}`);
  }
  return value;
}

/** Every code span of `text`, without the backticks, in order. */
export function codes(text: string): string[] {
  return [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "");
}

/** The single code span of `text` (an id cell such as `` `home` ``). */
export function code(text: string): string {
  const [only, ...rest] = codes(text);
  if (only === undefined || rest.length > 0) {
    throw new Error(`expected one code span in: ${text}`);
  }
  return only;
}

/** `text` without code marks: `` fato (`TOLD`) `` becomes `fato (TOLD)`. */
export function plain(text: string): string {
  return text.replaceAll("`", "");
}

/** An integer written with an optional sign, the minus sign (−) included: `+1000`, `−3000`. */
export function integer(text: string): number {
  const value = Number(text.trim().replace("−", "-").replace("+", ""));
  if (!Number.isSafeInteger(value)) {
    throw new Error(`not an integer: ${text}`);
  }
  return value;
}

/** A comma-separated list: `casa, quarto` becomes `["casa", "quarto"]`; a dash is empty. */
export function list(text: string): string[] {
  return text === DASH ? [] : text.split(", ").map((item) => item.trim());
}

/** A `sim`/`não` cell. */
export function yesNo(text: string): boolean {
  if (text !== "sim" && text !== "não") {
    throw new Error(`expected sim or não: ${text}`);
  }
  return text === "sim";
}

/** Looks `key` up in a table of document words, failing on an unknown word. */
export function lookup<T>(words: Readonly<Record<string, T>>, key: string): T {
  const value = words[key];
  if (value === undefined) {
    throw new Error(`unknown word in the specification: ${key}`);
  }
  return value;
}

/**
 * The entries of a table that holds two entities per row (`| Id | Nome | Id |
 * Nome |`): the left column from top to bottom, then the right one.
 */
export function pairedRows(found: Table): string[][] {
  const left = found.rows.map((row) => row.slice(0, 2));
  const right = found.rows.map((row) => row.slice(2, 4));
  return [...left, ...right];
}
