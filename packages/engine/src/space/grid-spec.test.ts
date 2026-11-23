import { describe, expect, it } from "vitest";

import { err, ok } from "../domain/result.ts";
import { MIN_GRID_STARTS, parseGridSpec, type GridSpec } from "./grid-spec.ts";

/** A 5 × 3 room: walls, floor, a closed door at the bottom; 9 passable cells. */
const SPEC: GridSpec = {
  rows: ["#...#", ".....", "##D##"],
  exits: [
    { x: 0, y: 1 },
    { x: 2, y: 2 },
  ],
  roofed: "ALL",
  starts: [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
  ],
};

const FIFTEEN_FALSE = Array.from({ length: 15 }, () => false);

/** A square of `side` rows of floor, with one exit and eight starts on the first row. */
function floorSquare(side: number): GridSpec {
  return {
    rows: Array.from({ length: side }, () => ".".repeat(side)),
    exits: [{ x: 0, y: 0 }],
    roofed: "NONE",
    starts: Array.from({ length: 8 }, (_, x) => ({ x, y: 0 })),
  };
}

describe("parseGridSpec: a valid spec (simulation-model §3.1)", () => {
  it("given a valid spec when parsing then the grid has its size, cell types and marks by index", () => {
    expect(parseGridSpec(SPEC)).toStrictEqual(
      ok({
        width: 5,
        height: 3,
        cells: [
          "WALL",
          "FLOOR",
          "FLOOR",
          "FLOOR",
          "WALL",
          "FLOOR",
          "FLOOR",
          "FLOOR",
          "FLOOR",
          "FLOOR",
          "WALL",
          "WALL",
          "DOOR_CLOSED",
          "WALL",
          "WALL",
        ],
        exits: FIFTEEN_FALSE.map((_, index) => index === 5 || index === 12),
        roofed: Array.from({ length: 15 }, () => true),
      }),
    );
  });

  it("given every symbol of the legend when parsing then each maps to its cell type", () => {
    const parsed = parseGridSpec({
      rows: [".,dD=o#.", "........"],
      exits: [{ x: 0, y: 1 }],
      roofed: "NONE",
      starts: Array.from({ length: 8 }, (_, x) => ({ x, y: 1 })),
    });

    expect(parsed).toMatchObject(
      ok({
        cells: [
          "FLOOR",
          "ROUGH",
          "DOOR_OPEN",
          "DOOR_CLOSED",
          "WINDOW",
          "LOW_OBSTACLE",
          "WALL",
          ...Array.from({ length: 9 }, () => "FLOOR"),
        ],
      }),
    );
  });

  it("given roofed NONE when parsing then no cell is roofed", () => {
    expect(parseGridSpec({ ...SPEC, roofed: "NONE" })).toMatchObject(ok({ roofed: FIFTEEN_FALSE }));
  });

  it("given a roof mask when parsing then only the cells marked r are roofed", () => {
    expect(parseGridSpec({ ...SPEC, roofed: ["rr...", "....r", "....."] })).toMatchObject(
      ok({ roofed: FIFTEEN_FALSE.map((_, index) => index <= 1 || index === 9) }),
    );
  });

  it("given a 48 × 48 spec when parsing then it is accepted", () => {
    expect(parseGridSpec(floorSquare(48))).toMatchObject(ok({ width: 48, height: 48 }));
  });

  it("given a single row when parsing then it is accepted, since a side starts at 1", () => {
    const row = {
      rows: [".".repeat(8)],
      exits: [{ x: 0, y: 0 }],
      roofed: "NONE",
      starts: Array.from({ length: 8 }, (_, x) => ({ x, y: 0 })),
    } as const;

    expect(parseGridSpec(row)).toMatchObject(ok({ width: 8, height: 1 }));
  });

  it("given a single column when parsing then it is accepted, since a side starts at 1", () => {
    const column = {
      rows: Array.from({ length: 8 }, () => "."),
      exits: [{ x: 0, y: 0 }],
      roofed: "ALL",
      starts: Array.from({ length: 8 }, (_, y) => ({ x: 0, y })),
    } as const;

    expect(parseGridSpec(column)).toMatchObject(ok({ width: 1, height: 8 }));
  });

  it("given exactly the minimum of starts when reading it then it is 8", () => {
    expect(MIN_GRID_STARTS).toBe(8);
  });
});

describe("parseGridSpec: rows (simulation-model §3.1)", () => {
  it.each([
    ["no rows", []],
    ["an empty first row", [""]],
    ["49 rows", Array.from({ length: 49 }, () => "........")],
    ["a row of 49 cells", [".".repeat(49)]],
  ])("given %s when parsing then the error is INVALID_SIZE", (_, rows) => {
    expect(parseGridSpec({ ...SPEC, rows })).toStrictEqual(err({ code: "INVALID_SIZE" }));
  });

  it("given rows of different widths when parsing then the error is RAGGED_ROWS at the first one", () => {
    expect(parseGridSpec({ ...SPEC, rows: ["#...#", "....", "##D"] })).toStrictEqual(
      err({ code: "RAGGED_ROWS", row: 1 }),
    );
  });

  it("given a symbol outside the legend when parsing then the error is UNKNOWN_CELL at its row", () => {
    expect(parseGridSpec({ ...SPEC, rows: ["#...#", "..x..", "##D##"] })).toStrictEqual(
      err({ code: "UNKNOWN_CELL", row: 1 }),
    );
  });

  it("given an unknown symbol after a valid row when parsing then the row is the first bad one", () => {
    expect(parseGridSpec({ ...SPEC, rows: ["#...#", ".....", "##X##"] })).toStrictEqual(
      err({ code: "UNKNOWN_CELL", row: 2 }),
    );
  });
});

describe("parseGridSpec: exits (simulation-model §3.1)", () => {
  it("given no exit when parsing then the error is NO_EXIT", () => {
    expect(parseGridSpec({ ...SPEC, exits: [] })).toStrictEqual(err({ code: "NO_EXIT" }));
  });

  it.each([
    ["inside the room", { x: 2, y: 1 }],
    ["on a wall of the border", { x: 0, y: 0 }],
    ["outside the grid", { x: 5, y: 1 }],
    ["at a negative column", { x: -1, y: 1 }],
    ["at a fractional column", { x: 0.5, y: 1 }],
  ])("given an exit %s when parsing then the error is INVALID_EXIT at its position", (_, exit) => {
    expect(parseGridSpec({ ...SPEC, exits: [{ x: 4, y: 1 }, exit] })).toStrictEqual(
      err({ code: "INVALID_EXIT", exit: 1 }),
    );
  });

  it.each([
    ["the left border", { x: 0, y: 1 }],
    ["the top border", { x: 2, y: 0 }],
    ["the right border", { x: 4, y: 1 }],
    ["the bottom border", { x: 2, y: 2 }],
  ])("given an exit on %s when parsing then it is accepted", (_, exit) => {
    expect(parseGridSpec({ ...SPEC, exits: [exit] })).toMatchObject({ ok: true });
  });

  it("given the same exit twice when parsing then the error is INVALID_EXIT at the repeat", () => {
    expect(
      parseGridSpec({
        ...SPEC,
        exits: [
          { x: 0, y: 1 },
          { x: 4, y: 1 },
          { x: 0, y: 1 },
        ],
      }),
    ).toStrictEqual(err({ code: "INVALID_EXIT", exit: 2 }));
  });
});

describe("parseGridSpec: roof mask (simulation-model §3.1)", () => {
  it.each([
    ["a missing row", 2, ["rrrrr", "....."]],
    ["an extra row", 3, ["rrrrr", ".....", ".....", "....."]],
    ["a short row", 1, ["rrrrr", "....", "....."]],
    ["a symbol other than r and .", 2, ["rrrrr", ".....", "..R.."]],
  ])(
    "given a mask with %s when parsing then the error is INVALID_ROOFED at row %i",
    (_, row, roofed) => {
      expect(parseGridSpec({ ...SPEC, roofed })).toStrictEqual(
        err({ code: "INVALID_ROOFED", row }),
      );
    },
  );
});

describe("parseGridSpec: starts (simulation-model §3.1)", () => {
  it("given seven starts when parsing then the error is TOO_FEW_STARTS", () => {
    expect(parseGridSpec({ ...SPEC, starts: SPEC.starts.slice(1) })).toStrictEqual(
      err({ code: "TOO_FEW_STARTS" }),
    );
  });

  it.each([
    ["on a wall", { x: 0, y: 0 }],
    ["outside the grid", { x: 1, y: 3 }],
    ["at a fractional row", { x: 1, y: 0.5 }],
    ["on a start already listed", { x: 1, y: 0 }],
  ])(
    "given a start %s when parsing then the error is INVALID_START at its position",
    (_, start) => {
      expect(parseGridSpec({ ...SPEC, starts: [...SPEC.starts, start] })).toStrictEqual(
        err({ code: "INVALID_START", start: 8 }),
      );
    },
  );

  it("given a start on the closed door when parsing then it is accepted", () => {
    expect(
      parseGridSpec({ ...SPEC, starts: [...SPEC.starts.slice(1), { x: 2, y: 2 }] }),
    ).toMatchObject({
      ok: true,
    });
  });
});

describe("parseGridSpec: order of the checks (simulation-model §3.1)", () => {
  it("given a bad exit, a bad mask and a bad start when parsing then the exit error comes first", () => {
    expect(
      parseGridSpec({ ...SPEC, exits: [{ x: 2, y: 1 }], roofed: ["r"], starts: [] }),
    ).toStrictEqual(err({ code: "INVALID_EXIT", exit: 0 }));
  });

  it("given a bad mask and a bad start when parsing then the mask error comes before the start", () => {
    expect(parseGridSpec({ ...SPEC, roofed: ["r"], starts: [] })).toStrictEqual(
      err({ code: "INVALID_ROOFED", row: 0 }),
    );
  });

  it("given a bad start and too few starts when parsing then the bad start comes first", () => {
    expect(parseGridSpec({ ...SPEC, starts: [{ x: 0, y: 0 }] })).toStrictEqual(
      err({ code: "INVALID_START", start: 0 }),
    );
  });
});
