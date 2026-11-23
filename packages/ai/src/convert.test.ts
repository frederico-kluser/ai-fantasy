import { describe, expect, it } from "vitest";

import { noulIsYes, probabilityToBp, scoreToIntensity } from "./convert.ts";

describe("probabilityToBp (ai-integration §4.2)", () => {
  it("given a probability of 0.73 when converting then the result is 7300", () => {
    expect(probabilityToBp(0.73)).toBe(7300);
  });

  it("given a probability of 0.57 when converting then the result is 5700", () => {
    expect(probabilityToBp(0.57)).toBe(5700);
  });

  it.each([
    [1.2, 10000],
    [-0.1, 0],
    [0.00005, 1],
    [0.00004, 0],
  ])("given a probability of %s when converting then it is rounded and clamped to %s", (p, bp) => {
    expect(probabilityToBp(p)).toBe(bp);
  });
});

describe("scoreToIntensity (ai-integration §4.2)", () => {
  it("given a score of 7.3 when converting intensity then the result is 6625", () => {
    expect(scoreToIntensity(7.3)).toBe(6625);
  });

  it.each([
    [2, 0],
    [10, 10000],
    [1, 0],
    [11, 10000],
    [2.0008, 1],
  ])("given a score of %s when converting intensity then the result is %s", (score, bp) => {
    expect(scoreToIntensity(score)).toBe(bp);
  });
});

describe("noulIsYes (ai-integration §4.2)", () => {
  it.each([
    [0.5, true],
    [0.49994, false],
    [1, true],
    [0, false],
  ])("given a noul of %s when reading it as a boolean then it is %s", (noul, yes) => {
    expect(noulIsYes(noul)).toBe(yes);
  });
});
