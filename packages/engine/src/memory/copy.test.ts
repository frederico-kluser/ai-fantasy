import { describe, expect, it } from "vitest";

import { toBp } from "../domain/bp.ts";
import type { FactId } from "../domain/ids.ts";
import { idOf } from "../../test/support/space.ts";
import {
  createCopy,
  factImportance,
  historyCopy,
  initialFidelity,
  isLasting,
  retell,
} from "./copy.ts";

/** A fact id; test ids are known to be valid, so the brand is given directly. */
const FACT = 7 as FactId;

describe("initialFidelity (simulation-model §12)", () => {
  it.each([
    ["DIRECT", 10000],
    ["FRAGMENT", 5000],
    ["SEEN", 3000],
  ] as const)(
    "given a %s perception when creating a copy then fidelity is %i",
    (perspective, fidelity) => {
      expect(initialFidelity({ perspective })).toBe(fidelity);
    },
  );

  it("given a copy told by someone with fidelity 9000 when creating it then fidelity is 7200", () => {
    expect(initialFidelity({ perspective: "TOLD", tellerFidelity: toBp(9000) })).toBe(7200);
  });
});

describe("createCopy (simulation-model §12)", () => {
  it("given a fact seen when creating a copy then fidelity and peak start at 3000 with the true version", () => {
    expect(createCopy(FACT, { perspective: "SEEN" }, toBp(4500))).toStrictEqual({
      fact: FACT,
      perspective: "SEEN",
      fidelity: 3000,
      peakFidelity: 3000,
      importance: 4500,
      falseOffenders: null,
    });
  });

  it("given a lie believed that blames someone when creating the copy then it keeps the false offender", () => {
    const copy = createCopy(FACT, { perspective: "TOLD", tellerFidelity: toBp(10000) }, toBp(0), [
      idOf(3),
    ]);

    expect([copy.fidelity, copy.falseOffenders]).toStrictEqual([8000, [3]]);
  });

  it("given a lie that denies when creating the copy then the false version has no offender", () => {
    const copy = createCopy(
      FACT,
      { perspective: "TOLD", tellerFidelity: toBp(10000) },
      toBp(0),
      [],
    );

    expect(copy.falseOffenders).toStrictEqual([]);
  });
});

describe("historyCopy (simulation-model §12, presets §7)", () => {
  it("given a fact of the history when copying it then it is DIRECT with fidelity 8000", () => {
    expect(historyCopy(FACT, toBp(6500))).toStrictEqual({
      fact: FACT,
      perspective: "DIRECT",
      fidelity: 8000,
      peakFidelity: 8000,
      importance: 6500,
      falseOffenders: null,
    });
  });
});

describe("retell (simulation-model §12)", () => {
  it("given a copy that lost fidelity when it is told again then fidelity returns to its peak", () => {
    const copy = { ...historyCopy(FACT, toBp(6500)), fidelity: toBp(7600) };

    expect(retell(copy)).toStrictEqual({ ...copy, fidelity: 8000 });
  });
});

describe("factImportance (simulation-model §12)", () => {
  it("given emotion and bond deltas of a bystander when computing importance then it sums them with bonds doubled", () => {
    expect(
      factImportance({ emotionDeltas: [-800, 400], bondDeltas: [-300, 200], involved: false }),
    ).toBe(2200);
  });

  it("given the author, a target or the topic when computing importance then it adds 3000", () => {
    expect(factImportance({ emotionDeltas: [100], bondDeltas: [], involved: true })).toBe(3100);
  });

  it("given huge deltas when computing importance then it is clamped to 10000", () => {
    expect(factImportance({ emotionDeltas: [9000], bondDeltas: [1500], involved: true })).toBe(
      10000,
    );
  });
});

describe("isLasting (simulation-model §12)", () => {
  it.each([
    [6000, true],
    [5999, false],
  ] as const)(
    "given importance %i when checking the copy then lasting is %s",
    (importance, lasting) => {
      expect(isLasting(createCopy(FACT, { perspective: "DIRECT" }, toBp(importance)))).toBe(
        lasting,
      );
    },
  );
});
