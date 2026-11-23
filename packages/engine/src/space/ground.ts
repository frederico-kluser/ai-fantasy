/**
 * The search machinery of the space module (simulation-model §3.1): which cells
 * can be entered and for how many ticks, the legal steps (8 directions, no cut
 * corners) and a uniform-cost search. Steps cost 1 or 2 ticks, so the search
 * keeps its open cells in 3 rotating buckets by cost (Dial's algorithm) instead
 * of a heap. Internal: paths, destinations and movement use it.
 */
import { itemAt } from "../domain/lookup.ts";
import { div } from "../domain/math.ts";
import { CELL_RULES, isInside, requireCell, type Grid } from "./grid.ts";

/** No cell: a missing neighbour, step or choice. */
export const NONE = -1;

/** The cost of a cell no path reaches. */
export const UNREACHED = -1;

/**
 * What a search walks on: the grid, the ticks to enter each cell by its type
 * (0 when it cannot be crossed) and the cells taken by other characters (1).
 */
export interface Ground {
  readonly grid: Grid;
  readonly ticks: Uint8Array;
  readonly taken: Uint8Array;
}

/** Which way a cost field measures: from its source to each cell, or from each cell to it. */
export type FieldDirection = "FROM" | "TO";

/** The 8 neighbour offsets, by increasing index offset: −W−1, −W, −W+1, −1, +1, W−1, W, W+1. */
const OFFSETS: readonly (readonly [dx: number, dy: number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

/** Pending costs span at most 3 values: the current one plus a step of 1 or 2 ticks. */
const BUCKETS = 3;

/** The ticks to enter each cell of the grid, by its type. */
export function enterTicksOf(grid: Grid): Uint8Array {
  return Uint8Array.from(grid.cells, (type) => CELL_RULES[type].enterTicks);
}

/**
 * The ground for a character standing at `self`: the cells of `occupied` are
 * taken, except `self`, which a character never blocks for itself.
 *
 * @throws RangeError if a cell is outside the grid or `self` cannot be stood on.
 */
export function groundOf(grid: Grid, occupied: readonly number[], self: number): Ground {
  const ticks = enterTicksOf(grid);
  if (itemAt(ticks, requireCell(grid, self)) === 0) {
    throw new RangeError(`nobody can stand on cell ${self}, a ${itemAt(grid.cells, self)}`);
  }
  const taken = new Uint8Array(ticks.length);
  for (const cell of occupied) {
    taken[requireCell(grid, cell)] = 1;
  }
  taken[self] = 0;
  return { grid, ticks, taken };
}

/** Whether a character can enter `cell` now: crossable by type and not taken. */
export function isEnterable(ground: Ground, cell: number): boolean {
  return itemAt(ground.ticks, cell) > 0 && itemAt(ground.taken, cell) === 0;
}

/** The cell at offset `k` (an index of OFFSETS) from `cell`, or NONE outside the grid. */
export function offsetCell(grid: Grid, cell: number, k: number): number {
  const [dx, dy] = itemAt(OFFSETS, k);
  const x = (cell % grid.width) + dx;
  const y = div(cell, grid.width) + dy;
  return isInside(grid, x, y) ? y * grid.width + x : NONE;
}

/**
 * The cell a legal step from `cell` in direction `k` enters, or NONE. The cell
 * must be enterable, and the two cells beside the step must be passable by type
 * (occupation does not count): no cut corners. For a straight step those are
 * `cell` and the next cell themselves, so the rule only bites on diagonals.
 */
export function stepCell(ground: Ground, cell: number, k: number): number {
  const next = offsetCell(ground.grid, cell, k);
  if (next === NONE || !isEnterable(ground, next)) {
    return NONE;
  }
  const [dx, dy] = itemAt(OFFSETS, k);
  const besideX = itemAt(ground.ticks, cell + dx);
  const besideY = itemAt(ground.ticks, cell + dy * ground.grid.width);
  return besideX > 0 && besideY > 0 ? next : NONE;
}

/** Open cells by cost, in 3 rotating buckets; `#level` is the cost of the cells popped now. */
class LevelQueue {
  readonly #buckets: number[][] = [[], [], []];
  #size = 0;
  #level = 0;

  push(cell: number, cost: number): void {
    itemAt(this.#buckets, cost % BUCKETS).push(cell);
    this.#size += 1;
  }

  /** The next open cell of the lowest cost, or NONE when there is none. */
  pop(): number {
    if (this.#size === 0) {
      return NONE;
    }
    let bucket = itemAt(this.#buckets, this.#level % BUCKETS);
    while (bucket.length === 0) {
      this.#level += 1;
      bucket = itemAt(this.#buckets, this.#level % BUCKETS);
    }
    this.#size -= 1;
    const cell = itemAt(bucket, bucket.length - 1);
    bucket.length -= 1;
    return cell;
  }
}

function relaxAround(
  ground: Ground,
  cost: Int32Array,
  queue: LevelQueue,
  cell: number,
  direction: FieldDirection,
): void {
  const base = itemAt(cost, cell);
  for (let k = 0; k < OFFSETS.length; k += 1) {
    const next = stepCell(ground, cell, k);
    if (next === NONE) {
      continue;
    }
    // Walking forward, the step enters `next`; measuring TO the source, it enters `cell`.
    const reached = base + itemAt(ground.ticks, direction === "TO" ? cell : next);
    const known = itemAt(cost, next);
    if (known === UNREACHED || reached < known) {
      cost[next] = reached;
      queue.push(next, reached);
    }
  }
}

/**
 * The cheapest cost in ticks between `source` and every cell: FROM the source
 * (to choose a destination) or TO it (to walk there). Cells no path reaches hold
 * UNREACHED, and so does everything when `source` cannot be entered. With
 * `stopAt`, the search ends when that cell's cost is final: the costs of every
 * cheapest path from it are final then too.
 */
export function costField(
  ground: Ground,
  source: number,
  direction: FieldDirection,
  stopAt = NONE,
): Int32Array {
  const cost = new Int32Array(ground.ticks.length).fill(UNREACHED);
  if (!isEnterable(ground, source)) {
    return cost;
  }
  cost[source] = 0;
  const queue = new LevelQueue();
  queue.push(source, 0);
  for (let cell = queue.pop(); cell !== NONE && cell !== stopAt; cell = queue.pop()) {
    relaxAround(ground, cost, queue, cell, direction);
  }
  return cost;
}

/**
 * The next cell from `from` on a cheapest path, given the field of costs TO the
 * destination: the legal step with the fewest ticks to enter plus cost left. On
 * a tie the lowest index wins: OFFSETS visit neighbours by increasing index and
 * only a strictly cheaper step replaces the best. NONE if no step leads there.
 */
export function nextOnField(ground: Ground, toward: Int32Array, from: number): number {
  let best = NONE;
  let bestCost = Number.MAX_SAFE_INTEGER;
  for (let k = 0; k < OFFSETS.length; k += 1) {
    const next = stepCell(ground, from, k);
    if (next === NONE || itemAt(toward, next) === UNREACHED) {
      continue;
    }
    const total = itemAt(ground.ticks, next) + itemAt(toward, next);
    if (total < bestCost) {
      best = next;
      bestCost = total;
    }
  }
  return best;
}
