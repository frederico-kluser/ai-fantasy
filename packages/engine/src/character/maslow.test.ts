import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { arbitraryRaisedLowDeficit, someDrives } from "../../test/support/character.ts";
import { effectiveWeight, pressureOf, suppression } from "./maslow.ts";

/** Every drive weighs 8000. */
const EVEN_WEIGHTS = {
  physical_relief: 8000,
  physical_safety: 8000,
  material_security: 8000,
  predictability: 8000,
  company: 8000,
  intimacy: 8000,
  desire: 8000,
  care: 8000,
  recognition: 8000,
  dignity: 8000,
  influence: 8000,
  curiosity: 8000,
  purpose: 8000,
  fun: 8000,
  justice: 8000,
} as const;

describe("Maslow precedence (simulation-model §5.3)", () => {
  it.each(["company", "intimacy", "recognition", "dignity", "curiosity", "justice"] as const)(
    "given physical relief deficit 7500 and lower safety deficits when computing weights then the weight of %s is halved",
    (drive) => {
      const drives = someDrives({
        weights: EVEN_WEIGHTS,
        deficits: { physical_relief: 7500, physical_safety: 3000, predictability: 2000 },
      });

      expect(effectiveWeight(drives, drive)).toBe(4000);
    },
  );

  it("given physical relief deficit 7500 when computing the weight of physical relief then nothing is below it to suppress it", () => {
    const drives = someDrives({ weights: EVEN_WEIGHTS, deficits: { physical_relief: 7500 } });

    expect(effectiveWeight(drives, "physical_relief")).toBe(8000);
  });

  it("given lower deficits of 5000 when computing a higher weight then there is no suppression", () => {
    const drives = someDrives({ weights: EVEN_WEIGHTS, deficits: { physical_relief: 5000 } });

    expect(suppression(drives, 3)).toBe(0);
  });

  it("given physical relief at 10000 when computing the weight of fun then it vanishes from the decision", () => {
    const drives = someDrives({ weights: EVEN_WEIGHTS, deficits: { physical_relief: 10000 } });

    expect(effectiveWeight(drives, "fun")).toBe(0);
  });

  it("given a directed level-3 deficit of 9000 toward one target when computing level 4 then it is suppressed by 8000", () => {
    const drives = someDrives({
      directed: {
        intimacy: [
          [2, 1000],
          [5, 9000],
        ],
      },
    });

    expect(suppression(drives, 4)).toBe(8000);
  });

  it("given a level-4 deficit when computing the suppression of level 4 then only lower levels count", () => {
    expect(suppression(someDrives({ deficits: { dignity: 10000 } }), 4)).toBe(0);
  });

  it.each([
    [5000, 0],
    [5001, 2],
    [7500, 5000],
    [10000, 10000],
  ] as const)(
    "given a value of %i when computing its pressure then it is %i",
    (value, pressure) => {
      expect(pressureOf(value)).toBe(pressure);
    },
  );

  it("given any drives when raising a low-level deficit then no higher-level effective weight rises (invariant 6)", () => {
    fc.assert(
      fc.property(arbitraryRaisedLowDeficit(), ({ before, after, higher }) => {
        expect(effectiveWeight(after, higher)).toBeLessThanOrEqual(effectiveWeight(before, higher));
      }),
    );
  });
});
