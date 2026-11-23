/**
 * Cheapest paths on the grid (simulation-model §3.1): the cost of a path is the
 * ticks to enter each of its cells, steps go in 8 directions without cutting
 * corners, cells taken by others are blocked, and among paths of the same cost
 * the lexicographically smallest sequence of indices wins.
 */
import { itemAt } from "../domain/lookup.ts";
import { err, ok, type Result } from "../domain/result.ts";
import { requireCell, type Grid } from "./grid.ts";
import { costField, groundOf, nextOnField, UNREACHED, type Ground } from "./ground.ts";

/** Why there is no path: the destination cannot be reached now. */
export type PathError = "NO_PATH";

/** The cells from `from` along the field of costs TO the destination, until the cost left is 0. */
function walkField(ground: Ground, toward: Int32Array, from: number): number[] {
  const path: number[] = [];
  let cell = from;
  // Every step costs at least 1 tick, so the cost left falls to 0 at the destination.
  while (itemAt(toward, cell) > 0) {
    cell = nextOnField(ground, toward, cell);
    path.push(cell);
  }
  return path;
}

/**
 * The next cell from `from` toward `to` on the cheapest path for the ground as
 * it is now, or NONE when no path leads there (or `from` is `to`).
 */
export function stepToward(ground: Ground, from: number, to: number): number {
  return nextOnField(ground, costField(ground, to, "TO", from), from);
}

/**
 * The cheapest path from `from` to `to`: the cells entered, in order, ending
 * with `to` (empty when `from` is `to`). `occupied` lists the cells taken by
 * characters; the mover's own cell `from` is ignored there.
 *
 * @example
 * findPath(grid, 0, 2, []); // ok([1, 2]) in a corridor
 * findPath(grid, 0, 2, [1]); // err("NO_PATH"): someone stands in the way
 * @throws RangeError if a cell is outside the grid or `from` cannot be stood on.
 */
export function findPath(
  grid: Grid,
  from: number,
  to: number,
  occupied: readonly number[],
): Result<number[], PathError> {
  const ground = groundOf(grid, occupied, from);
  const toward = costField(ground, requireCell(grid, to), "TO", from);
  if (itemAt(toward, from) === UNREACHED) {
    return err("NO_PATH");
  }
  return ok(walkField(ground, toward, from));
}
