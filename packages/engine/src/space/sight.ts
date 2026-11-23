/**
 * Line of sight by supercover (simulation-model §3.1): the cells a straight line
 * between two cell centers crosses, and both cells of every corner it passes
 * exactly through. Only integers: the walk compares crossings in doubled
 * coordinates, so it gives the same cells on every machine and in both ways.
 */
import { itemAt } from "../domain/lookup.ts";
import { CELL_RULES, cellDistance, cellPos, type Grid } from "./grid.ts";

/** Where a walk along a line is: the cell and the steps taken in x and in y. */
interface Walk {
  x: number;
  y: number;
  ix: number;
  iy: number;
}

/** The direction and length of a line, in cells. */
interface Line {
  readonly nx: number;
  readonly ny: number;
  readonly sx: number;
  readonly sy: number;
}

/**
 * One step of the walk: compare `(1 + 2 × ix) × ny` with `(1 + 2 × iy) × nx`;
 * below 0 steps in x, above 0 in y, and 0 (an exact corner) in both.
 */
function step(walk: Walk, line: Line, decision: number): void {
  if (decision <= 0) {
    walk.x += line.sx;
    walk.ix += 1;
  }
  if (decision >= 0) {
    walk.y += line.sy;
    walk.iy += 1;
  }
}

/**
 * Calls `visit` with each cell of the supercover strictly between `from` and
 * `to`, in order from `from`; at an exact corner, the cell beside it in x comes
 * before the cell beside it in y (simulation-model §3.1).
 *
 * @throws RangeError if an index is not a cell of the grid.
 */
export function forEachCellBetween(
  grid: Grid,
  from: number,
  to: number,
  visit: (cell: number) => void,
): void {
  const start = cellPos(grid, from);
  const end = cellPos(grid, to);
  const line: Line = {
    nx: Math.abs(end.x - start.x),
    ny: Math.abs(end.y - start.y),
    sx: Math.sign(end.x - start.x),
    sy: Math.sign(end.y - start.y),
  };
  const walk: Walk = { x: start.x, y: start.y, ix: 0, iy: 0 };
  while (walk.ix < line.nx || walk.iy < line.ny) {
    const decision = (1 + 2 * walk.ix) * line.ny - (1 + 2 * walk.iy) * line.nx;
    if (decision === 0) {
      visit(walk.y * grid.width + walk.x + line.sx);
      visit((walk.y + line.sy) * grid.width + walk.x);
    }
    step(walk, line, decision);
    if (walk.ix < line.nx || walk.iy < line.ny) {
      visit(walk.y * grid.width + walk.x);
    }
  }
}

/**
 * The cells of the supercover strictly between `from` and `to`, in order (see
 * {@link forEachCellBetween}); empty for orthogonal neighbours or the same cell
 * (diagonal neighbours give the two cells of their corner).
 *
 * @throws RangeError if an index is not a cell of the grid.
 */
export function cellsBetween(grid: Grid, from: number, to: number): number[] {
  const cells: number[] = [];
  forEachCellBetween(grid, from, to, (cell) => cells.push(cell));
  return cells;
}

/**
 * Whether nothing between `from` and `to` blocks sight: `WALL` and `DOOR_CLOSED`
 * block; the two endpoints never do (simulation-model §3.1). Symmetric.
 *
 * @throws RangeError if an index is not a cell of the grid.
 */
export function hasLineOfSight(grid: Grid, from: number, to: number): boolean {
  let clear = true;
  forEachCellBetween(grid, from, to, (cell) => {
    clear &&= !CELL_RULES[itemAt(grid.cells, cell)].blocksSight;
  });
  return clear;
}

/**
 * Whether someone at `from` sees the cell `to`: within `range` cells (Chebyshev)
 * and with a line of sight (simulation-model §3.2). Get `range` from `visionRange`.
 *
 * @throws RangeError if an index is not a cell of the grid.
 */
export function canSee(grid: Grid, from: number, to: number, range: number): boolean {
  return cellDistance(grid, from, to) <= range && hasLineOfSight(grid, from, to);
}
