/**
 * The grid of a place (simulation-model §3.1): the seven cell types and their
 * rules, the `exit` and `roofed` marks, cell indices and distance. A cell is
 * named by its index `y × W + x`, and every spatial tie goes to the lowest index.
 */
import { div } from "../domain/math.ts";

/** The seven cell types of simulation-model §3.1. */
export const CELL_TYPES = [
  "FLOOR",
  "ROUGH",
  "DOOR_OPEN",
  "DOOR_CLOSED",
  "WINDOW",
  "LOW_OBSTACLE",
  "WALL",
] as const;

/** A cell type. */
export type CellType = (typeof CELL_TYPES)[number];

/** The rules of a cell type (simulation-model §3.1). */
export interface CellRule {
  /** Its symbol in the rows of a grid spec. */
  readonly symbol: string;
  /** Ticks to enter the cell (the "Atravessar" column); 0 when it cannot be crossed. */
  readonly enterTicks: number;
  /** Whether it blocks sight (and whispers). */
  readonly blocksSight: boolean;
}

/** The cell table of simulation-model §3.1; hearing reads its own table (§8.2). */
export const CELL_RULES: Readonly<Record<CellType, CellRule>> = {
  FLOOR: { symbol: ".", enterTicks: 1, blocksSight: false },
  ROUGH: { symbol: ",", enterTicks: 2, blocksSight: false },
  DOOR_OPEN: { symbol: "d", enterTicks: 1, blocksSight: false },
  DOOR_CLOSED: { symbol: "D", enterTicks: 2, blocksSight: true },
  WINDOW: { symbol: "=", enterTicks: 0, blocksSight: false },
  LOW_OBSTACLE: { symbol: "o", enterTicks: 0, blocksSight: false },
  WALL: { symbol: "#", enterTicks: 0, blocksSight: true },
};

/** A cell position: column `x` and row `y`, from the top-left corner. */
export interface CellPos {
  readonly x: number;
  readonly y: number;
}

/**
 * The grid of a slice, as plain data so it can live in the engine state. Build
 * it with `parseGridSpec`; every array is indexed by cell (`y × width + x`).
 */
export interface Grid {
  readonly width: number;
  readonly height: number;
  /** The type of each cell. */
  readonly cells: readonly CellType[];
  /** Whether each cell is an exit of the scene. */
  readonly exits: readonly boolean[];
  /** Whether each cell is roofed. */
  readonly roofed: readonly boolean[];
}

/** Whether a cell of this type can be crossed (FLOOR, ROUGH and both doors). */
export function isPassable(type: CellType): boolean {
  return CELL_RULES[type].enterTicks > 0;
}

/** Whether `(x, y)` is a cell of a grid of this size. */
export function isInside(size: Pick<Grid, "width" | "height">, x: number, y: number): boolean {
  return (
    Number.isSafeInteger(x) &&
    Number.isSafeInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < size.width &&
    y < size.height
  );
}

/**
 * The index of the cell at `pos`: `y × width + x`.
 *
 * @throws RangeError if `pos` is not a cell of the grid.
 */
export function cellIndex(grid: Grid, pos: CellPos): number {
  if (!isInside(grid, pos.x, pos.y)) {
    throw new RangeError(
      `cell (${pos.x}, ${pos.y}) is outside the ${grid.width} × ${grid.height} grid`,
    );
  }
  return pos.y * grid.width + pos.x;
}

/**
 * Checks that `index` is a cell of the grid and returns it.
 *
 * @throws RangeError if `index` is not a cell of the grid.
 */
export function requireCell(grid: Grid, index: number): number {
  if (!Number.isSafeInteger(index) || index < 0 || index >= grid.width * grid.height) {
    throw new RangeError(`cell index ${index} is outside the ${grid.width} × ${grid.height} grid`);
  }
  return index;
}

/**
 * The position of the cell at `index`.
 *
 * @throws RangeError if `index` is not a cell of the grid.
 */
export function cellPos(grid: Grid, index: number): CellPos {
  requireCell(grid, index);
  return { x: index % grid.width, y: div(index, grid.width) };
}

/**
 * The Chebyshev distance between two cells, `max(|dx|, |dy|)`, in cells
 * (simulation-model §3.1).
 *
 * @throws RangeError if an index is not a cell of the grid.
 */
export function cellDistance(grid: Grid, a: number, b: number): number {
  const from = cellPos(grid, a);
  const to = cellPos(grid, b);
  return Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
}
