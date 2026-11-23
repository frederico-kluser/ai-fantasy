import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { toBp } from "../domain/bp.ts";
import { aPresence, arbitraryTrustedPresence, someThreat } from "../../test/support/context.ts";
import { presenceThreat, proximity, threatLevel } from "./threat.ts";

describe("proximity (simulation-model §6)", () => {
  it.each([
    [0, 10000],
    [1, 10000],
    [2, 7000],
    [3, 7000],
    [4, 4000],
    [6, 4000],
    [7, 2000],
    [12, 2000],
    [13, 0],
  ] as const)(
    "given someone perceived at %i cells when computing proximity then it is %i",
    (distance, value) => {
      expect(proximity(distance, true)).toBe(value);
    },
  );

  it("given someone adjacent but neither seen nor heard when computing proximity then it is 0", () => {
    expect(proximity(1, false)).toBe(0);
  });
});

describe("presenceThreat (simulation-model §6)", () => {
  it("given a son with trust 8000, affection 9000 and no fear toward his father when the father is adjacent then threat drops by 2125", () => {
    expect(presenceThreat(aPresence({ trust: 8000, affection: 9000 }, 10000))).toBe(-2125);
  });

  it("given the same son when the father is 12 cells away then threat drops by 425", () => {
    expect(presenceThreat(aPresence({ trust: 8000, affection: 9000 }, proximity(12, true)))).toBe(
      -425,
    );
  });

  it.each([
    ["fearOf", { fearOf: 6000, resentment: 2000, perceivedThreat: 1000 }],
    ["resentment", { fearOf: 1000, resentment: 6000, perceivedThreat: 2000 }],
    ["perceivedThreat", { fearOf: 2000, resentment: 1000, perceivedThreat: 6000 }],
  ] as const)(
    "given %s as the largest menace of someone adjacent when computing presence then it adds half of it",
    (_largest, view) => {
      expect(presenceThreat(aPresence(view, 10000))).toBe(3000);
    },
  );

  it("given someone feared and trusted at 3 cells when computing presence then menace and relief both count: 1400", () => {
    expect(presenceThreat(aPresence({ fearOf: 6000, trust: 4000, affection: 4000 }, 7000))).toBe(
      1400,
    );
  });
});

describe("threatLevel (simulation-model §6)", () => {
  it("given only the danger of the place when computing threat then it is half of it", () => {
    expect(threatLevel(someThreat({ danger: 7000 }))).toBe(3500);
  });

  it("given comfort 5000 when computing threat then it subtracts 1000", () => {
    expect(threatLevel(someThreat({ danger: 4000, comfort: 5000 }))).toBe(1000);
  });

  it("given DARK light when computing threat then it adds 1000", () => {
    expect(threatLevel(someThreat({ light: "DARK" }))).toBe(1000);
  });

  it.each(["DIM", "DAY"] as const)(
    "given %s light when computing threat then it adds nothing",
    (light) => {
      expect(threatLevel(someThreat({ light }))).toBe(0);
    },
  );

  it("given a fear of a present tag of -6000 when computing threat then it adds 3000", () => {
    expect(threatLevel(someThreat({ tagValences: [-6000] }))).toBe(3000);
  });

  it("given an attachment to a present tag of 5000 when computing threat then it subtracts 1500", () => {
    expect(threatLevel(someThreat({ danger: 6000, tagValences: [5000] }))).toBe(1500);
  });

  it("given a son in a dangerous place when his father is adjacent then the threat is 2125 lower than alone", () => {
    const father = aPresence({ trust: 8000, affection: 9000 }, 10000);

    expect(threatLevel(someThreat({ danger: 8000, presences: [father] }))).toBe(4000 - 2125);
  });

  it("given everything soothing when computing threat then it is clamped to 0", () => {
    expect(threatLevel(someThreat({ comfort: 10000, tagValences: [6000] }))).toBe(0);
  });

  it("given everything menacing when computing threat then it is clamped to 10000", () => {
    const menace = aPresence({ fearOf: 10000 }, toBp(10000));

    expect(
      threatLevel(
        someThreat({ danger: 10000, light: "DARK", presences: [menace, menace, menace] }),
      ),
    ).toBe(10000);
  });

  it("given a trusted Y without fear when comparing Y adjacent and 12 cells away then the threat adjacent is never higher (invariant 4)", () => {
    fc.assert(
      fc.property(arbitraryTrustedPresence(), ({ input, trusted }) => {
        const near = threatLevel({
          ...input,
          presences: [...input.presences, aPresence(trusted, 10000)],
        });
        const far = threatLevel({
          ...input,
          presences: [...input.presences, aPresence(trusted, 2000)],
        });

        expect(near).toBeLessThanOrEqual(far);
      }),
    );
  });
});
