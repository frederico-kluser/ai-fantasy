import fc from "fast-check";
import { describe, expect, it } from "vitest";

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
import { ids } from "../../test/support/acts.ts";
import type { CharacterId } from "../domain/ids.ts";
import { EMOTION_IDS } from "../presets/emotions.ts";
import { BOND_AXIS_IDS, type BondAxisId } from "../presets/bonds.ts";
import { applyDeltas, finalizeDeltas, importancesOf, type StateDelta } from "./deltas.ts";

const [one, two, three] = ids(1, 2, 3) as [CharacterId, CharacterId, CharacterId];

function bondDelta(delta: number, axis: BondAxisId = "trust"): StateDelta {
  return { kind: "BOND", who: two, toward: one, axis, delta };
}

describe("finalizeDeltas (simulation-model §9, dialogue-acts §7.1)", () => {
  it("given a bond delta above 1500 when applying then it is capped", () => {
    expect(finalizeDeltas([bondDelta(1000), bondDelta(800)])).toEqual([bondDelta(1500)]);
  });

  it("given a bond delta below -1500 when applying then it is capped", () => {
    expect(finalizeDeltas([bondDelta(-2400)])).toEqual([bondDelta(-1500)]);
  });

  it("given deltas of the same value of the same person when finalizing then they sum in the place of the first", () => {
    const anger = (delta: number): StateDelta => ({
      kind: "EMOTION",
      who: two,
      emotion: "anger",
      delta,
    });
    const joy: StateDelta = { kind: "EMOTION", who: two, emotion: "joy", delta: 5 };

    expect(finalizeDeltas([anger(100), joy, anger(50)])).toEqual([anger(150), joy]);
  });

  it("given deltas that cancel out when finalizing then nothing is left", () => {
    expect(finalizeDeltas([bondDelta(400), bondDelta(-400)])).toEqual([]);
  });

  it("given a surprise gain when finalizing then the predictability deficit rises by half of it", () => {
    const surprise: StateDelta = { kind: "EMOTION", who: two, emotion: "surprise", delta: 1281 };

    expect(finalizeDeltas([surprise])).toEqual([
      surprise,
      { kind: "DRIVE", who: two, drive: "predictability", toward: null, delta: 640 },
    ]);
  });

  it("given a surprise loss when finalizing then predictability is untouched", () => {
    const surprise: StateDelta = { kind: "EMOTION", who: two, emotion: "surprise", delta: -400 };

    expect(finalizeDeltas([surprise])).toEqual([surprise]);
  });
});

describe("applyDeltas (simulation-model §9)", () => {
  it("given an emotion, a bond and drive deltas when applying then each value moves and stays in range", () => {
    const before = aCharacter(2, 0, {
      emotions: someEmotions({ anger: 9800 }),
      bonds: [aBond(1, { trust: 300 })],
      drives: someDrives({ deficits: { dignity: 100 }, directed: { justice: [[1, 2000]] } }),
    });
    const deltas: StateDelta[] = [
      { kind: "EMOTION", who: two, emotion: "anger", delta: 640 },
      bondDelta(-640),
      { kind: "DRIVE", who: two, drive: "dignity", toward: null, delta: -400 },
      { kind: "DRIVE", who: two, drive: "justice", toward: one, delta: 320 },
    ];

    const [after] = applyDeltas([before], deltas);

    expect(after?.emotions.anger).toBe(10000);
    expect(after?.bonds).toEqual([aBond(1, { trust: 0 })]);
    expect(after?.drives.deficits.dignity).toBe(0);
    expect(after?.drives.directed.justice).toEqual([{ target: one, deficit: 2320 }]);
  });

  it("given a bond delta toward a stranger when applying then a bond is added in id order", () => {
    const before = aCharacter(2, 0, { bonds: [aBond(1), aBond(5)] });

    const [after] = applyDeltas(
      [before],
      [{ kind: "BOND", who: two, toward: three, axis: "fearOf", delta: 640 }],
    );

    expect(after?.bonds.map((bond) => bond.target)).toEqual([1, 3, 5]);
    expect(after?.bonds[1]).toEqual(aBond(3, { fearOf: 640 }));
  });

  it("given a perception delta without a record when applying then it starts from the preview", () => {
    const before = aCharacter(2, 0, {
      bonds: [aBond(1, { trust: 2000 })],
      traits: someTraits({ trustInOthers: 4000 }),
    });

    const [after] = applyDeltas(
      [before],
      [{ kind: "PERCEPTION", who: two, toward: one, value: "perceivedSincerity", delta: -1500 }],
    );

    expect(after?.perceptions).toEqual([
      aPerception(1, {
        perceivedSincerity: 5000 + 1000 + 1000 - 1500,
        perceivedInterest: 0,
        perceivedHostility: 0,
      }),
    ]);
  });

  it("given a perception delta with a record when applying then the record moves and the others keep their order", () => {
    const before = aCharacter(2, 0, {
      perceptions: [aPerception(1, { perceivedHostility: 9500 }), aPerception(3)],
    });

    const [after] = applyDeltas(
      [before],
      [{ kind: "PERCEPTION", who: two, toward: one, value: "perceivedHostility", delta: 1000 }],
    );

    expect(after?.perceptions).toEqual([
      aPerception(1, { perceivedHostility: 10000 }),
      aPerception(3),
    ]);
  });

  it("given deltas of someone else when applying then the character is unchanged", () => {
    const before = aCharacter(3, 0);

    expect(applyDeltas([before], [bondDelta(500)])).toEqual([before]);
  });

  it("given any character and any deltas when applying then every value stays in its scale", () => {
    const delta = fc.integer({ min: -20000, max: 20000 });
    const deltas = fc.array(
      fc.oneof(
        fc
          .record({ emotion: fc.constantFrom(...EMOTION_IDS), delta })
          .map((entry): StateDelta => ({ kind: "EMOTION", who: two, ...entry })),
        fc
          .record({ axis: fc.constantFrom(...BOND_AXIS_IDS), delta })
          .map((entry): StateDelta => ({ kind: "BOND", who: two, toward: three, ...entry })),
        delta.map((value): StateDelta => ({
          kind: "DRIVE",
          who: two,
          drive: "care",
          toward: one,
          delta: value,
        })),
        delta.map((value): StateDelta => ({
          kind: "DRIVE",
          who: two,
          drive: "fun",
          toward: null,
          delta: value,
        })),
      ),
    );

    fc.assert(
      fc.property(arbitraryCharacter(2, 0, [1]), deltas, (character, list) => {
        const [after] = applyDeltas([character], finalizeDeltas(list));

        expect(rangeProblems(after ?? character)).toEqual([]);
      }),
    );
  });
});

describe("importancesOf (simulation-model §12)", () => {
  it("given emotion and bond deltas when computing the importance then bonds count twice and involvement adds 3000", () => {
    const deltas: StateDelta[] = [
      { kind: "EMOTION", who: two, emotion: "anger", delta: 640 },
      { kind: "EMOTION", who: two, emotion: "joy", delta: -100 },
      bondDelta(-320),
      { kind: "DRIVE", who: two, drive: "dignity", toward: null, delta: 900 },
      { kind: "EMOTION", who: three, emotion: "anger", delta: 9000 },
    ];

    expect(importancesOf(deltas, [two, one], [two])).toEqual([
      { id: two, importance: 640 + 100 + 2 * 320 + 3000 },
      { id: one, importance: 0 },
    ]);
  });
});
