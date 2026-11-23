import { describe, expect, it } from "vitest";

import { dayPhase, MINUTES_PER_DAY, minuteOfDay } from "./clock.ts";

describe("minuteOfDay (simulation-model §2)", () => {
  it("given startMinute 1430 when 144 ticks pass then the clock wraps to minute 2", () => {
    expect(minuteOfDay(1430, 144)).toBe(2);
  });

  it("given startMinute 600 when 11 ticks pass then it is still minute 600", () => {
    expect(minuteOfDay(600, 11)).toBe(600);
  });

  it("given startMinute 600 when 12 ticks pass then one minute has passed", () => {
    expect(minuteOfDay(600, 12)).toBe(601);
  });

  it("given startMinute 1439 when 12 ticks pass then the clock wraps to minute 0", () => {
    expect(minuteOfDay(1439, 12)).toBe(0);
  });

  it("given a full day of ticks when computing the minute then the clock is back at the start", () => {
    expect(minuteOfDay(75, 17280)).toBe(75);
  });

  it("given a day when reading its length then it has 1440 minutes", () => {
    expect(MINUTES_PER_DAY).toBe(1440);
  });

  it.each([-1, 1440, 1.5, Number.NaN])(
    "given startMinute %d when computing the minute then it throws a RangeError",
    (startMinute) => {
      expect(() => minuteOfDay(startMinute, 0)).toThrow(
        new RangeError(`a minute of the day must be an integer in 0..1439, got ${startMinute}`),
      );
    },
  );

  it.each([-1, 0.5])(
    "given tick %d when computing the minute then it throws a RangeError",
    (tick) => {
      expect(() => minuteOfDay(0, tick)).toThrow(
        new RangeError(`a tick must be a safe integer ≥ 0, got ${tick}`),
      );
    },
  );
});

describe("dayPhase (simulation-model §3.2)", () => {
  it.each([
    [0, "DAWN"],
    [299, "DAWN"],
    [300, "MORNING"],
    [719, "MORNING"],
    [720, "AFTERNOON"],
    [1079, "AFTERNOON"],
    [1080, "EVENING"],
    [1319, "EVENING"],
    [1320, "LATE_NIGHT"],
    [1439, "LATE_NIGHT"],
  ])("given the phase boundaries when converting minute %i then it maps to %s", (minute, phase) => {
    expect(dayPhase(minute)).toBe(phase);
  });

  it.each([-1, 1440, 2.5])(
    "given minute %d when converting then it throws a RangeError",
    (minute) => {
      expect(() => dayPhase(minute)).toThrow(
        new RangeError(`a minute of the day must be an integer in 0..1439, got ${minute}`),
      );
    },
  );
});
