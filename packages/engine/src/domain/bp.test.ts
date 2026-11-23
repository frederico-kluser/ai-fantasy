import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { BIPOLAR_MIN, BP_MAX, toBipolarBp, toBp } from "./bp.ts";
import { mulBp } from "./math.ts";

describe("bp scales (simulation-model §2)", () => {
  it("given the scale constants when reading them then BP_MAX is 10000 and BIPOLAR_MIN is -10000", () => {
    expect([BP_MAX, BIPOLAR_MIN]).toStrictEqual([10000, -10000]);
  });

  it.each([
    [-1, 0],
    [0, 0],
    [4200, 4200],
    [10000, 10000],
    [10001, 10000],
  ])("given %i when converting to Bp then the value is %i", (value, bp) => {
    expect(toBp(value)).toBe(bp);
  });

  it.each([
    [-10001, -10000],
    [-10000, -10000],
    [-1, -1],
    [10000, 10000],
    [10001, 10000],
  ])("given %i when converting to BipolarBp then the value is %i", (value, bp) => {
    expect(toBipolarBp(value)).toBe(bp);
  });

  it.each([toBp, toBipolarBp])(
    "given a non-integer when converting with %o then a RangeError is thrown",
    (convert) => {
      expect(() => convert(0.5)).toThrow(/^expected a safe integer, got 0\.5$/);
    },
  );

  it("given bp values at the limits when applying mulBp and clamp then results stay within range", () => {
    expect([
      toBp(mulBp(BP_MAX, BP_MAX)),
      toBp(mulBp(BP_MAX, 15000)),
      toBp(mulBp(0, BP_MAX)),
      toBipolarBp(mulBp(BIPOLAR_MIN, 15000)),
      toBipolarBp(mulBp(BIPOLAR_MIN, BIPOLAR_MIN)),
    ]).toStrictEqual([10000, 10000, 0, -10000, 10000]);
  });

  it("given any bipolar values when applying mulBp and clamp then the result stays within range", () => {
    const bipolar = fc.integer({ min: BIPOLAR_MIN, max: BP_MAX });
    fc.assert(
      fc.property(bipolar, bipolar, (a, b) => {
        const product = toBipolarBp(mulBp(a, b));
        expect(product).toBeGreaterThanOrEqual(BIPOLAR_MIN);
        expect(product).toBeLessThanOrEqual(BP_MAX);
      }),
    );
  });
});
