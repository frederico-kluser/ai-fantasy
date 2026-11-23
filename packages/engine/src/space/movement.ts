/**
 * Movement, one tick at a time (simulation-model §8.1). Characters with a goal
 * walk in increasing id order, each one seeing the cells already taken or left
 * by those before it. The way first avoids the others (§3.1); when no free way
 * exists, the character follows the way through them and waits whenever its
 * next cell is taken, so it queues behind whoever blocks it. A step enters the
 * next cell once the effort spent reaches its ticks (1, or 2 for `ROUGH` and
 * `DOOR_CLOSED`). Doors stay closed: the grid never changes.
 */
import { compareIds, type CharacterId } from "../domain/ids.ts";
import { itemAt } from "../domain/lookup.ts";
import { APPROACH_DISTANCE, approachOn, exitOn } from "./destinations.ts";
import { cellDistance, requireCell, type Grid } from "./grid.ts";
import { enterTicksOf, isEnterable, NONE, type Ground } from "./ground.ts";
import { stepToward } from "./path.ts";

/**
 * Where a character is going. `CELL` is a fixed cell (`MOVE`, `WITHDRAW`);
 * `NEAR` is next to someone, recomputed every tick (`APPROACH`); `EXIT` is the
 * nearest free exit, recomputed every tick (`LEAVE`, the `FAREWELL` of whoever leaves).
 */
export type MoveGoal =
  | { readonly kind: "CELL"; readonly cell: number }
  | { readonly kind: "NEAR"; readonly target: CharacterId }
  | { readonly kind: "EXIT" };

/** A character on the grid: its cell, its goal if it is moving and the effort spent. */
export interface Occupant {
  readonly id: CharacterId;
  readonly cell: number;
  /** Absent when the character stands still; dropped once the goal is reached. */
  readonly goal?: MoveGoal;
  /** Ticks of effort already spent toward the next cell: 0, or 1 midway into a 2-tick cell. */
  readonly progress: number;
}

/** The cell of each character during the tick, updated as they walk. */
type Positions = Map<CharacterId, number>;

/** The ground of a tick, as the others stand (`strict`) and ignoring them (`loose`). */
interface Grounds {
  readonly strict: Ground;
  readonly loose: Ground;
}

function place(ground: Ground, where: Positions, occupant: Occupant): void {
  const cell = requireCell(ground.grid, occupant.cell);
  if (itemAt(ground.ticks, cell) === 0) {
    throw new RangeError(
      `character ${occupant.id} stands on cell ${cell}, a ${itemAt(ground.grid.cells, cell)}`,
    );
  }
  if (itemAt(ground.taken, cell) === 1) {
    throw new RangeError(`two characters stand on cell ${cell}`);
  }
  if (where.has(occupant.id)) {
    throw new RangeError(`character ${occupant.id} is listed twice`);
  }
  ground.taken[cell] = 1;
  where.set(occupant.id, cell);
}

/** Whether a goal is reached at `cell`; an approach also ends when its target left. */
function isMet(grid: Grid, where: Positions, cell: number, goal: MoveGoal): boolean {
  switch (goal.kind) {
    case "CELL":
      return cell === goal.cell;
    case "NEAR": {
      const target = where.get(goal.target) ?? NONE;
      return target === NONE || cellDistance(grid, cell, target) <= APPROACH_DISTANCE;
    }
    case "EXIT":
      return itemAt(grid.exits, cell);
  }
}

/** Where the goal leads from `cell` this tick, or NONE without a reachable destination. */
function destinationOf(ground: Ground, where: Positions, cell: number, goal: MoveGoal): number {
  switch (goal.kind) {
    case "CELL":
      return goal.cell;
    case "NEAR":
      return approachOn(ground, cell, where.get(goal.target) ?? NONE);
    case "EXIT":
      return exitOn(ground, cell);
  }
}

/** The next cell toward the goal on a ground, or NONE without a destination or a way there. */
function stepOn(ground: Ground, where: Positions, cell: number, goal: MoveGoal): number {
  const destination = destinationOf(ground, where, cell, goal);
  return destination === NONE ? NONE : stepToward(ground, cell, destination);
}

/**
 * The cell to enter this tick: the next one on a free way if there is one;
 * otherwise the next one on the way through the others, which may be taken.
 */
function nextCell(grounds: Grounds, where: Positions, cell: number, goal: MoveGoal): number {
  const free = stepOn(grounds.strict, where, cell, goal);
  return free === NONE ? stepOn(grounds.loose, where, cell, goal) : free;
}

/** The character standing at `cell`, its goal done. */
function arrived(occupant: Occupant, cell: number): Occupant {
  return { id: occupant.id, cell, progress: 0 };
}

/** One tick of one character, with the ground as the characters before it left it. */
function advance(grounds: Grounds, where: Positions, occupant: Occupant): Occupant {
  const { goal } = occupant;
  const { strict } = grounds;
  if (goal === undefined) {
    return occupant;
  }
  if (isMet(strict.grid, where, occupant.cell, goal)) {
    return arrived(occupant, occupant.cell);
  }
  const next = nextCell(grounds, where, occupant.cell, goal);
  if (next === NONE || !isEnterable(strict, next)) {
    return { ...occupant, progress: 0 };
  }
  const progress = occupant.progress + 1;
  if (progress < itemAt(strict.ticks, next)) {
    return { ...occupant, progress };
  }
  return isMet(strict.grid, where, next, goal)
    ? arrived(occupant, next)
    : { ...occupant, cell: next, progress: 0 };
}

/**
 * Advances every character one tick (simulation-model §8.1): in increasing id
 * order, each one with a goal recomputes its destination and path on the cells
 * as the others left them, then steps, keeps spending effort, or waits. When no
 * free way exists it follows the way through the others and waits while its
 * next cell is taken. Returns the characters sorted by id; a goal reached is dropped.
 *
 * @example
 * moveTick(grid, [{ id, cell: 0, goal: { kind: "EXIT" }, progress: 0 }]);
 * @throws RangeError if a character stands outside the grid or on a cell that
 * cannot be crossed, two share a cell, or an id repeats (invariant 11).
 */
export function moveTick(grid: Grid, occupants: readonly Occupant[]): Occupant[] {
  const ordered = [...occupants].sort((a, b) => compareIds(a.id, b.id));
  const ticks = enterTicksOf(grid);
  const grounds: Grounds = {
    strict: { grid, ticks, taken: new Uint8Array(ticks.length) },
    loose: { grid, ticks, taken: new Uint8Array(ticks.length) },
  };
  const { taken } = grounds.strict;
  const where: Positions = new Map();
  for (const occupant of ordered) {
    place(grounds.strict, where, occupant);
  }
  const moved: Occupant[] = [];
  for (const occupant of ordered) {
    // A character never blocks itself.
    taken[occupant.cell] = 0;
    const next = advance(grounds, where, occupant);
    taken[next.cell] = 1;
    where.set(next.id, next.cell);
    moved.push(next);
  }
  return moved;
}
