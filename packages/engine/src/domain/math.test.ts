import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { approach, BP_SCALE, clampInt, div, mulBp, relax } from "./math.ts";

const NOT_SAFE_INTEGERS = [1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1];

describe("div (simulation-model §2)", () => {
  it("given a negative numerator when dividing then div truncates toward zero", () => {
    expect(div(-7, 2)).toBe(-3);
  });

  it.each([
    [7, -2, -3],
    [-7, -2, 3],
    [7, 2, 3],
    [6, 3, 2],
    [0, 5, 0],
    [-9999, 10000, 0],
  ])(
    "given %i divided by %i when dividing then div truncates toward zero to %i",
    (a, b, quotient) => {
      expect(div(a, b)).toBe(quotient);
    },
  );

  it("given a quotient of negative zero when dividing then div returns zero", () => {
    // toBe compares with Object.is, so -0 would not match 0.
    expect(div(-1, 2)).toBe(0);
  });

  it("given a zero divisor when dividing then div throws a RangeError", () => {
    expect(() => div(1, 0)).toThrow(new RangeError("div: division by zero"));
  });

  it.each(NOT_SAFE_INTEGERS)(
    "given %d as numerator when dividing then div throws a RangeError",
    (value) => {
      expect(() => div(value, 2)).toThrow(
        new RangeError(`expected a safe integer, got ${String(value)}`),
      );
    },
  );

  it.each(NOT_SAFE_INTEGERS)(
    "given %d as divisor when dividing then div throws a RangeError",
    (value) => {
      expect(() => div(2, value)).toThrow(
        new RangeError(`expected a safe integer, got ${String(value)}`),
      );
    },
  );

  it("given safe integers when dividing then a equals div(a, b) times b plus the remainder", () => {
    fc.assert(
      fc.property(
        fc.maxSafeInteger(),
        fc.maxSafeInteger().filter((b) => b !== 0),
        (a, b) => {
          expect(div(a, b) * b + (a % b)).toBe(a);
        },
      ),
    );
  });
});

describe("clampInt (simulation-model §2)", () => {
  it.each([
    [-1, 0],
    [0, 0],
    [5, 5],
    [10, 10],
    [11, 10],
  ])("given %i when clamping to 0..10 then the result is %i", (value, clamped) => {
    expect(clampInt(value, 0, 10)).toBe(clamped);
  });

  it("given negative zero when clamping then clampInt returns zero", () => {
    // toBe compares with Object.is, so -0 would not match 0.
    expect(clampInt(-0, -5, 5)).toBe(0);
  });

  it("given an empty range when clamping then clampInt throws a RangeError", () => {
    expect(() => clampInt(0, 1, 0)).toThrow(new RangeError("clampInt: empty range 1..0"));
  });

  it("given a range of one value when clamping then clampInt returns that value", () => {
    expect(clampInt(-3, 4, 4)).toBe(4);
  });

  it.each([
    [1.5, 0, 10],
    [Number.POSITIVE_INFINITY, 0, 10],
    [5, 0.5, 10],
    [5, 0, 10.5],
  ])(
    "given %d clamped to %d..%d when clamping then clampInt throws a RangeError",
    (value, min, max) => {
      expect(() => clampInt(value, min, max)).toThrow(/^expected a safe integer, got /);
    },
  );
});

describe("mulBp (simulation-model §2)", () => {
  it.each([
    [10000, 10000, 10000],
    [5000, 15000, 7500],
    [3333, 3, 0],
    [-5000, 15000, -7500],
    [-10000, 10000, -10000],
    [7, 9999, 6],
  ])("given %i and %i when multiplying then mulBp is %i", (a, b, product) => {
    expect(mulBp(a, b)).toBe(product);
  });

  it("given a product beyond the safe integers when multiplying then mulBp throws a RangeError", () => {
    expect(() => mulBp(2 ** 40, 2 ** 20)).toThrow(/^expected a safe integer, got /);
  });

  it("given the bp scale when reading it then 1.0 is 10000 bp", () => {
    expect(BP_SCALE).toBe(10000);
  });
});

describe("approach (simulation-model §2)", () => {
  it.each([
    [0, 10000, 5000, 5000],
    [10000, 0, 2500, 7500],
    [100, 200, 10000, 200],
    [100, 200, 0, 100],
    [0, -3, 5000, -1],
    [0, 3, 5000, 1],
  ])(
    "given %i moving to %i at rate %i when approaching then the value is %i",
    (value, target, rate, result) => {
      expect(approach(value, target, rate)).toBe(result);
    },
  );

  it("given a non-integer value when approaching then a RangeError is thrown", () => {
    expect(() => approach(0.5, 0.5, 5000)).toThrow(/^expected a safe integer, got 0\.5$/);
  });
});

describe("relax (simulation-model §2)", () => {
  it.each([
    [10000, 0, 9900, 9900],
    [-10000, 0, 9900, -9900],
    [5, 0, 9900, 4],
    [700, 200, 0, 200],
    [700, 200, 10000, 700],
    [-5, 0, 9900, -4],
  ])(
    "given %i relaxing to %i at rate %i when relaxing then the value is %i",
    (value, base, rate, result) => {
      expect(relax(value, base, rate)).toBe(result);
    },
  );

  it("given a non-integer base when relaxing then a RangeError is thrown", () => {
    expect(() => relax(0.5, 0.5, 9900)).toThrow(/^expected a safe integer, got 0\.5$/);
  });
});

describe("integer arguments of the bp helpers (simulation-model §2)", () => {
  // Each case would return an integer if only the product or the result were checked.
  it.each([
    ["mulBp(0.5, 20000)", 0.5, () => mulBp(0.5, 20000)],
    ["mulBp(20000, 0.5)", 0.5, () => mulBp(20000, 0.5)],
    ["approach(1, 1.5, 2)", 1.5, () => approach(1, 1.5, 2)],
    ["approach(0, 2, 0.5)", 0.5, () => approach(0, 2, 0.5)],
    ["relax(0.5, 0, 2)", 0.5, () => relax(0.5, 0, 2)],
    ["relax(3, 1, 0.5)", 0.5, () => relax(3, 1, 0.5)],
  ])(
    "given the non-integer argument of %s when computing then a RangeError is thrown",
    (_, argument, compute) => {
      expect(compute).toThrow(new RangeError(`expected a safe integer, got ${String(argument)}`));
    },
  );

  it.each([
    ["approach", () => approach(Number.MAX_SAFE_INTEGER - 9, Number.MAX_SAFE_INTEGER, 20000)],
    ["relax", () => relax(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 9, 20000)],
  ])(
    "given a %s result beyond the safe integers when computing then a RangeError is thrown",
    (_, compute) => {
      expect(compute).toThrow(new RangeError("expected a safe integer, got 9007199254741000"));
    },
  );
});
