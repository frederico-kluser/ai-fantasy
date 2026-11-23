import { describe, expect, it } from "vitest";

import { minuteOf, randomSeed, timeOf } from "./values.ts";

describe("time of the scene", () => {
  it.each([
    [0, "00:00"],
    [65, "01:05"],
    [1200, "20:00"],
    [1439, "23:59"],
  ])("given minute %i when showing then it reads %s", (minute, time) => {
    expect(timeOf(minute)).toBe(time);
  });

  it.each([
    ["00:00", 0],
    ["01:05", 65],
    ["23:59", 1439],
    ["7:30", 450],
  ])("given %s when reading then it is minute %i", (time, minute) => {
    expect(minuteOf(time)).toBe(minute);
  });

  it.each(["", "24:00", "12:60", "ab:cd", "12", "12:5", "-1:00", "1:2:3"])(
    "given %j when reading then it is not a time",
    (time) => {
      expect(minuteOf(time)).toBeNull();
    },
  );
});

describe("randomSeed", () => {
  it("given a source of random words when drawing then the seed is the first word", () => {
    const seed = randomSeed({
      getRandomValues: (array: Uint32Array<ArrayBuffer>) => {
        array[0] = 4294967295;
        return array;
      },
    });

    expect(seed).toBe(4294967295);
  });

  it("given the browser crypto when drawing then the seed is a valid seed", () => {
    expect(randomSeed()).toSatisfy(
      (seed: number) => Number.isInteger(seed) && seed >= 0 && seed <= 4294967295,
    );
  });
});
