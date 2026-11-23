import { describe, expect, it } from "vitest";

import { toBp } from "../domain/bp.ts";
import { noticeChance, type NoticeView } from "./notice.ts";

/** An alert observer with perceptiveness 5000, every need at 0. */
function anObserver(overrides: Partial<Record<keyof NoticeView, number>> = {}): NoticeView {
  return {
    perceptiveness: toBp(overrides.perceptiveness ?? 5000),
    fatigue: toBp(overrides.fatigue ?? 0),
    intoxication: toBp(overrides.intoxication ?? 0),
  };
}

describe("noticeChance (simulation-model §7, noticing)", () => {
  it.each([
    [0, 7000],
    [5000, 8000],
    [10000, 9000],
  ])(
    "given perceptiveness %i near the emitter when noticing then the chance is %i",
    (perceptiveness, expected) => {
      expect(noticeChance(anObserver({ perceptiveness }), 1)).toBe(expected);
    },
  );

  it("given an observer tired above the urgent band when noticing then the chance drops by 2000", () => {
    expect(noticeChance(anObserver({ fatigue: 7500 }), 1)).toBe(6000);
  });

  it("given an observer at fatigue 7499 when noticing then the chance does not drop", () => {
    expect(noticeChance(anObserver({ fatigue: 7499 }), 1)).toBe(8000);
  });

  it("given an observer with intoxication 5000 when noticing then the chance drops by 2000", () => {
    expect(noticeChance(anObserver({ intoxication: 5000 }), 1)).toBe(6000);
  });

  it("given an observer with intoxication 4999 when noticing then the chance does not drop", () => {
    expect(noticeChance(anObserver({ intoxication: 4999 }), 1)).toBe(8000);
  });

  it("given an observer both tired and intoxicated when noticing then the chance drops by 2000 once", () => {
    expect(noticeChance(anObserver({ fatigue: 9000, intoxication: 9000 }), 1)).toBe(6000);
  });

  it.each([
    [3, 8000],
    [4, 7000],
    [6, 7000],
    [7, 6000],
    [12, 6000],
    [13, 5000],
  ])("given the emitter at %i cells when noticing then the chance is %i", (distance, expected) => {
    expect(noticeChance(anObserver(), distance)).toBe(expected);
  });

  it("given the worst observer far away when noticing then the chance is 2000", () => {
    expect(noticeChance(anObserver({ perceptiveness: 0, fatigue: 10000 }), 20)).toBe(2000);
  });
});
