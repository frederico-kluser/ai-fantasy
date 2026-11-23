/**
 * Test oracle for paths (simulation-model §3.1): the cheapest cost between two
 * cells by plain relaxation until nothing changes, with its own table of ticks.
 * Slow and obvious on purpose, so it can check the engine's search.
 */
import type { Result } from "../../src/domain/result.ts";
import type { CellType, Grid } from "../../src/space/grid.ts";

const TICKS: Readonly<Record<CellType, number>> = {
  FLOOR: 1,
  ROUGH: 2,
  DOOR_OPEN: 1,
  DOOR_CLOSED: 2,
  WINDOW: 0,
  LOW_OBSTACLE: 0,
  WALL: 0,
};

function typeTicks(grid: Grid, x: number, y: number): number {
  const type = grid.cells[y * grid.width + x];
  return type === undefined ? 0 : TICKS[type];
}

function isInside(grid: Grid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < grid.width && y < grid.height;
}

/** Whether the step from (x, y) by (dx, dy) is legal, ignoring who stands where. */
function isLegalStep(grid: Grid, x: number, y: number, dx: number, dy: number): boolean {
  const corner =
    dx === 0 || dy === 0 || (typeTicks(grid, x + dx, y) > 0 && typeTicks(grid, x, y + dy) > 0);
  return isInside(grid, x + dx, y + dy) && typeTicks(grid, x + dx, y + dy) > 0 && corner;
}

const STEPS = [-1, 0, 1]
  .flatMap((dx) => [-1, 0, 1].map((dy) => [dx, dy] as const))
  .filter(([dx, dy]) => dx !== 0 || dy !== 0);

/** One relaxation round from every reached cell; whether anything improved. */
function relaxAll(grid: Grid, cost: number[], taken: ReadonlySet<number>): boolean {
  let changed = false;
  cost.forEach((known, cell) => {
    const x = cell % grid.width;
    const y = (cell - x) / grid.width;
    for (const [dx, dy] of STEPS) {
      const next = (y + dy) * grid.width + x + dx;
      if (Number.isFinite(known) && isLegalStep(grid, x, y, dx, dy) && !taken.has(next)) {
        const reached = known + typeTicks(grid, x + dx, y + dy);
        if (reached < (cost[next] ?? 0)) {
          cost[next] = reached;
          changed = true;
        }
      }
    }
  });
  return changed;
}

/**
 * The cheapest cost in ticks from `from` to `to` (entering each cell after the
 * first), or undefined without a path. Cells in `occupied` other than `from`
 * cannot be entered.
 */
export function referenceCost(
  grid: Grid,
  from: number,
  to: number,
  occupied: readonly number[],
): number | undefined {
  const taken = new Set(occupied.filter((cell) => cell !== from));
  const cost = grid.cells.map(() => Number.POSITIVE_INFINITY);
  cost[from] = 0;
  while (relaxAll(grid, cost, taken)) {
    // relax until nothing changes
  }
  const best = cost[to] ?? Number.POSITIVE_INFINITY;
  return Number.isFinite(best) ? best : undefined;
}

/** The cost of a found path (the ticks to enter each of its cells), or undefined for an error. */
export function costOfPath(
  grid: Grid,
  path: Result<readonly number[], unknown>,
): number | undefined {
  if (!path.ok) {
    return undefined;
  }
  return path.value.reduce((total, cell) => {
    const type = grid.cells[cell];
    return total + (type === undefined ? Number.NaN : TICKS[type]);
  }, 0);
}

/**
 * Whether each step of a found path from `from` is legal: a neighbour,
 * enterable, free, no cut corner. An error has no steps, so it is legal.
 */
export function isLegalPath(
  grid: Grid,
  from: number,
  found: Result<readonly number[], unknown>,
  occupied: readonly number[],
): boolean {
  const taken = new Set(occupied.filter((cell) => cell !== from));
  const path = found.ok ? found.value : [];
  return path.every((cell, index) => {
    const previous = index === 0 ? from : (path[index - 1] ?? from);
    const x = previous % grid.width;
    const y = (previous - x) / grid.width;
    const dx = (cell % grid.width) - x;
    const dy = (cell - (cell % grid.width)) / grid.width - y;
    const isNeighbour = Math.max(Math.abs(dx), Math.abs(dy)) === 1;
    return isNeighbour && isLegalStep(grid, x, y, dx, dy) && !taken.has(cell);
  });
}
