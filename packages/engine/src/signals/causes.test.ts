import { describe, expect, it } from "vitest";

import { aBody, aBond, aCharacter, someEmotions } from "../../test/support/character.ts";
import { openGrid } from "../../test/support/context.ts";
import { gridOf } from "../../test/support/space.ts";
import { causeIntensities, LYING_INTENSITY, visibleAttraction } from "./causes.ts";

const NOT_LYING = { attraction: 0, lying: false };

describe("causeIntensities (simulation-model §7, first table)", () => {
  it.each([
    ["fear", 9000],
    ["sadness", 8100],
    ["anger", 7200],
    ["disgust", 6300],
    ["shame", 5400],
    ["guilt", 4500],
    ["jealousy", 3600],
    ["joy", 2700],
    ["boredom", 1800],
  ] as const)(
    "given emotions when reading the causes then %s has the intensity of the emotion: %i",
    (cause, expected) => {
      const emotions = someEmotions({
        fear: 9000,
        sadness: 8100,
        anger: 7200,
        disgust: 6300,
        shame: 5400,
        guilt: 4500,
        jealousy: 3600,
        joy: 2700,
        boredom: 1800,
        surprise: 9999,
      });

      expect(causeIntensities(aCharacter(1, 0, { emotions }), NOT_LYING)[cause]).toBe(expected);
    },
  );

  it.each([
    ["fatigue", 7700],
    ["pain", 6600],
    ["intoxication", 5500],
  ] as const)(
    "given body needs when reading the causes then %s is the need: %i",
    (cause, expected) => {
      const body = aBody({ fatigue: 7700, pain: 6600, intoxication: 5500, hunger: 9000 });

      expect(causeIntensities(aCharacter(1, 0, { body }), NOT_LYING)[cause]).toBe(expected);
    },
  );

  it("given a cold body at thermal -3000 when reading the causes then cold is 3000", () => {
    const body = aBody({ thermal: -3000 });

    expect(causeIntensities(aCharacter(1, 0, { body }), NOT_LYING).cold).toBe(3000);
  });

  it("given a warm body at thermal 4000 when reading the causes then cold is 0", () => {
    const body = aBody({ thermal: 4000 });

    expect(causeIntensities(aCharacter(1, 0, { body }), NOT_LYING).cold).toBe(0);
  });

  it("given the greatest visible attraction 6500 when reading the causes then attraction is 6500", () => {
    expect(causeIntensities(aCharacter(1, 0), { attraction: 6500, lying: false }).attraction).toBe(
      6500,
    );
  });

  it("given a character telling a lie when emitting then the lying cause has intensity 7000 only during that act", () => {
    const character = aCharacter(1, 0);

    expect([
      causeIntensities(character, { attraction: 0, lying: true }).lying,
      causeIntensities(character, NOT_LYING).lying,
    ]).toStrictEqual([LYING_INTENSITY, 0]);
  });

  it("given the lying intensity when reading it then it is 7000", () => {
    expect(LYING_INTENSITY).toBe(7000);
  });

  it("given a character when reading the causes then every cause of the table has a value", () => {
    expect(Object.keys(causeIntensities(aCharacter(1, 0), NOT_LYING))).toHaveLength(15);
  });
});

describe("visibleAttraction (simulation-model §7: the greatest attraction toward whom X sees)", () => {
  const grid = openGrid(25);

  it("given two visible characters when reading the attraction then the greatest one counts", () => {
    const self = aCharacter(1, 0, {
      bonds: [aBond(2, { attraction: 3000 }), aBond(3, { attraction: 8000 })],
    });
    const others = [aCharacter(2, 1), aCharacter(3, 2)];

    expect(visibleAttraction(self, others, grid, 20)).toBe(8000);
  });

  it("given the most attractive character out of sight range when reading the attraction then only the visible one counts", () => {
    const self = aCharacter(1, 0, {
      bonds: [aBond(2, { attraction: 3000 }), aBond(3, { attraction: 8000 })],
    });
    const others = [aCharacter(2, 1), aCharacter(3, 24)];

    expect(visibleAttraction(self, others, grid, 20)).toBe(3000);
  });

  it("given the attractive character behind a wall when reading the attraction then it is 0", () => {
    const walled = gridOf([".#."]);
    const self = aCharacter(1, 0, { bonds: [aBond(2, { attraction: 8000 })] });

    expect(visibleAttraction(self, [aCharacter(2, 2)], walled, 20)).toBe(0);
  });

  it("given nobody else when reading the attraction then it is 0", () => {
    expect(visibleAttraction(aCharacter(1, 0), [], grid, 20)).toBe(0);
  });

  it("given the character itself among the others when reading the attraction then it does not count", () => {
    const self = aCharacter(1, 0, { bonds: [aBond(1, { attraction: 9000 })] });

    expect(visibleAttraction(self, [self], grid, 20)).toBe(0);
  });
});
