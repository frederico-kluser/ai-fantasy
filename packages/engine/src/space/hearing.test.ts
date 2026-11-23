import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  arbitraryTwoCells,
  arbitraryWallBetween,
  cellAt,
  gridOf,
  idOf,
} from "../../test/support/space.ts";
import { cellDistance } from "./grid.ts";
import { earshot, hearers, openRange, voiceRange, type Voice } from "./hearing.ts";

const QUIET_NORMAL: Voice = { volume: "NORMAL", noise: 0 };
const WHISPER: Voice = { volume: "WHISPER", noise: 0 };
const SHOUT: Voice = { volume: "SHOUT", noise: 0 };

/** A corridor of 40 cells of floor. */
const CORRIDOR = gridOf([".".repeat(40)]);

describe("openRange (simulation-model §8.2)", () => {
  it("given noise 8000 when computing normal speech range then the range is 4", () => {
    expect(openRange({ volume: "NORMAL", noise: 8000 })).toBe(4);
  });

  it.each([
    [0, 8],
    [1999, 8],
    [2000, 7],
    [6000, 5],
    [9999, 4],
    [10000, 3],
  ])("given noise %i when computing normal speech range then it is %i", (noise, range) => {
    expect(openRange({ volume: "NORMAL", noise })).toBe(range);
  });

  it.each([
    ["WHISPER", 1],
    ["SHOUT", 30],
  ] as const)(
    "given a %s in the loudest place when computing its range then noise changes nothing: %i",
    (volume, range) => {
      expect(openRange({ volume, noise: 10000 })).toBe(range);
    },
  );

  it.each([-1, 10001, 0.5])(
    "given noise %d when computing a range then it throws a RangeError",
    (noise) => {
      expect(() => openRange({ volume: "NORMAL", noise })).toThrow(
        new RangeError(`noise must be an integer in 0..10000 bp, got ${noise}`),
      );
    },
  );
});

describe("voiceRange: walls, doors and windows between (simulation-model §8.2)", () => {
  it("given a shout behind a wall when computing range then it is halved", () => {
    expect(voiceRange(gridOf([".#."]), SHOUT, 0, 2)).toBe(15);
  });

  it("given a shout behind two walls when computing range then it is halved once", () => {
    expect(voiceRange(gridOf([".##."]), SHOUT, 0, 3)).toBe(15);
  });

  it.each([
    ["a closed door", ".D."],
    ["a window", ".=."],
  ])("given a shout through %s when computing range then it is whole", (_, row) => {
    expect(voiceRange(gridOf([row]), SHOUT, 0, 2)).toBe(30);
  });

  it.each([
    ["a wall", 0, ".#."],
    ["a closed door", 0, ".D."],
    ["a window", 4, ".=."],
    ["two windows", 4, ".==."],
    ["a window and a wall", 0, ".=#."],
    ["an open door", 8, ".d."],
    ["a low obstacle", 8, ".o."],
    ["rough ground", 8, ".,."],
  ])("given normal speech through %s when computing range then it is %i", (_, range, row) => {
    expect(voiceRange(gridOf([row]), QUIET_NORMAL, 0, row.length - 1)).toBe(range);
  });

  it.each([
    ["a wall", 0, ".#"],
    ["a closed door", 0, ".D"],
    ["a window", 1, ".="],
  ])(
    "given a whisper past a corner with %s beside it when computing range then it is %i",
    (_, range, top) => {
      const grid = gridOf([top, ".."]);

      expect(voiceRange(grid, WHISPER, cellAt(grid, 0, 0), cellAt(grid, 1, 1))).toBe(range);
    },
  );

  it("given a speaker standing on a closed door when computing range then the endpoints do not block", () => {
    expect(voiceRange(gridOf(["D.."]), QUIET_NORMAL, 0, 2)).toBe(8);
  });
});

describe("earshot (simulation-model §8.2)", () => {
  it.each([
    [8, "DIRECT"],
    [9, "FRAGMENT_RANGE"],
    [16, "FRAGMENT_RANGE"],
    [17, "OUT_OF_RANGE"],
  ])(
    "given a listener %i cells away from quiet normal speech when hearing then it is %s",
    (distance, heard) => {
      expect(earshot(CORRIDOR, QUIET_NORMAL, 0, distance)).toBe(heard);
    },
  );

  it("given a listener right behind a wall when hearing normal speech then it is out of range", () => {
    expect(earshot(gridOf([".#."]), QUIET_NORMAL, 0, 2)).toBe("OUT_OF_RANGE");
  });

  it("given a listener 20 cells behind a wall when hearing a shout then it is a fragment candidate", () => {
    const grid = gridOf([`.#${".".repeat(19)}`]);

    expect(earshot(grid, SHOUT, 0, 20)).toBe("FRAGMENT_RANGE");
  });
});

describe("hearers (simulation-model §8.2)", () => {
  it("given a whisper when computing hearers then only cells at distance 1 hear it directly", () => {
    const listeners = [
      { id: idOf(1), cell: 1 },
      { id: idOf(2), cell: 2 },
      { id: idOf(3), cell: 3 },
    ];

    expect(hearers(CORRIDOR, WHISPER, 0, listeners)).toStrictEqual([
      { id: idOf(1), earshot: "DIRECT" },
      { id: idOf(2), earshot: "FRAGMENT_RANGE" },
      { id: idOf(3), earshot: "OUT_OF_RANGE" },
    ]);
  });

  it("given listeners out of id order when computing hearers then the result is sorted by id", () => {
    const listeners = [
      { id: idOf(7), cell: 30 },
      { id: idOf(2), cell: 5 },
    ];

    expect(hearers(CORRIDOR, QUIET_NORMAL, 0, listeners)).toStrictEqual([
      { id: idOf(2), earshot: "DIRECT" },
      { id: idOf(7), earshot: "OUT_OF_RANGE" },
    ]);
  });
});

describe("hearing invariants (simulation-model §18, invariant 5)", () => {
  it("given any grid and two cells more than 1 apart when whispering then the listener never hears it directly", () => {
    fc.assert(
      fc.property(arbitraryTwoCells(12), ({ grid, from, to }) => {
        fc.pre(cellDistance(grid, from, to) > 1);

        expect(earshot(grid, WHISPER, from, to)).not.toBe("DIRECT");
      }),
    );
  });

  it("given a full wall between speaker and listener when speaking normally then nobody hears, not even a fragment", () => {
    fc.assert(
      fc.property(
        arbitraryWallBetween(),
        fc.integer({ min: 0, max: 10000 }),
        ({ grid, from, to }, noise) => {
          expect(earshot(grid, { volume: "NORMAL", noise }, from, to)).toBe("OUT_OF_RANGE");
        },
      ),
    );
  });

  it("given any grid and two cells when hearing both ways then the earshot is the same", () => {
    fc.assert(
      fc.property(
        arbitraryTwoCells(12),
        fc.constantFrom(WHISPER, QUIET_NORMAL, SHOUT),
        ({ grid, from, to }, voice) => {
          expect(earshot(grid, voice, from, to)).toBe(earshot(grid, voice, to, from));
        },
      ),
    );
  });
});
