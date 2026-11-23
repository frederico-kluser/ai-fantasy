import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { hashState } from "../session/hash.ts";
import {
  aBond,
  aCharacter,
  aPerception,
  arbitraryCharacter,
  rangeProblems,
  someDrives,
  someEmotions,
  someTraits,
} from "../../test/support/character.ts";
import { aScene, openGrid } from "../../test/support/context.ts";
import { cellAt, gridOf, idOf } from "../../test/support/space.ts";
import { toBipolarBp, toBp } from "../domain/bp.ts";
import { statusTick, type StatusTickInput } from "./tick.ts";
import { WEATHER_IDS } from "../presets/weathers.ts";

/** An act that interests nobody, in the default scene (a forest on an open 25 × 25 grid), at tick 0. */
const INPUT: StatusTickInput = {
  scene: aScene(),
  tick: 0,
  pace: { kind: "ACT", interested: [] },
  walked: [],
};

/** A dangerous place without comfort or tags: the threat starts at 4000. */
const ALLEY = aScene({ place: { danger: 8000, comfort: 0, tags: [] } });

const SON = 1;
const FATHER = 2;
const SON_BOND = aBond(FATHER, { trust: 8000, affection: 9000 });

describe("statusTick: order and shape (simulation-model §16 step 6)", () => {
  it("given characters out of id order when ticking then the result is sorted by id", () => {
    const result = statusTick([aCharacter(5, 0), aCharacter(2, 4)], INPUT);

    expect(result.map((character) => character.id)).toStrictEqual([2, 5]);
  });

  it("given the states given when ticking then they are not changed", () => {
    const characters = [aCharacter(1, 0)];
    const before = hashState(characters);

    statusTick(characters, INPUT);

    expect(hashState(characters)).toBe(before);
  });

  it("given a character state after a tick when hashing it then it is canonical and stable", () => {
    const after = statusTick([aCharacter(1, 0, { bonds: [SON_BOND] }), aCharacter(2, 1)], INPUT);

    expect(hashState(after)).toBe(hashState(structuredClone(after)));
  });
});

describe("statusTick: body (simulation-model §5.1 and §3.2)", () => {
  it("given a character on an uncovered cell in snow when ticking then thermal approaches the full weather temperature: -20", () => {
    const scene = aScene({ weather: "snow", grid: openGrid(3) });

    expect(statusTick([aCharacter(1, 4)], { ...INPUT, scene })[0]?.body.thermal).toBe(-20);
  });

  it("given a character on a covered cell in snow when ticking then thermal approaches a quarter of it: -5", () => {
    const scene = aScene({ weather: "snow", grid: openGrid(3, [4]) });

    expect(statusTick([aCharacter(1, 4)], { ...INPUT, scene })[0]?.body.thermal).toBe(-5);
  });

  it("given a character that walked a cell this tick when ticking then fatigue rises by 7 in the morning", () => {
    expect(statusTick([aCharacter(1, 0)], { ...INPUT, walked: [idOf(1)] })[0]?.body.fatigue).toBe(
      7,
    );
  });

  it("given a scene that started late at night when ticking then fatigue rises by 3", () => {
    const scene = aScene({ startMinute: 1350 });

    expect(statusTick([aCharacter(1, 0)], { ...INPUT, scene })[0]?.body.fatigue).toBe(3);
  });

  it("given a character with anger 8000 when ticking then the strong anger tires the body: fatigue 3", () => {
    const angry = aCharacter(1, 0, { emotions: someEmotions({ anger: 8000 }) });

    expect(statusTick([angry], INPUT)[0]?.body.fatigue).toBe(3);
  });
});

describe("statusTick: emotions (simulation-model §5.2)", () => {
  it("given an act that interests only character 1 when ticking then only character 2 gets bored", () => {
    const input = { ...INPUT, pace: { kind: "ACT", interested: [idOf(1)] } } as const;
    const [first, second] = statusTick([aCharacter(1, 0), aCharacter(2, 1)], input);

    expect([first?.emotions.boredom, second?.emotions.boredom]).toStrictEqual([0, 25]);
  });

  it("given a tick of silence when ticking then boredom rises by 50", () => {
    expect(
      statusTick([aCharacter(1, 0)], { ...INPUT, pace: { kind: "SILENCE" } })[0]?.emotions.boredom,
    ).toBe(50);
  });

  it("given a fear of the forest in a forest when ticking then fear rises by 20 and the threat by 3000", () => {
    const fearful = aCharacter(1, 0, {
      associations: [{ subject: { kind: "TAG", tag: "forest" }, valence: toBipolarBp(-6000) }],
    });
    const [after] = statusTick([fearful], INPUT);

    expect([after?.emotions.fear, after?.threat]).toStrictEqual([20, 1400 + 3000]);
  });

  it("given pain 5000 when ticking then the body recovers first, to 4999, and sadness does not rise", () => {
    const hurt = aCharacter(1, 0, { body: { ...aCharacter(1, 0).body, pain: toBp(5000) } });
    const [after] = statusTick([hurt], INPUT);

    expect([after?.body.pain, after?.emotions.sadness]).toStrictEqual([4999, 0]);
  });
});

describe("statusTick: threat and drives (simulation-model §6 and §5.3)", () => {
  it("given a son alone in a dangerous place when ticking then his threat is 4000 and safety approaches it: 400", () => {
    const [son] = statusTick([aCharacter(SON, 0, { bonds: [SON_BOND] })], {
      ...INPUT,
      scene: ALLEY,
    });

    expect([son?.threat, son?.drives.deficits.physical_safety]).toStrictEqual([4000, 400]);
  });

  it("given a son with trust 8000, affection 9000 and no fear toward his father adjacent when ticking then his threat drops by 2125", () => {
    const characters = [aCharacter(SON, 0, { bonds: [SON_BOND] }), aCharacter(FATHER, 1)];

    expect(statusTick(characters, { ...INPUT, scene: ALLEY })[0]?.threat).toBe(4000 - 2125);
  });

  it("given the same son with his father 12 cells away when ticking then his threat drops by 425", () => {
    const characters = [aCharacter(SON, 0, { bonds: [SON_BOND] }), aCharacter(FATHER, 12)];

    expect(statusTick(characters, { ...INPUT, scene: ALLEY })[0]?.threat).toBe(4000 - 425);
  });

  it("given the father beyond a wall in the dark when ticking then he is neither seen nor heard and does not count", () => {
    const grid = gridOf(["..#.."]);
    const scene = aScene({ grid, startMinute: 0, place: { danger: 8000, comfort: 0, tags: [] } });
    const characters = [
      aCharacter(SON, 0, { bonds: [SON_BOND] }),
      aCharacter(FATHER, cellAt(grid, 4, 0)),
    ];

    expect(statusTick(characters, { ...INPUT, scene })[0]?.threat).toBe(5000);
  });

  it("given the greatest need of 7500 after the tick when ticking then physical relief is its pressure", () => {
    const tired = aCharacter(1, 0, { body: { ...aCharacter(1, 0).body, bladder: toBp(7497) } });

    expect(statusTick([tired], INPUT)[0]?.drives.deficits.physical_relief).toBe(5000);
  });

  it("given an attraction of 8000 toward someone visible when ticking then desire toward them approaches it: 400", () => {
    const characters = [
      aCharacter(1, 0, { bonds: [aBond(2, { attraction: 8000 })] }),
      aCharacter(2, 3),
    ];

    expect(statusTick(characters, INPUT)[0]?.drives.directed.desire).toStrictEqual([
      { target: 2, deficit: 400 },
    ]);
  });

  it("given an attraction toward someone behind a wall when ticking then desire toward them does not change", () => {
    const grid = gridOf([".#."]);
    const scene = aScene({ grid });
    const characters = [
      aCharacter(1, 0, { bonds: [aBond(2, { attraction: 8000 })] }),
      aCharacter(2, 2),
    ];

    expect(statusTick(characters, { ...INPUT, scene })[0]?.drives.directed.desire).toStrictEqual(
      [],
    );
  });

  it("given someone who looks afraid when ticking then care toward them approaches the apparent distress", () => {
    const worried = aCharacter(1, 0, {
      perceptions: [aPerception(2, {}, { emotion: "fear", intensity: toBp(6000) })],
    });

    expect(statusTick([worried, aCharacter(2, 1)], INPUT)[0]?.drives.directed.care).toStrictEqual([
      { target: 2, deficit: 600 },
    ]);
  });

  it("given a perception of someone absent who looks afraid when ticking then care toward the present one follows only its own distress", () => {
    const worried = aCharacter(1, 0, {
      perceptions: [aPerception(2), aPerception(3, {}, { emotion: "fear", intensity: toBp(6000) })],
    });

    expect(statusTick([worried, aCharacter(2, 1)], INPUT)[0]?.drives.directed.care).toStrictEqual([
      { target: 2, deficit: 0 },
    ]);
  });

  it("given an expansive character while an act goes on when ticking then company rises by 1 only", () => {
    const expansive = aCharacter(1, 0, { traits: someTraits({ sociability: 10000 }) });

    expect(statusTick([expansive], INPUT)[0]?.drives.deficits.company).toBe(1);
  });

  it("given care toward someone present who shows no distress when ticking then it falls toward 0", () => {
    const carer = aCharacter(1, 0, { drives: someDrives({ directed: { care: [[2, 5000]] } }) });

    expect(statusTick([carer, aCharacter(2, 1)], INPUT)[0]?.drives.directed.care).toStrictEqual([
      { target: 2, deficit: 4500 },
    ]);
  });

  it("given an expansive character in a tick of silence when ticking then company rises by 1 + 5", () => {
    const expansive = aCharacter(1, 0, { traits: someTraits({ sociability: 10000 }) });

    expect(
      statusTick([expansive], { ...INPUT, pace: { kind: "SILENCE" } })[0]?.drives.deficits.company,
    ).toBe(6);
  });
});

describe("statusTick: ranges (simulation-model §18 invariant 2)", () => {
  it("given any characters, place, weather and tick when ticking then every value stays in its scale", () => {
    const scenario = fc.record({
      first: arbitraryCharacter(0, 0, [1, 2]),
      second: arbitraryCharacter(1, 7, [0, 2]),
      third: arbitraryCharacter(2, 30, [0, 1]),
      weather: fc.constantFrom(...WEATHER_IDS),
      startMinute: fc.integer({ min: 0, max: 1439 }),
      tick: fc.integer({ min: 0, max: 100000 }),
      pace: fc.constantFrom<StatusTickInput["pace"]>({ kind: "SILENCE" }, INPUT.pace),
    });

    fc.assert(
      fc.property(scenario, ({ first, second, third, weather, startMinute, tick, pace }) => {
        const scene = aScene({ weather, startMinute, grid: openGrid(6, [0, 7]) });
        const after = statusTick([first, second, third], { scene, tick, pace, walked: [idOf(1)] });

        expect(after.flatMap(rangeProblems)).toStrictEqual([]);
      }),
    );
  });
});
