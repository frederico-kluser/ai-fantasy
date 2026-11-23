/**
 * Test support for movement (simulation-model §8.1 and invariant 11 of §18):
 * occupants, random scenes with goals, a runner of many ticks and an
 * independent check of where everyone stands.
 */
import fc from "fast-check";

import type { CharacterId } from "../../src/domain/ids.ts";
import type { CellType, Grid } from "../../src/space/grid.ts";
import { moveTick, type MoveGoal, type Occupant } from "../../src/space/movement.ts";
import { arbitraryGrid, idOf } from "./space.ts";

const CROSSABLE: ReadonlySet<CellType> = new Set(["FLOOR", "ROUGH", "DOOR_OPEN", "DOOR_CLOSED"]);

/** An occupant with an optional goal and the effort already spent (0 by default). */
export function occupant(id: number, cell: number, goal?: MoveGoal, progress = 0): Occupant {
  return goal === undefined
    ? { id: idOf(id), cell, progress }
    : { id: idOf(id), cell, goal, progress };
}

/** The states after each of `ticks` ticks, starting from `occupants`. */
export function runTicks(grid: Grid, occupants: readonly Occupant[], ticks: number): Occupant[][] {
  const states: Occupant[][] = [];
  let current = occupants;
  for (let tick = 0; tick < ticks; tick += 1) {
    const next = moveTick(grid, current);
    states.push(next);
    current = next;
  }
  return states;
}

function placementProblem(
  grid: Grid,
  state: readonly Occupant[],
  ids: readonly CharacterId[],
): string[] {
  const cells = state.map((one) => one.cell);
  const problems = state
    .filter((one) => !CROSSABLE.has(grid.cells[one.cell] ?? "WALL"))
    .map((one) => `character ${one.id} stands on cell ${one.cell}, which cannot be crossed`);
  if (new Set(cells).size !== cells.length) {
    problems.push(`two characters share a cell: ${cells.join(", ")}`);
  }
  if (state.map((one) => one.id).join() !== ids.join()) {
    problems.push(`the characters changed: ${state.map((one) => one.id).join()}`);
  }
  return problems;
}

/** Every broken placement in the states: impassable cells, shared cells, lost or extra ids. */
export function placementProblems(
  grid: Grid,
  initial: readonly Occupant[],
  states: readonly (readonly Occupant[])[],
): string[] {
  const ids = initial.map((one) => one.id).sort((a, b) => a - b);
  return states.flatMap((state) => placementProblem(grid, state, ids));
}

/** A random scene: a grid with some exits and up to 6 characters on distinct passable cells. */
export interface MoveScenario {
  readonly grid: Grid;
  readonly occupants: readonly Occupant[];
}

function goalArbitrary(cells: number): fc.Arbitrary<MoveGoal | undefined> {
  return fc.oneof(
    fc.constant(undefined),
    fc.integer({ min: 0, max: cells - 1 }).map((cell): MoveGoal => ({ kind: "CELL", cell })),
    fc
      .integer({ min: 0, max: 6 })
      .map((target): MoveGoal => ({ kind: "NEAR", target: idOf(target) })),
    fc.constant<MoveGoal>({ kind: "EXIT" }),
  );
}

function isBorder(grid: Grid, cell: number): boolean {
  const x = cell % grid.width;
  const y = (cell - x) / grid.width;
  return x === 0 || y === 0 || x === grid.width - 1 || y === grid.height - 1;
}

/** A random scene for the movement invariants. */
export function arbitraryMoveScenario(): fc.Arbitrary<MoveScenario> {
  return arbitraryGrid(8).chain((grid) => {
    const passable = grid.cells.flatMap((type, cell) => (CROSSABLE.has(type) ? [cell] : []));
    const border = passable.filter((cell) => isBorder(grid, cell));
    return fc
      .record({
        grid: fc
          .subarray(border)
          .map((exits) => ({ ...grid, exits: grid.cells.map((_, cell) => exits.includes(cell)) })),
        cells: fc.shuffledSubarray(passable, { maxLength: Math.min(6, passable.length) }),
        goals: fc.array(goalArbitrary(grid.cells.length), { minLength: 6, maxLength: 6 }),
        progress: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 6, maxLength: 6 }),
      })
      .map(({ grid: marked, cells, goals, progress }) => ({
        grid: marked,
        occupants: cells.map((cell, index) =>
          occupant(index, cell, goals[index], progress[index] ?? 0),
        ),
      }));
  });
}
