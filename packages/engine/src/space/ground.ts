/**
 * The search machinery of the space module (simulation-model §3.1): which cells
 * can be entered and for how many ticks, the legal steps (8 directions, no cut
 * corners) and a uniform-cost search. Steps cost 1 or 2 ticks, so the search
 * keeps its open cells in 3 rotating buckets by cost (Dial's algorithm) instead
 * of a heap. The steps the cell types allow are worked out once per ground, so
 * the many searches of a tick only look up a table. Internal: paths,
 * destinations and movement use it.
 */
import { itemAt } from "../domain/lookup.ts";
import { CELL_RULES, requireCell, type Grid } from "./grid.ts";

/** No cell: a missing neighbour, step or choice. */
export const NONE = -1;

/** The cost of a cell no path reaches. */
export const UNREACHED = -1;

/** The cell types of a grid as searches need them: the same for everyone during a tick. */
export interface Terrain {
  /** The ticks to enter each cell by its type, 0 when it cannot be crossed. */
  readonly ticks: Uint8Array;
  /** For each cell, `STEPS_PER_CELL` entries: the cells its type allows stepping into, or NONE. */
  readonly steps: Int32Array;
}

/** What a search walks on: the grid, its terrain and the cells taken by other characters (1). */
export interface Ground extends Terrain {
  readonly grid: Grid;
  readonly taken: Uint8Array;
}

/** Which way a cost field measures: from its source to each cell, or from each cell to it. */
export type FieldDirection = "FROM" | "TO";

/**
 * The 8 neighbour offsets `(DX[k], DY[k])`, by increasing index offset: −W−1,
 * −W, −W+1, −1, +1, W−1, W, W+1. Two flat arrays: the hot loops read numbers,
 * not tuples.
 */
const DX: readonly number[] = [-1, 0, 1, -1, 1, -1, 0, 1];
const DY: readonly number[] = [-1, -1, -1, 0, 0, 1, 1, 1];

/** Entries of {@link Terrain.steps} per cell, one per offset. */
const STEPS_PER_CELL = DX.length;

/** Pending costs span at most 3 values: the current one plus a step of 1 or 2 ticks. */
const BUCKETS = 3;

/**
 * The cell whose ticks a relaxed step costs: the cell it enters. Walking FROM the
 * source, the step goes from `cell` into `next`; measuring TO the source, the
 * walk goes the other way, from `next` into `cell`.
 */
const ENTERED: Readonly<Record<FieldDirection, (cell: number, next: number) => number>> = {
  FROM: (_cell, next) => next,
  TO: (cell) => cell,
};

/**
 * Fills the steps of the cell at `(x, y)` that the types allow: into a passable
 * cell of the grid, with both cells beside the step passable by type (no cut
 * corners). For a straight step those two are the cell and the next one
 * themselves, so the corner rule only bites on diagonals.
 */
function fillSteps(grid: Grid, terrain: Terrain, x: number, y: number): void {
  const { width, height } = grid;
  const cell = y * width + x;
  for (let k = 0; k < STEPS_PER_CELL; k += 1) {
    const dx = itemAt(DX, k);
    const dy = itemAt(DY, k);
    const inside = x + dx >= 0 && y + dy >= 0 && x + dx < width && y + dy < height;
    const next = cell + dy * width + dx;
    const open =
      inside &&
      itemAt(terrain.ticks, next) > 0 &&
      itemAt(terrain.ticks, cell + dx) > 0 &&
      itemAt(terrain.ticks, cell + dy * width) > 0;
    terrain.steps[cell * STEPS_PER_CELL + k] = open ? next : NONE;
  }
}

/** The terrain of a grid: ticks to enter each cell and the steps its types allow. */
export function terrainOf(grid: Grid): Terrain {
  const ticks = Uint8Array.from(grid.cells, (type) => CELL_RULES[type].enterTicks);
  const terrain: Terrain = { ticks, steps: new Int32Array(ticks.length * STEPS_PER_CELL) };
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      fillSteps(grid, terrain, x, y);
    }
  }
  return terrain;
}

/**
 * The ground for a character standing at `self`: the cells of `occupied` are
 * taken, except `self`, which a character never blocks for itself.
 *
 * @throws RangeError if a cell is outside the grid or `self` cannot be stood on.
 */
export function groundOf(grid: Grid, occupied: readonly number[], self: number): Ground {
  const terrain = terrainOf(grid);
  if (itemAt(terrain.ticks, requireCell(grid, self)) === 0) {
    throw new RangeError(`nobody can stand on cell ${self}, a ${itemAt(grid.cells, self)}`);
  }
  const taken = new Uint8Array(terrain.ticks.length);
  for (const cell of occupied) {
    taken[requireCell(grid, cell)] = 1;
  }
  taken[self] = 0;
  return { grid, ...terrain, taken };
}

/** Whether a character can enter `cell` now: crossable by type and not taken. */
export function isEnterable(ground: Ground, cell: number): boolean {
  return itemAt(ground.ticks, cell) > 0 && itemAt(ground.taken, cell) === 0;
}

/** The cell a legal step from `cell` in direction `k` enters now, or NONE (not allowed or taken). */
function stepCell(ground: Ground, cell: number, k: number): number {
  const next = itemAt(ground.steps, cell * STEPS_PER_CELL + k);
  return next !== NONE && itemAt(ground.taken, next) === 0 ? next : NONE;
}

/** Open cells by cost, in 3 rotating buckets; `level` is the cost of the cells popped now. */
class LevelQueue {
  readonly #buckets: number[][] = [[], [], []];
  #size = 0;
  #level = 0;

  get level(): number {
    return this.#level;
  }

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
  entered: (cell: number, next: number) => number,
): void {
  const base = itemAt(cost, cell);
  for (let k = 0; k < STEPS_PER_CELL; k += 1) {
    const next = stepCell(ground, cell, k);
    if (next === NONE) {
      continue;
    }
    const reached = base + itemAt(ground.ticks, entered(cell, next));
    const known = itemAt(cost, next);
    if (known === UNREACHED || reached < known) {
      cost[next] = reached;
      queue.push(next, reached);
    }
  }
}

/** A search from `source`: its costs so far and its queue, the source at cost 0. */
function startSearch(ground: Ground, source: number): { cost: Int32Array; queue: LevelQueue } {
  const cost = new Int32Array(ground.ticks.length).fill(UNREACHED);
  cost[source] = 0;
  const queue = new LevelQueue();
  queue.push(source, 0);
  return { cost, queue };
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
  if (!isEnterable(ground, source)) {
    return new Int32Array(ground.ticks.length).fill(UNREACHED);
  }
  const { cost, queue } = startSearch(ground, source);
  const entered = ENTERED[direction];
  for (let cell = queue.pop(); cell !== NONE && cell !== stopAt; cell = queue.pop()) {
    relaxAround(ground, cost, queue, cell, entered);
  }
  return cost;
}

/**
 * The cell cheapest to reach from `source` (where a character stands) among
 * those `accept` takes, ties to the lowest index; NONE if none can be reached.
 * The search stops once the costs go past the best one found.
 */
export function nearestWhere(
  ground: Ground,
  source: number,
  accept: (cell: number) => boolean,
): number {
  const { cost, queue } = startSearch(ground, source);
  let best = NONE;
  let bestCost = Number.MAX_SAFE_INTEGER;
  for (let cell = queue.pop(); cell !== NONE && queue.level <= bestCost; cell = queue.pop()) {
    const reached = itemAt(cost, cell);
    // No cell popped here costs more than bestCost, so this keeps the cheapest
    // and, among cells of the same cost (popped in any order), the lowest index.
    if (accept(cell) && (reached < bestCost || cell < best)) {
      best = cell;
      bestCost = reached;
    }
    relaxAround(ground, cost, queue, cell, ENTERED.FROM);
  }
  return best;
}

/**
 * The next cell from `from` on a cheapest path, given the field of costs TO the
 * destination: the legal step with the fewest ticks to enter plus cost left. On
 * a tie the lowest index wins: the offsets go by increasing index and
 * only a strictly cheaper step replaces the best. NONE if no step leads there.
 */
export function nextOnField(ground: Ground, toward: Int32Array, from: number): number {
  let best = NONE;
  let bestCost = Number.MAX_SAFE_INTEGER;
  for (let k = 0; k < STEPS_PER_CELL; k += 1) {
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
