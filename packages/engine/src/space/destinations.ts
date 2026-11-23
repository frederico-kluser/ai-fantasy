/**
 * Where movement acts lead (simulation-model §8.1): next to someone for
 * `APPROACH`, 4 cells or more away for `WITHDRAW`, and the nearest exit for a
 * character leaving. "Nearest" is by path cost with the occupation of the
 * moment, "free" is without another character, distance is Chebyshev's, and
 * every tie goes to the lowest index. Which act sets which destination is the
 * acts' business (SOC-01).
 */
import { WITHDRAW_DISTANCE } from "../domain/constants.ts";
import { itemAt } from "../domain/lookup.ts";
import { err, ok, type Result } from "../domain/result.ts";
import { cellDistance, requireCell, type Grid } from "./grid.ts";
import { costField, groundOf, nearestWhere, NONE, UNREACHED, type Ground } from "./ground.ts";
import type { PathError } from "./path.ts";

/** `APPROACH` ends next to the target (simulation-model §8.1). */
export const APPROACH_DISTANCE = 1;

/** The reachable cell of a FROM field farthest from `target`, or NONE; ties to the lowest index. */
function farthestFrom(grid: Grid, field: Int32Array, target: number): number {
  let best = NONE;
  let bestDistance = -1;
  for (const [cell, cost] of field.entries()) {
    const distance = cellDistance(grid, cell, target);
    if (cost !== UNREACHED && distance > bestDistance) {
      best = cell;
      bestDistance = distance;
    }
  }
  return best;
}

/** The `APPROACH` destination on a ground, or NONE: the cheapest free cell next to `target`. */
export function approachOn(ground: Ground, from: number, target: number): number {
  return nearestWhere(
    ground,
    from,
    (cell) => cellDistance(ground.grid, cell, target) === APPROACH_DISTANCE,
  );
}

/** The exit destination on a ground, or NONE: the cheapest free exit. */
export function exitOn(ground: Ground, from: number): number {
  return nearestWhere(ground, from, (cell) => itemAt(ground.grid.exits, cell));
}

function withdrawOn(ground: Ground, from: number, target: number): number {
  const away = nearestWhere(
    ground,
    from,
    (cell) => cellDistance(ground.grid, cell, target) >= WITHDRAW_DISTANCE,
  );
  return away === NONE ? farthestFrom(ground.grid, costField(ground, from, "FROM"), target) : away;
}

function found(cell: number): Result<number, PathError> {
  return cell === NONE ? err("NO_PATH") : ok(cell);
}

/**
 * The `APPROACH` destination: the free cell at distance 1 from `target` that is
 * cheapest to reach from `from` (ties: lowest index); `from` itself when it is
 * already next to the target. `occupied` lists the cells taken by characters
 * (the target's included); the mover's own cell is ignored there.
 *
 * @returns the cell, or `NO_PATH` when no free cell next to the target can be reached.
 * @throws RangeError if a cell is outside the grid or `from` cannot be stood on.
 */
export function approachCell(
  grid: Grid,
  from: number,
  target: number,
  occupied: readonly number[],
): Result<number, PathError> {
  const ground = groundOf(grid, occupied, from);
  return found(approachOn(ground, from, requireCell(grid, target)));
}

/**
 * The `WITHDRAW` destination: the free cell at distance 4 or more from `target`
 * that is cheapest to reach from `from` (ties: lowest index); without any, the
 * reachable cell farthest from the target (ties: lowest index), which may be
 * `from` itself. It always exists, since `from` is reachable.
 *
 * @throws RangeError if a cell is outside the grid or `from` cannot be stood on.
 */
export function withdrawCell(
  grid: Grid,
  from: number,
  target: number,
  occupied: readonly number[],
): number {
  return withdrawOn(groundOf(grid, occupied, from), from, requireCell(grid, target));
}

/**
 * The exit destination of a character leaving: the free `exit` cell cheapest to
 * reach from `from` (ties: lowest index); `from` itself when it is an exit.
 *
 * @returns the cell, or `NO_PATH` when no exit can be reached: the leave is cancelled.
 * @throws RangeError if a cell is outside the grid or `from` cannot be stood on.
 */
export function nearestExit(
  grid: Grid,
  from: number,
  occupied: readonly number[],
): Result<number, PathError> {
  return found(exitOn(groundOf(grid, occupied, from), from));
}
