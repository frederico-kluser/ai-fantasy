/**
 * Test support for the space module: grids built straight from rows of symbols
 * (simulation-model §3.1) and branded ids. It is an independent oracle: it does
 * not go through `parseGridSpec`, so tests can use any size and any marks.
 */
import type { CharacterId } from "../../src/domain/ids.ts";
import type { CellType, Grid } from "../../src/space/grid.ts";

const TYPE_OF_SYMBOL: ReadonlyMap<string, CellType> = new Map([
  [".", "FLOOR"],
  [",", "ROUGH"],
  ["d", "DOOR_OPEN"],
  ["D", "DOOR_CLOSED"],
  ["=", "WINDOW"],
  ["o", "LOW_OBSTACLE"],
  ["#", "WALL"],
]);

function typeOf(symbol: string): CellType {
  const type = TYPE_OF_SYMBOL.get(symbol);
  if (type === undefined) {
    throw new Error(`test grid: unknown symbol ${JSON.stringify(symbol)}`);
  }
  return type;
}

/** Marks of a test grid, as lists of cell indices. */
export interface TestMarks {
  readonly exits?: readonly number[];
  readonly roofed?: readonly number[];
}

/** A grid from rows of symbols; every row must have the same width. */
export function gridOf(rows: readonly string[], marks: TestMarks = {}): Grid {
  const width = rows[0]?.length ?? 0;
  if (rows.some((row) => row.length !== width)) {
    throw new Error("test grid: rows of different widths");
  }
  const cells = rows.flatMap((row) => Array.from(row, typeOf));
  const exits = new Set(marks.exits ?? []);
  const roofed = new Set(marks.roofed ?? []);
  return {
    width,
    height: rows.length,
    cells,
    exits: cells.map((_, index) => exits.has(index)),
    roofed: cells.map((_, index) => roofed.has(index)),
  };
}

/** The index of the cell at column `x` and row `y`. */
export function cellAt(grid: Grid, x: number, y: number): number {
  return y * grid.width + x;
}

/** A character id; test ids are known to be valid, so the brand is given directly. */
export function idOf(value: number): CharacterId {
  return value as CharacterId;
}
