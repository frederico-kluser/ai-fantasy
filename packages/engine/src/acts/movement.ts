/**
 * Where movement acts lead (simulation-model §8.1, §16 sub-step 5.6): `MOVE`,
 * `APPROACH`, `WITHDRAW`, `LEAVE` and the `FAREWELL` of whoever is leaving cost
 * 1 tick and only set a destination, with the space functions of CORE-02. The
 * walking itself happens tick by tick (`moveTick`, called by the scene step).
 */
import type { ActId } from "../presets/acts.ts";
import { approachCell, nearestExit, withdrawCell } from "../space/destinations.ts";
import type { Grid } from "../space/grid.ts";
import type { Listener } from "../space/hearing.ts";
import type { MoveGoal } from "../space/movement.ts";
import { findPath } from "../space/path.ts";
import type { ActLabel } from "./label.ts";

/**
 * What a resolved act does to the author's movement: nothing (`STAY`), a new
 * goal with the cell chosen now (`GOAL`), or a leave cancelled because walls
 * leave no exit reachable (`CANCELLED`).
 */
export type MovementOutcome =
  | { readonly kind: "STAY" }
  | { readonly kind: "GOAL"; readonly goal: MoveGoal; readonly destination: number }
  | { readonly kind: "CANCELLED" };

/** What the destination of an act depends on. */
export interface MovementInput {
  readonly grid: Grid;
  /** A valid label (see `validateAct`). */
  readonly label: ActLabel;
  /** The author's cell. */
  readonly from: number;
  /** Whether the author is leaving the slice (its `FAREWELL` heads for an exit). */
  readonly leaving: boolean;
  /** The others present, where they stand. */
  readonly others: readonly Listener[];
}

const STAY: MovementOutcome = { kind: "STAY" };

function goal(moveGoal: MoveGoal, destination: number): MovementOutcome {
  return { kind: "GOAL", goal: moveGoal, destination };
}

function occupied(input: MovementInput): number[] {
  return input.others.map((other) => other.cell);
}

/** The single target of `APPROACH` and `WITHDRAW` and its cell. */
function onlyTarget(input: MovementInput): Listener {
  const { targets } = input.label;
  const target = targets === "GROUP" ? undefined : targets[0];
  const found = input.others.find((other) => other.id === target);
  if (found === undefined) {
    throw new RangeError(
      "a movement toward someone needs a present target: validate the act first",
    );
  }
  return found;
}

/** The nearest reachable exit, or the leave is cancelled (simulation-model §8.1). */
function exitFor(input: MovementInput): MovementOutcome {
  const exit = nearestExit(input.grid, input.from, occupied(input));
  return exit.ok ? goal({ kind: "EXIT" }, exit.value) : { kind: "CANCELLED" };
}

/** The chosen cell, if a path through walls and cell types reaches it; otherwise nobody moves. */
function moveFor(input: MovementInput): MovementOutcome {
  const { destination } = input.label;
  if (destination === undefined) {
    throw new RangeError("a MOVE needs a destination: validate the act first");
  }
  const path = findPath(input.grid, input.from, destination, []);
  return path.ok ? goal({ kind: "CELL", cell: destination }, destination) : STAY;
}

function approachFor(input: MovementInput): MovementOutcome {
  const target = onlyTarget(input);
  const cell = approachCell(input.grid, input.from, target.cell, occupied(input));
  return cell.ok ? goal({ kind: "NEAR", target: target.id }, cell.value) : STAY;
}

function withdrawFor(input: MovementInput): MovementOutcome {
  const cell = withdrawCell(input.grid, input.from, onlyTarget(input).cell, occupied(input));
  return goal({ kind: "CELL", cell }, cell);
}

/** The destination rule of each movement act (simulation-model §8.1, table). */
const DESTINATIONS: Readonly<Partial<Record<ActId, (input: MovementInput) => MovementOutcome>>> = {
  MOVE: moveFor,
  APPROACH: approachFor,
  WITHDRAW: withdrawFor,
  LEAVE: exitFor,
  FAREWELL: (input) => (input.leaving ? exitFor(input) : STAY),
};

/**
 * The destination an act sets for its author (simulation-model §8.1): `MOVE`,
 * the chosen cell (nobody moves when walls leave no path); `APPROACH`, next to
 * the target (`NEAR`, recomputed each tick); `WITHDRAW`, 4 cells or more from the
 * target; `LEAVE` and the `FAREWELL` of whoever is leaving, the nearest exit
 * (`CANCELLED` when walls leave none reachable). Other acts move nobody.
 *
 * @throws RangeError if the label is not valid for the movement it asks.
 */
export function movementOf(input: MovementInput): MovementOutcome {
  const destination = DESTINATIONS[input.label.act];
  return destination === undefined ? STAY : destination(input);
}
