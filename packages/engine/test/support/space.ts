/**
 * Test support for the space module: grids built straight from rows of symbols
 * (simulation-model §3.1) and branded ids. It is an independent oracle: it does
 * not go through `parseGridSpec`, so tests can use any size and any marks.
 */
import fc from "fast-check";

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

/** Symbols for random grids: mostly floor, with every other type present. */
const RANDOM_SYMBOLS = [".", ".", ".", ".", ".", ",", "d", "D", "=", "o", "#"];

/** `height` random rows of `width` symbols. */
export function arbitraryRows(width: number, height: number): fc.Arbitrary<string[]> {
  const row = fc
    .array(fc.constantFrom(...RANDOM_SYMBOLS), { minLength: width, maxLength: width })
    .map((symbols) => symbols.join(""));
  return fc.array(row, { minLength: height, maxLength: height });
}

/** A random grid with sides in `1..maxSide`. */
export function arbitraryGrid(maxSide: number): fc.Arbitrary<Grid> {
  return fc
    .record({
      width: fc.integer({ min: 1, max: maxSide }),
      height: fc.integer({ min: 1, max: maxSide }),
    })
    .chain(({ width, height }) => arbitraryRows(width, height))
    .map((rows) => gridOf(rows));
}

/** A random grid and two of its cells, of any type. */
export interface TwoCells {
  readonly grid: Grid;
  readonly from: number;
  readonly to: number;
}

/** A random grid with sides in `1..maxSide` and two of its cells. */
export function arbitraryTwoCells(maxSide: number): fc.Arbitrary<TwoCells> {
  return arbitraryGrid(maxSide).chain((grid) => {
    const cell = fc.integer({ min: 0, max: grid.cells.length - 1 });
    return fc.record({ grid: fc.constant(grid), from: cell, to: cell });
  });
}

/**
 * A random grid split by a full column of walls, a cell on its left and a cell
 * on its right: no straight line between the two avoids the wall.
 */
export function arbitraryWallBetween(): fc.Arbitrary<TwoCells> {
  return fc
    .record({ width: fc.integer({ min: 3, max: 16 }), height: fc.integer({ min: 1, max: 16 }) })
    .chain(({ width, height }) =>
      fc.integer({ min: 1, max: width - 2 }).chain((wall) =>
        fc.record({
          rows: arbitraryRows(width, height).map((rows) =>
            rows.map((row) => `${row.slice(0, wall)}#${row.slice(wall + 1)}`),
          ),
          from: fc.record({
            x: fc.integer({ min: 0, max: wall - 1 }),
            y: fc.integer({ min: 0, max: height - 1 }),
          }),
          to: fc.record({
            x: fc.integer({ min: wall + 1, max: width - 1 }),
            y: fc.integer({ min: 0, max: height - 1 }),
          }),
        }),
      ),
    )
    .map(({ rows, from, to }) => {
      const grid = gridOf(rows);
      return { grid, from: cellAt(grid, from.x, from.y), to: cellAt(grid, to.x, to.y) };
    });
}
