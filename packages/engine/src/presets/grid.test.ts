import { describe, expect, it } from "vitest";

import { gridTemplateSchema } from "./grid.ts";

/** A 5 × 5 room: walls, a 3 × 3 floor, an open door at the bottom. */
const ROOM = {
  rows: ["#####", "#...#", "#...#", "#...#", "##d##"],
  exits: [{ x: 2, y: 4 }],
  roofed: "ALL",
  starts: [
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 1, y: 3 },
    { x: 2, y: 3 },
  ],
};

const issuesOf = (template: unknown) => gridTemplateSchema.safeParse(template).error?.issues;

describe("grid templates (presets §2.1)", () => {
  it("given a well-formed template when validating then it passes unchanged", () => {
    expect(gridTemplateSchema.parse(ROOM)).toStrictEqual(ROOM);
  });

  it("given every cell character of the legend when validating then the template passes", () => {
    const template = { ...ROOM, rows: ["##=##", "#.,.#", "#...#", "#..o#", "#dD##"] };

    expect(gridTemplateSchema.parse(template)).toStrictEqual(template);
  });

  it("given a row with an unknown character when validating then the issue points to that row", () => {
    expect(
      issuesOf({ ...ROOM, rows: ["#####", "#...#", "#.x.#", "#...#", "##d##"] }),
    ).toMatchObject([{ path: ["rows", 2], message: "unknown cell character: x" }]);
  });

  it("given rows of different widths when validating then the narrow row is reported", () => {
    expect(issuesOf({ ...ROOM, rows: ["#####", "#...#", "#..#", "#...#", "##d##"] })).toMatchObject(
      [{ path: ["rows", 2], message: "row has 4 cells; the widest row has 5" }],
    );
  });

  it("given a wide row when validating then the other rows are reported against it", () => {
    expect(issuesOf({ ...ROOM, rows: ["####", "#..#", "#...#", "#..#", "#d##"] })).toMatchObject([
      { path: ["rows", 0], message: "row has 4 cells; the widest row has 5" },
      { path: ["rows", 1], message: "row has 4 cells; the widest row has 5" },
      { path: ["rows", 3], message: "row has 4 cells; the widest row has 5" },
      { path: ["rows", 4], message: "row has 4 cells; the widest row has 5" },
    ]);
  });

  it("given no rows when validating then it fails", () => {
    expect(gridTemplateSchema.safeParse({ ...ROOM, rows: [] }).success).toBe(false);
  });

  it("given an empty row when validating then it fails", () => {
    expect(gridTemplateSchema.safeParse({ ...ROOM, rows: [""] }).success).toBe(false);
  });

  it("given 48 rows of 48 cells when validating then the size passes", () => {
    const rows = Array.from({ length: 48 }, () => ".".repeat(48));
    const template = { ...ROOM, rows, exits: [{ x: 0, y: 0 }] };

    expect(gridTemplateSchema.safeParse(template).success).toBe(true);
  });

  it("given 49 rows when validating then it fails", () => {
    const rows = Array.from({ length: 49 }, () => ".".repeat(5));

    expect(gridTemplateSchema.safeParse({ ...ROOM, rows }).success).toBe(false);
  });

  it("given a row of 49 cells when validating then it fails", () => {
    const rows = Array.from({ length: 5 }, () => ".".repeat(49));

    expect(gridTemplateSchema.safeParse({ ...ROOM, rows }).success).toBe(false);
  });

  it("given no exits when validating then it fails", () => {
    expect(gridTemplateSchema.safeParse({ ...ROOM, exits: [] }).success).toBe(false);
  });

  it.each([
    [{ x: 0, y: 2 }, "not traversable: WALL"],
    [{ x: 2, y: 2 }, "not on the border"],
    [{ x: 5, y: 4 }, "outside the grid"],
    [{ x: 2, y: 5 }, "outside the grid"],
  ])("given the exit %o when validating then the issue is %s", (exit, message) => {
    expect(issuesOf({ ...ROOM, exits: [{ x: 2, y: 4 }, exit] })).toMatchObject([
      { path: ["exits", 1], message },
    ]);
  });

  it.each([
    [{ x: 0, y: 1 }, ["#####", "....#", "#...#", "#...#", "#####"]],
    [{ x: 1, y: 0 }, ["#.###", "#...#", "#...#", "#...#", "#####"]],
    [{ x: 4, y: 1 }, ["#####", "#....", "#...#", "#...#", "#####"]],
    [{ x: 1, y: 4 }, ["#####", "#...#", "#...#", "#...#", "#,###"]],
  ])("given an exit at %o on the border when validating then it passes", (exit, rows) => {
    expect(gridTemplateSchema.safeParse({ ...ROOM, rows, exits: [exit] }).success).toBe(true);
  });

  it("given a closed door as exit when validating then it passes", () => {
    const rows = ["#####", "#...#", "#...#", "#...#", "##D##"];

    expect(gridTemplateSchema.safeParse({ ...ROOM, rows }).success).toBe(true);
  });

  it("given a repeated exit when validating then the repeat is reported", () => {
    const rows = ["#####", "#...#", "#...#", "#...#", "#dd##"];
    const exits = [
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 1, y: 4 },
    ];

    expect(issuesOf({ ...ROOM, rows, exits })).toMatchObject([
      { path: ["exits", 2], message: "repeats the cell (1, 4)" },
    ]);
  });

  it("given seven starts when validating then it fails", () => {
    expect(gridTemplateSchema.safeParse({ ...ROOM, starts: ROOM.starts.slice(1) }).success).toBe(
      false,
    );
  });

  it.each([
    [{ x: 4, y: 3 }, "not traversable: WALL"],
    [{ x: 1, y: 7 }, "outside the grid"],
  ])("given the start %o when validating then the issue is %s", (start, message) => {
    expect(issuesOf({ ...ROOM, starts: [...ROOM.starts, start] })).toMatchObject([
      { path: ["starts", 8], message },
    ]);
  });

  it("given a start with a negative coordinate when validating then both the field and the cell are reported", () => {
    expect(issuesOf({ ...ROOM, starts: [...ROOM.starts, { x: -1, y: 1 }] })).toMatchObject([
      { path: ["starts", 8, "x"], message: "Too small: expected number to be >=0" },
      { path: ["starts", 8], message: "outside the grid" },
    ]);
  });

  it("given a start on the exit door when validating then it passes", () => {
    const starts = [...ROOM.starts, { x: 2, y: 4 }];

    expect(gridTemplateSchema.safeParse({ ...ROOM, starts }).success).toBe(true);
  });

  it("given a repeated start when validating then the repeat is reported", () => {
    expect(issuesOf({ ...ROOM, starts: [...ROOM.starts, { x: 3, y: 2 }] })).toMatchObject([
      { path: ["starts", 8], message: "repeats the cell (3, 2)" },
    ]);
  });

  it.each(["ALL", "NONE"])("given roofed %s when validating then it passes", (roofed) => {
    expect(gridTemplateSchema.safeParse({ ...ROOM, roofed }).success).toBe(true);
  });

  it("given a mask with the grid size when validating then it passes", () => {
    const roofed = ["rrrrr", "rrr..", ".....", ".....", "....."];

    expect(gridTemplateSchema.parse({ ...ROOM, roofed })).toStrictEqual({ ...ROOM, roofed });
  });

  it("given a mask with a missing row when validating then the mask is reported", () => {
    expect(issuesOf({ ...ROOM, roofed: ["rrrrr", ".....", ".....", "....."] })).toMatchObject([
      { path: ["roofed"], message: "mask has 4 rows; the grid has 5" },
    ]);
  });

  it("given a mask row of the wrong width when validating then that row is reported", () => {
    const roofed = ["rrrrr", ".....", "....", ".....", "....."];

    expect(issuesOf({ ...ROOM, roofed })).toMatchObject([
      { path: ["roofed", 2], message: "mask row has 4 cells; the grid has 5" },
    ]);
  });

  it("given a mask row with another character when validating then that row is reported", () => {
    const roofed = ["rrrrr", ".....", "..R..", ".....", "....."];

    expect(issuesOf({ ...ROOM, roofed })).toMatchObject([
      { path: ["roofed", 2], message: "mask cells are r (roofed) or . (open)" },
    ]);
  });

  it("given another roofed word when validating then it fails", () => {
    expect(gridTemplateSchema.safeParse({ ...ROOM, roofed: "SOME" }).success).toBe(false);
  });

  it("given an unknown field when validating then it fails", () => {
    expect(gridTemplateSchema.safeParse({ ...ROOM, doors: [] }).success).toBe(false);
  });
});
