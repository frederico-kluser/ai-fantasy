/**
 * The grid template of a place preset and its validation (simulation-model
 * §3.1, presets §2). A spec is checked whole: the result is a grid or the first
 * error, never a grid in part.
 */
import { GRID_MAX } from "../domain/constants.ts";
import { itemAt } from "../domain/lookup.ts";
import { div } from "../domain/math.ts";
import { err, ok, type Result } from "../domain/result.ts";
import {
  CELL_RULES,
  CELL_TYPES,
  isInside,
  isPassable,
  type CellPos,
  type CellType,
  type Grid,
} from "./grid.ts";

/** Starts a template suggests at least, one per character of a full scene (simulation-model §3.1). */
export const MIN_GRID_STARTS = 8;

/** A grid template, as a place preset brings it (simulation-model §3.1, presets §2). */
export interface GridSpec {
  /** `H` rows of `W` symbols of the cell table, with `1 ≤ W, H ≤ 48`. */
  readonly rows: readonly string[];
  /** The exits: at least one, distinct, passable, on the border. */
  readonly exits: readonly CellPos[];
  /** `ALL` roofed, `NONE` roofed, or a mask of `H` rows of `W` characters (`r` roofed, `.` not). */
  readonly roofed: "ALL" | "NONE" | readonly string[];
  /** Suggested starting cells: at least 8, distinct, passable. */
  readonly starts: readonly CellPos[];
}

/**
 * Why a grid spec is invalid. `row` is the first bad row (of `rows` or of the
 * mask, where a missing or extra mask row counts); `exit` and `start` are the
 * position of the first bad item in their list.
 */
export type GridError =
  | { readonly code: "INVALID_SIZE" | "NO_EXIT" | "TOO_FEW_STARTS" }
  | { readonly code: "RAGGED_ROWS" | "UNKNOWN_CELL" | "INVALID_ROOFED"; readonly row: number }
  | { readonly code: "INVALID_EXIT"; readonly exit: number }
  | { readonly code: "INVALID_START"; readonly start: number };

/** The cell types and their symbols, from the rows of a valid spec. */
interface Shape {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly CellType[];
}

const NOT_FOUND = -1;

/** The symbol of each cell type, in the order of {@link CELL_TYPES}. */
const SYMBOLS: readonly string[] = CELL_TYPES.map((type) => CELL_RULES[type].symbol);

const MASK_ROW = /^[r.]*$/;
const MASK_ROOFED = "r";

function isSideInRange(cells: number): boolean {
  return cells >= 1 && cells <= GRID_MAX;
}

function rowsError(rows: readonly string[]): GridError | undefined {
  const width = rows[0]?.length ?? 0;
  if (!isSideInRange(rows.length) || !isSideInRange(width)) {
    return { code: "INVALID_SIZE" };
  }
  const ragged = rows.findIndex((row) => row.length !== width);
  if (ragged !== NOT_FOUND) {
    return { code: "RAGGED_ROWS", row: ragged };
  }
  const unknown = rows.findIndex((row) =>
    Array.from(row).some((symbol) => !SYMBOLS.includes(symbol)),
  );
  return unknown === NOT_FOUND ? undefined : { code: "UNKNOWN_CELL", row: unknown };
}

function shapeOf(rows: readonly string[]): Shape {
  return {
    width: itemAt(rows, 0).length,
    height: rows.length,
    cells: rows.flatMap((row) =>
      Array.from(row, (symbol) => itemAt(CELL_TYPES, SYMBOLS.indexOf(symbol))),
    ),
  };
}

function indexOf(shape: Shape, pos: CellPos): number {
  return pos.y * shape.width + pos.x;
}

function isPassableAt(shape: Shape, pos: CellPos): boolean {
  return isInside(shape, pos.x, pos.y) && isPassable(itemAt(shape.cells, indexOf(shape, pos)));
}

function isOnBorder(shape: Shape, pos: CellPos): boolean {
  return pos.x === 0 || pos.y === 0 || pos.x === shape.width - 1 || pos.y === shape.height - 1;
}

/** Whether the item at `item` repeats an earlier position of `list`. */
function isRepeat(list: readonly CellPos[], item: number): boolean {
  const pos = itemAt(list, item);
  return list.findIndex((other) => other.x === pos.x && other.y === pos.y) !== item;
}

function exitsError(shape: Shape, exits: readonly CellPos[]): GridError | undefined {
  if (exits.length === 0) {
    return { code: "NO_EXIT" };
  }
  const bad = exits.findIndex(
    (pos, item) => !isPassableAt(shape, pos) || !isOnBorder(shape, pos) || isRepeat(exits, item),
  );
  return bad === NOT_FOUND ? undefined : { code: "INVALID_EXIT", exit: bad };
}

/** The first bad row of a roof mask: missing, extra, of the wrong width or with another symbol. */
function maskRowError(mask: readonly string[], shape: Shape): number {
  const rows = Math.max(mask.length, shape.height);
  for (let y = 0; y < rows; y += 1) {
    const row = mask[y];
    if (
      y >= shape.height ||
      row === undefined ||
      row.length !== shape.width ||
      !MASK_ROW.test(row)
    ) {
      return y;
    }
  }
  return NOT_FOUND;
}

function roofedError(shape: Shape, roofed: GridSpec["roofed"]): GridError | undefined {
  if (typeof roofed === "string") {
    return undefined;
  }
  const row = maskRowError(roofed, shape);
  return row === NOT_FOUND ? undefined : { code: "INVALID_ROOFED", row };
}

function startsError(shape: Shape, starts: readonly CellPos[]): GridError | undefined {
  const bad = starts.findIndex((pos, item) => !isPassableAt(shape, pos) || isRepeat(starts, item));
  if (bad !== NOT_FOUND) {
    return { code: "INVALID_START", start: bad };
  }
  return starts.length < MIN_GRID_STARTS ? { code: "TOO_FEW_STARTS" } : undefined;
}

function roofedMarks(shape: Shape, roofed: GridSpec["roofed"]): boolean[] {
  if (typeof roofed === "string") {
    return shape.cells.map(() => roofed === "ALL");
  }
  return shape.cells.map(
    (_, index) =>
      itemAt(roofed, div(index, shape.width)).charAt(index % shape.width) === MASK_ROOFED,
  );
}

function gridOf(shape: Shape, spec: GridSpec): Grid {
  const exits = new Set(spec.exits.map((pos) => indexOf(shape, pos)));
  return {
    width: shape.width,
    height: shape.height,
    cells: shape.cells,
    exits: shape.cells.map((_, index) => exits.has(index)),
    roofed: roofedMarks(shape, spec.roofed),
  };
}

/**
 * Validates a grid template and builds its grid (simulation-model §3.1). The
 * checks follow the order of the fields: rows (size, width, symbols), exits,
 * roof mask, starts; the first failure is the error.
 *
 * @example
 * const grid = parseGridSpec(place.grid);
 * if (!grid.ok) return grid; // for example { code: "INVALID_EXIT", exit: 0 }
 */
export function parseGridSpec(spec: GridSpec): Result<Grid, GridError> {
  const rowsProblem = rowsError(spec.rows);
  if (rowsProblem !== undefined) {
    return err(rowsProblem);
  }
  const shape = shapeOf(spec.rows);
  const problem =
    exitsError(shape, spec.exits) ??
    roofedError(shape, spec.roofed) ??
    startsError(shape, spec.starts);
  return problem === undefined ? ok(gridOf(shape, spec)) : err(problem);
}
