import { describe, expect, it } from "vitest";

import { cellAt, gridOf } from "../../test/support/space.ts";
import { err, ok } from "../domain/result.ts";
import { approachCell, nearestExit, withdrawCell } from "./destinations.ts";

/** A 7 × 5 room of floor. */
const ROOM = gridOf([".......", ".......", ".......", ".......", "......."]);

describe("approachCell (simulation-model §8.1)", () => {
  const target = cellAt(ROOM, 4, 2);

  it("given a target in an open room when approaching then the cheapest free cell next to it wins, ties to the lowest index", () => {
    expect(approachCell(ROOM, cellAt(ROOM, 0, 2), target, [target])).toStrictEqual(
      ok(cellAt(ROOM, 3, 1)),
    );
  });

  it("given that cell taken when approaching then the next cheapest free cell wins", () => {
    expect(
      approachCell(ROOM, cellAt(ROOM, 0, 2), target, [target, cellAt(ROOM, 3, 1)]),
    ).toStrictEqual(ok(cellAt(ROOM, 3, 2)));
  });

  it("given rough ground on a cell next to the target when approaching then entering it costs more", () => {
    const grid = gridOf([".......", "...,...", ".......", "......."]);

    expect(approachCell(grid, cellAt(grid, 0, 2), cellAt(grid, 4, 2), [])).toStrictEqual(
      ok(cellAt(grid, 3, 2)),
    );
  });

  it("given a mover already next to the target when approaching then the destination is its own cell", () => {
    const mover = cellAt(ROOM, 3, 3);

    expect(approachCell(ROOM, mover, target, [target, mover])).toStrictEqual(ok(mover));
  });

  it("given the only cell next to the target taken when approaching then that cell is still the destination, since only walls cut a path", () => {
    expect(approachCell(gridOf(["...."]), 0, 3, [2, 3])).toStrictEqual(ok(2));
  });

  it("given the cells next to the target behind a wall when approaching then there is no path", () => {
    expect(approachCell(gridOf([".#.."]), 0, 3, [3])).toStrictEqual(err("NO_PATH"));
  });

  it("given a target outside the grid when approaching then it throws a RangeError", () => {
    expect(() => approachCell(ROOM, 0, 35, [])).toThrow(
      new RangeError("cell index 35 is outside the 7 × 5 grid"),
    );
  });
});

describe("withdrawCell (simulation-model §8.1)", () => {
  const corridor = gridOf([".........."]);

  it("given room to withdraw when withdrawing then the cheapest free cell 4 or more cells away wins", () => {
    expect(withdrawCell(corridor, 3, 2, [2])).toBe(6);
  });

  it("given two such cells at the same cost when withdrawing then the lowest index wins", () => {
    const grid = gridOf([".........", ".........", "........."]);

    expect(withdrawCell(grid, cellAt(grid, 2, 1), cellAt(grid, 1, 1), [])).toBe(cellAt(grid, 5, 0));
  });

  it("given rough ground on the lowest such cell when withdrawing then a cheaper one wins", () => {
    const grid = gridOf(["....,.", "......", "......"]);

    expect(withdrawCell(grid, cellAt(grid, 1, 1), cellAt(grid, 0, 1), [])).toBe(cellAt(grid, 4, 1));
  });

  it("given no free cell 4 cells away when withdrawing then the reachable cell farthest from the target wins", () => {
    expect(withdrawCell(gridOf(["...."]), 1, 0, [0])).toBe(3);
  });

  it("given several cells equally far when withdrawing then the lowest index wins", () => {
    const grid = gridOf(["...", "...", "..."]);

    expect(withdrawCell(grid, cellAt(grid, 0, 1), cellAt(grid, 1, 1), [4])).toBe(0);
  });

  it("given a cornered mover when withdrawing then the destination is its own cell", () => {
    expect(withdrawCell(gridOf(["..."]), 2, 0, [0])).toBe(2);
  });

  it("given the far cells behind a wall when withdrawing then the farthest reachable cell wins", () => {
    expect(withdrawCell(gridOf(["..#...."]), 1, 0, [0])).toBe(1);
  });
});

describe("nearestExit (simulation-model §8.1)", () => {
  const corridor = gridOf(["......"]);

  it("given two exits when leaving then the cheapest one wins", () => {
    const grid = gridOf(["......"], { exits: [0, 5] });

    expect(nearestExit(grid, 2, [])).toStrictEqual(ok(0));
  });

  it("given two exits at the same cost when leaving then the lowest index wins", () => {
    const grid = gridOf(["....."], { exits: [0, 4] });

    expect(nearestExit(grid, 2, [])).toStrictEqual(ok(0));
  });

  it("given rough ground on the way to the nearest exit when leaving then a cheaper exit wins", () => {
    const grid = gridOf([",,...."], { exits: [0, 5] });

    expect(nearestExit(grid, 2, [])).toStrictEqual(ok(5));
  });

  it("given the nearest exit taken when leaving then the other one wins", () => {
    const grid = gridOf(["......"], { exits: [0, 5] });

    expect(nearestExit(grid, 2, [0])).toStrictEqual(ok(5));
  });

  it("given the only exit taken by someone when leaving then it is still the destination, since only walls cut a path", () => {
    const grid = gridOf(["......"], { exits: [5] });

    expect(nearestExit(grid, 2, [5])).toStrictEqual(ok(5));
  });

  it("given the only way to the exit blocked by someone when leaving then the exit is still the destination", () => {
    const grid = gridOf(["......"], { exits: [5] });

    expect(nearestExit(grid, 2, [3])).toStrictEqual(ok(5));
  });

  it("given a mover standing on an exit when leaving then the destination is its own cell", () => {
    const grid = gridOf(["......"], { exits: [0, 5] });

    expect(nearestExit(grid, 5, [5])).toStrictEqual(ok(5));
  });

  it("given every exit behind a wall when leaving then there is no path", () => {
    const grid = gridOf(["..#..."], { exits: [5] });

    expect(nearestExit(grid, 0, [])).toStrictEqual(err("NO_PATH"));
  });

  it("given a grid without exits when leaving then there is no path", () => {
    expect(nearestExit(corridor, 0, [])).toStrictEqual(err("NO_PATH"));
  });
});
