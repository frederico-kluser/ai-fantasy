import { describe, expect, it } from "vitest";

import { fogRange, lightLevel, visionRange, type LightInput } from "./light.ts";

/** An unlit place without the dark tag and without a storm over it. */
const PLAIN: Omit<LightInput, "phase"> = { lit: false, dark: false, stormOverExposed: false };

describe("lightLevel (simulation-model §3.2)", () => {
  it.each([
    ["MORNING", "DAY"],
    ["AFTERNOON", "DAY"],
    ["EVENING", "DIM"],
    ["LATE_NIGHT", "DARK"],
    ["DAWN", "DARK"],
  ] as const)("given %s in a plain place when computing light then it is %s", (phase, light) => {
    expect(lightLevel({ ...PLAIN, phase })).toBe(light);
  });

  it("given the evening in a lit place when computing light then it is DIM", () => {
    expect(lightLevel({ ...PLAIN, phase: "EVENING", lit: true })).toBe("DIM");
  });

  it("given late night in a lit place when computing light then it stays DIM", () => {
    expect(lightLevel({ ...PLAIN, phase: "LATE_NIGHT", lit: true })).toBe("DIM");
  });

  it("given late night in a lit place with the dark tag when computing light then it is DARK", () => {
    expect(lightLevel({ ...PLAIN, phase: "LATE_NIGHT", lit: true, dark: true })).toBe("DARK");
  });

  it("given the morning in a lit place when computing light then lit changes nothing", () => {
    expect(lightLevel({ ...PLAIN, phase: "MORNING", lit: true })).toBe("DAY");
  });

  it("given the morning with the dark tag when computing light then it is one level darker", () => {
    expect(lightLevel({ ...PLAIN, phase: "MORNING", dark: true })).toBe("DIM");
  });

  it("given the morning with a storm over an exposed place when computing light then it is DIM", () => {
    expect(lightLevel({ ...PLAIN, phase: "MORNING", stormOverExposed: true })).toBe("DIM");
  });

  it("given the morning with the dark tag and a storm when computing light then it is DARK", () => {
    expect(lightLevel({ ...PLAIN, phase: "MORNING", dark: true, stormOverExposed: true })).toBe(
      "DARK",
    );
  });

  it("given the evening with a storm over an exposed place when computing light then it is DARK", () => {
    expect(lightLevel({ ...PLAIN, phase: "EVENING", stormOverExposed: true })).toBe("DARK");
  });

  it("given the dawn with the dark tag and a storm when computing light then it stays DARK", () => {
    expect(lightLevel({ ...PLAIN, phase: "DAWN", dark: true, stormOverExposed: true })).toBe(
      "DARK",
    );
  });
});

describe("visionRange (simulation-model §3.2)", () => {
  it.each([
    ["DAY", 20],
    ["DIM", 8],
    ["DARK", 3],
  ] as const)(
    "given %s light without fog when computing vision then the range is %i",
    (light, range) => {
      expect(visionRange(light, false)).toBe(range);
    },
  );

  it.each([
    ["DAY", 10],
    ["DIM", 4],
    ["DARK", 1],
  ] as const)(
    "given fog in an exposed place and %s light when computing vision then the range is halved to %i",
    (light, range) => {
      expect(visionRange(light, true)).toBe(range);
    },
  );
});

describe("fogRange (simulation-model §3.2)", () => {
  it.each([
    [20, 10],
    [3, 1],
    [1, 1],
  ])("given a range of %i when halving it for fog then it is %i (minimum 1)", (range, halved) => {
    expect(fogRange(range)).toBe(halved);
  });
});
