import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  arbitraryMoveScenario,
  occupant,
  placementProblems,
  runTicks,
} from "../../test/support/movement.ts";
import { gridOf, idOf } from "../../test/support/space.ts";
import { hasLineOfSight } from "./sight.ts";
import { moveTick } from "./movement.ts";

/** A corridor of 6 cells of floor. */
const CORRIDOR = gridOf(["......"]);

describe("moveTick: one cell per tick (simulation-model §8.1)", () => {
  it("given a mover with a cell goal on floor when a tick passes then it moves one cell along the path", () => {
    expect(moveTick(CORRIDOR, [occupant(1, 0, { kind: "CELL", cell: 4 })])).toStrictEqual([
      occupant(1, 1, { kind: "CELL", cell: 4 }),
    ]);
  });

  it("given a closed door on the path when moving through it then it costs 2 ticks and the door stays closed", () => {
    const grid = gridOf([".D.."]);
    const goal = { kind: "CELL", cell: 3 } as const;

    expect(runTicks(grid, [occupant(1, 0, goal)], 2)).toStrictEqual([
      [occupant(1, 0, goal, 1)],
      [occupant(1, 1, goal)],
    ]);
    expect(hasLineOfSight(grid, 0, 2)).toBe(false);
  });

  it("given rough ground on the path when moving into it then it takes 2 ticks", () => {
    const grid = gridOf([".,.."]);
    const goal = { kind: "CELL", cell: 3 } as const;

    expect(runTicks(grid, [occupant(1, 0, goal)], 3)).toStrictEqual([
      [occupant(1, 0, goal, 1)],
      [occupant(1, 1, goal)],
      [occupant(1, 2, goal)],
    ]);
  });

  it("given effort already spent when the next cell takes 1 tick then the mover enters it", () => {
    expect(moveTick(CORRIDOR, [occupant(1, 0, { kind: "CELL", cell: 4 }, 1)])).toStrictEqual([
      occupant(1, 1, { kind: "CELL", cell: 4 }),
    ]);
  });

  it("given a mover reaching its cell goal when the tick ends then the goal is done", () => {
    expect(moveTick(CORRIDOR, [occupant(1, 3, { kind: "CELL", cell: 4 })])).toStrictEqual([
      occupant(1, 4),
    ]);
  });

  it("given a mover whose goal is its own cell when a tick passes then the goal ends without moving", () => {
    expect(moveTick(CORRIDOR, [occupant(1, 2, { kind: "CELL", cell: 2 }, 1)])).toStrictEqual([
      occupant(1, 2),
    ]);
  });

  it("given characters without goals when a tick passes then nobody moves", () => {
    expect(moveTick(CORRIDOR, [occupant(1, 0), occupant(2, 3)])).toStrictEqual([
      occupant(1, 0),
      occupant(2, 3),
    ]);
  });
});

describe("moveTick: waiting and order (simulation-model §8.1)", () => {
  it("given an occupied next cell when moving then the character waits that tick", () => {
    const goal = { kind: "CELL", cell: 4 } as const;

    expect(moveTick(CORRIDOR, [occupant(1, 0, goal), occupant(2, 1)])).toStrictEqual([
      occupant(1, 0, goal),
      occupant(2, 1),
    ]);
  });

  it("given effort spent on a door that someone else takes when a tick passes then the effort is lost", () => {
    const grid = gridOf([".D..."]);
    const goal = { kind: "CELL", cell: 4 } as const;

    expect(moveTick(grid, [occupant(1, 0, goal, 1), occupant(2, 1)])).toStrictEqual([
      occupant(1, 0, goal),
      occupant(2, 1),
    ]);
  });

  it("given someone in the way in a room when moving then the mover steps around", () => {
    const room = gridOf(["...", "..."]);
    const goal = { kind: "CELL", cell: 2 } as const;

    expect(moveTick(room, [occupant(1, 0, goal), occupant(2, 1)])).toStrictEqual([
      occupant(1, 4, goal),
      occupant(2, 1),
    ]);
  });

  it("given two movers heading for the same free cell when a tick passes then the lower id takes it and the other waits", () => {
    const goal = { kind: "CELL", cell: 1 } as const;

    expect(moveTick(gridOf(["..."]), [occupant(2, 2, goal), occupant(1, 0, goal)])).toStrictEqual([
      occupant(1, 1),
      occupant(2, 2, goal),
    ]);
  });

  it("given a follower with a higher id when both move then it steps into the cell just left", () => {
    const goal = { kind: "CELL", cell: 5 } as const;

    expect(moveTick(CORRIDOR, [occupant(1, 1, goal), occupant(2, 0, goal)])).toStrictEqual([
      occupant(1, 2, goal),
      occupant(2, 1, goal),
    ]);
  });

  it("given a follower with a lower id when both move then it waits, since it moves first", () => {
    const goal = { kind: "CELL", cell: 5 } as const;

    expect(moveTick(CORRIDOR, [occupant(2, 1, goal), occupant(1, 0, goal)])).toStrictEqual([
      occupant(1, 0, goal),
      occupant(2, 2, goal),
    ]);
  });
});

describe("moveTick: approach, recomputed every tick (simulation-model §8.1)", () => {
  const near = (target: number) => ({ kind: "NEAR", target: idOf(target) }) as const;

  it("given an approach when a tick passes then the mover steps toward the cell next to the target", () => {
    expect(moveTick(CORRIDOR, [occupant(1, 0, near(2)), occupant(2, 4)])).toStrictEqual([
      occupant(1, 1, near(2)),
      occupant(2, 4),
    ]);
  });

  it("given an approach that reaches the cell next to the target when the tick ends then the goal is done", () => {
    expect(moveTick(CORRIDOR, [occupant(1, 2, near(2)), occupant(2, 4)])).toStrictEqual([
      occupant(1, 3),
      occupant(2, 4),
    ]);
  });

  it("given an approach to someone already next to the mover when a tick passes then the goal ends without moving", () => {
    expect(moveTick(CORRIDOR, [occupant(1, 2, near(2)), occupant(2, 3)])).toStrictEqual([
      occupant(1, 2),
      occupant(2, 3),
    ]);
  });

  it("given a target walking toward the mover when ticks pass then the approach follows it and ends next to it", () => {
    expect(
      runTicks(CORRIDOR, [occupant(1, 0, near(2)), occupant(2, 4, { kind: "CELL", cell: 2 })], 2),
    ).toStrictEqual([
      [occupant(1, 1, near(2)), occupant(2, 3, { kind: "CELL", cell: 2 })],
      [occupant(1, 2), occupant(2, 3, { kind: "CELL", cell: 2 })],
    ]);
  });

  it("given an approach whose target left the slice when a tick passes then the goal ends without moving", () => {
    expect(moveTick(CORRIDOR, [occupant(1, 0, near(9))])).toStrictEqual([occupant(1, 0)]);
  });

  it("given a target with a lower id that steps next to the mover in the same tick when the mover's turn comes then the approach ends at once", () => {
    expect(
      moveTick(CORRIDOR, [occupant(2, 0, near(1)), occupant(1, 2, { kind: "CELL", cell: 1 })]),
    ).toStrictEqual([occupant(1, 1), occupant(2, 0)]);
  });

  it("given every cell next to the target taken when ticks pass then the mover walks up and waits in line", () => {
    expect(
      runTicks(gridOf(["...."]), [occupant(1, 0, near(3)), occupant(2, 2), occupant(3, 3)], 2),
    ).toStrictEqual([
      [occupant(1, 1, near(3)), occupant(2, 2), occupant(3, 3)],
      [occupant(1, 1, near(3)), occupant(2, 2), occupant(3, 3)],
    ]);
  });
});

describe("moveTick: leaving, recomputed every tick (simulation-model §8.1)", () => {
  const leaving = { kind: "EXIT" } as const;

  it("given a character leaving when a tick passes then it steps toward the nearest exit", () => {
    const grid = gridOf(["......"], { exits: [5] });

    expect(moveTick(grid, [occupant(1, 2, leaving)])).toStrictEqual([occupant(1, 3, leaving)]);
  });

  it("given a character leaving that reaches an exit when the tick ends then the goal is done on the exit", () => {
    const grid = gridOf(["......"], { exits: [5] });

    expect(moveTick(grid, [occupant(1, 4, leaving)])).toStrictEqual([occupant(1, 5)]);
  });

  it("given a character leaving that stands on an exit when a tick passes then the goal ends without moving", () => {
    const grid = gridOf(["......"], { exits: [5] });

    expect(moveTick(grid, [occupant(1, 5, leaving)])).toStrictEqual([occupant(1, 5)]);
  });

  it("given the nearest exit taken when a tick passes then the character heads for another one", () => {
    const grid = gridOf(["......"], { exits: [0, 5] });

    expect(moveTick(grid, [occupant(1, 1, leaving), occupant(2, 0)])).toStrictEqual([
      occupant(1, 2, leaving),
      occupant(2, 0),
    ]);
  });

  it("given two characters leaving in line through a corridor when a tick passes then both advance", () => {
    const grid = gridOf(["......"], { exits: [5] });

    expect(moveTick(grid, [occupant(1, 3, leaving), occupant(2, 2, leaving)])).toStrictEqual([
      occupant(1, 4, leaving),
      occupant(2, 3, leaving),
    ]);
  });

  it("given no reachable exit when a tick passes then the character waits", () => {
    const grid = gridOf(["..#..."], { exits: [5] });

    expect(moveTick(grid, [occupant(1, 0, leaving)])).toStrictEqual([occupant(1, 0, leaving)]);
  });
});

describe("moveTick: broken placements are programming errors (simulation-model §18)", () => {
  it("given two characters on one cell when moving then it throws a RangeError", () => {
    expect(() => moveTick(CORRIDOR, [occupant(1, 2), occupant(2, 2)])).toThrow(
      new RangeError("two characters stand on cell 2"),
    );
  });

  it("given a character on a wall when moving then it throws a RangeError", () => {
    expect(() => moveTick(gridOf([".#."]), [occupant(1, 1)])).toThrow(
      new RangeError("character 1 stands on cell 1, a WALL"),
    );
  });

  it("given the same character twice when moving then it throws a RangeError", () => {
    expect(() => moveTick(CORRIDOR, [occupant(1, 0), occupant(1, 3)])).toThrow(
      new RangeError("character 1 is listed twice"),
    );
  });

  it("given a character outside the grid when moving then it throws a RangeError", () => {
    expect(() => moveTick(CORRIDOR, [occupant(1, 6)])).toThrow(
      new RangeError("cell index 6 is outside the 6 × 1 grid"),
    );
  });
});

describe("moveTick: invariant 11 (simulation-model §18)", () => {
  it("given any scene when ticks pass then nobody stands on a cell that cannot be crossed or shares a cell", () => {
    fc.assert(
      fc.property(arbitraryMoveScenario(), ({ grid, occupants }) => {
        expect(placementProblems(grid, occupants, runTicks(grid, occupants, 12))).toStrictEqual([]);
      }),
    );
  });
});
