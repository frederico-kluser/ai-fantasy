import { describe, expect, it } from "vitest";

import { aLabel, defaultRules, ids } from "../../test/support/acts.ts";
import { openGrid } from "../../test/support/context.ts";
import { gridOf, idOf } from "../../test/support/space.ts";
import type { ActId } from "../presets/acts.ts";
import type { Grid } from "../space/grid.ts";
import type { ActLabel } from "./label.ts";
import { movementOf, type MovementInput } from "./movement.ts";
import { actTicks } from "./rules.ts";

const NO_TOPIC = { type: "NONE" } as const;

/** Author 1 at `from` on `grid`, with characters 2, 3… at the cells `others`. */
function moving(
  label: ActLabel,
  grid: Grid,
  from: number,
  others: readonly number[] = [],
): MovementInput {
  const placed = others.map((cell, index) => ({ id: idOf(index + 2), cell }));
  return { grid, label, from, leaving: false, others: placed };
}

/** A corridor with an exit at each end (cells 0 and 6). */
const CORRIDOR = gridOf(["......."], { exits: [0, 6] });

describe("movementOf (simulation-model §8.1)", () => {
  it("given a LEAVE act when resolving then it costs 1 tick and sets the nearest reachable exit as destination", () => {
    const leave = aLabel({ act: "LEAVE", topic: NO_TOPIC });

    expect(actTicks(defaultRules(), leave)).toBe(1);
    expect(movementOf(moving(leave, CORRIDOR, 4))).toStrictEqual({
      kind: "GOAL",
      goal: { kind: "EXIT" },
      destination: 6,
    });
  });

  it("given a LEAVE with walls between the author and every exit when resolving then the leave is cancelled", () => {
    const walled = gridOf(["..#.."], { exits: [0] });
    const leave = aLabel({ act: "LEAVE", topic: NO_TOPIC });

    expect(movementOf(moving(leave, walled, 4))).toStrictEqual({ kind: "CANCELLED" });
  });

  it("given a FAREWELL of someone leaving when resolving then it heads for the nearest exit", () => {
    const farewell = aLabel({ act: "FAREWELL", targets: "GROUP" });

    expect(movementOf({ ...moving(farewell, CORRIDOR, 2), leaving: true })).toStrictEqual({
      kind: "GOAL",
      goal: { kind: "EXIT" },
      destination: 0,
    });
  });

  it("given a FAREWELL of someone staying when resolving then nobody moves", () => {
    const farewell = aLabel({ act: "FAREWELL", targets: "GROUP" });

    expect(movementOf(moving(farewell, CORRIDOR, 2))).toStrictEqual({ kind: "STAY" });
  });

  it("given a MOVE to a reachable cell when resolving then the cell is the goal", () => {
    const move = aLabel({ act: "MOVE", topic: NO_TOPIC, destination: 5 });

    expect(movementOf(moving(move, CORRIDOR, 1))).toStrictEqual({
      kind: "GOAL",
      goal: { kind: "CELL", cell: 5 },
      destination: 5,
    });
  });

  it("given a MOVE beyond a wall when resolving then the act happens but nobody moves", () => {
    const move = aLabel({ act: "MOVE", topic: NO_TOPIC, destination: 4 });

    expect(movementOf(moving(move, gridOf(["..#.."]), 0))).toStrictEqual({ kind: "STAY" });
  });

  it("given an APPROACH when resolving then the goal is next to the target, recomputed each tick", () => {
    const approach = aLabel({ act: "APPROACH", targets: ids(2), topic: NO_TOPIC });

    expect(movementOf(moving(approach, CORRIDOR, 0, [5]))).toStrictEqual({
      kind: "GOAL",
      goal: { kind: "NEAR", target: 2 },
      destination: 4,
    });
  });

  it("given an APPROACH to someone walled off when resolving then nobody moves", () => {
    const approach = aLabel({ act: "APPROACH", targets: ids(2), topic: NO_TOPIC });

    expect(movementOf(moving(approach, gridOf(["..#.."]), 0, [4]))).toStrictEqual({ kind: "STAY" });
  });

  it("given a WITHDRAW when resolving then the goal is the nearest cell 4 or more away from the target", () => {
    const withdraw = aLabel({ act: "WITHDRAW", targets: ids(2), topic: NO_TOPIC });

    expect(movementOf(moving(withdraw, openGrid(10), 1, [0]))).toStrictEqual({
      kind: "GOAL",
      goal: { kind: "CELL", cell: 4 },
      destination: 4,
    });
  });

  it.each<ActId>(["CHAT", "TOUCH", "STAY_SILENT"])(
    "given a %s when resolving then nobody moves",
    (act) => {
      expect(movementOf(moving(aLabel({ act, targets: ids(2) }), CORRIDOR, 1, [2]))).toStrictEqual({
        kind: "STAY",
      });
    },
  );
});
