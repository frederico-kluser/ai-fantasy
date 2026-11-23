import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  bipolarRangeSchema,
  bipolarSchema,
  bpRangeSchema,
  bpSchema,
  textListSchema,
  textSchema,
  uniqueList,
} from "./primitives.ts";

describe("preset schema primitives (presets §1, simulation-model §2)", () => {
  it.each([0, 1, 9999, 10000])(
    "given %i when validating a unipolar value then it passes",
    (value) => {
      expect(bpSchema.parse(value)).toBe(value);
    },
  );

  it.each([-1, 10001, 0.5, Number.NaN, "10"])(
    "given %s when validating a unipolar value then it fails",
    (value) => {
      expect(bpSchema.safeParse(value).success).toBe(false);
    },
  );

  it.each([-10000, -1, 0, 10000])(
    "given %i when validating a bipolar value then it passes",
    (value) => {
      expect(bipolarSchema.parse(value)).toBe(value);
    },
  );

  it.each([-10001, 10001, -0.5])(
    "given %s when validating a bipolar value then it fails",
    (value) => {
      expect(bipolarSchema.safeParse(value).success).toBe(false);
    },
  );

  it("given an empty text when validating a display name then it fails", () => {
    expect(textSchema.safeParse("").success).toBe(false);
  });

  it("given a one-letter text when validating a display name then it passes", () => {
    expect(textSchema.parse("a")).toBe("a");
  });

  it("given an empty list when validating display texts then it fails", () => {
    expect(textListSchema.safeParse([]).success).toBe(false);
  });

  it("given two texts when validating display texts then they pass", () => {
    expect(textListSchema.parse(["casa", "quarto"])).toStrictEqual(["casa", "quarto"]);
  });

  it.each([[{ min: 6000, max: 7500 }], [{ min: 5000, max: 5000 }]])(
    "given %o when validating a unipolar range then it passes",
    (range) => {
      expect(bpRangeSchema.parse(range)).toStrictEqual(range);
    },
  );

  it("given a range with min above max when validating then the issue says so", () => {
    expect(bpRangeSchema.safeParse({ min: 7501, max: 7500 }).error?.issues).toMatchObject([
      { code: "custom", path: [], message: "min is above max" },
    ]);
  });

  it("given a range with a negative bound when validating a unipolar range then it fails", () => {
    expect(bpRangeSchema.safeParse({ min: -1, max: 0 }).success).toBe(false);
  });

  it("given a range with negative bounds when validating a bipolar range then it passes", () => {
    expect(bipolarRangeSchema.parse({ min: -2000, max: -1000 })).toStrictEqual({
      min: -2000,
      max: -1000,
    });
  });

  it("given a range with an extra field when validating then it fails", () => {
    expect(bipolarRangeSchema.safeParse({ min: 0, max: 0, step: 1 }).success).toBe(false);
  });

  it("given a list without repeats when validating a unique list then it passes", () => {
    expect(uniqueList(z.string()).parse(["a", "b", "c"])).toStrictEqual(["a", "b", "c"]);
  });

  it("given a list with a repeated item when validating a unique list then the repeat is reported at its position", () => {
    expect(uniqueList(z.string()).safeParse(["a", "b", "a", "a"]).error?.issues).toMatchObject([
      { code: "custom", path: [2], message: "a is repeated" },
      { code: "custom", path: [3], message: "a is repeated" },
    ]);
  });
});
