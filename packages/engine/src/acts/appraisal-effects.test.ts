import { describe, expect, it } from "vitest";

import { aBond, aCharacter, someTraits } from "../../test/support/character.ts";
import { ids } from "../../test/support/acts.ts";
import { toBipolarBp, toBp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import { mulBp } from "../domain/math.ts";
import type { DriveId } from "../presets/drives.ts";
import {
  effectUnit,
  NEUTRAL_SCALING,
  termDeltas,
  toneModulation,
  type ModulationView,
} from "./appraisal-effects.ts";
import { bondTerm, driveTerm, emotionTerm, type RequestDriveRef } from "./effect-terms.ts";

const [one, two] = ids(1, 2) as [CharacterId, CharacterId];

function aView(overrides: { affection?: number; attraction?: number; boldness?: number } = {}) {
  const view: ModulationView = {
    bond: aBond(1, { affection: overrides.affection ?? 0, attraction: overrides.attraction ?? 0 })
      .axes,
    romanticBoldness: toBipolarBp(overrides.boldness ?? 0),
  };
  return view;
}

const noDrive = (): DriveId | null => null;
const plainDrive = (ref: RequestDriveRef): DriveId | null =>
  new Map<RequestDriveRef, DriveId>([["RECEIVER", "material_security"]]).get(ref) ?? null;

describe("effectUnit (dialogue-acts §7.1)", () => {
  it.each([
    [10000, 800],
    [5000, 400],
    [3333, 266],
    [0, 0],
  ])("given intensity %i when computing the unit then u is %i", (intensity, unit) => {
    expect(effectUnit(toBp(intensity))).toBe(unit);
  });
});

describe("toneModulation (dialogue-acts §7.2)", () => {
  it("given a WARM tone when modulating then positives are ×1.2, negatives ×1 and the valence is kept", () => {
    const modulation = toneModulation("WARM", aView(), 2);

    expect([modulation.positive, modulation.negative, modulation.valence]).toEqual([
      12000, 10000, 2,
    ]);
    expect(modulation.extras).toEqual([]);
  });

  it("given a NEUTRAL tone when modulating then nothing changes", () => {
    const modulation = toneModulation("NEUTRAL", aView(), -2);

    expect([modulation.positive, modulation.negative, modulation.valence]).toEqual([
      10000, 10000, -2,
    ]);
  });

  it("given a PLAYFUL tone between friends with affection 5000 when modulating a negative act then negatives are halved and the valence rises by 1", () => {
    const modulation = toneModulation("PLAYFUL", aView({ affection: 5000 }), -2);

    expect([modulation.positive, modulation.negative, modulation.valence]).toEqual([
      10000, 5000, -1,
    ]);
  });

  it("given a PLAYFUL tone between friends when modulating a positive act then the valence is kept", () => {
    expect(toneModulation("PLAYFUL", aView({ affection: 5000 }), 1).valence).toBe(1);
  });

  it("given a PLAYFUL tone with affection 4999 when modulating then negatives stay whole", () => {
    const modulation = toneModulation("PLAYFUL", aView({ affection: 4999 }), -2);

    expect([modulation.negative, modulation.valence]).toEqual([10000, -2]);
  });

  it("given a SEDUCTIVE tone to someone attracted (5000) when modulating then attraction and desire move and the valence rises", () => {
    const modulation = toneModulation("SEDUCTIVE", aView({ attraction: 5000, boldness: -9000 }), 2);

    expect([modulation.positive, modulation.valence]).toEqual([10000, 3]);
    expect(modulation.extras).toEqual([bondTerm("attraction", 1), driveTerm("desire", -1)]);
  });

  it("given a SEDUCTIVE tone to someone not attracted and shy when modulating then the act embarrasses", () => {
    const modulation = toneModulation("SEDUCTIVE", aView({ attraction: 4999, boldness: -1 }), 2);

    expect([modulation.positive, modulation.valence]).toEqual([0, 1]);
    expect(modulation.extras).toEqual([
      emotionTerm("shame", 2),
      emotionTerm("disgust", 1),
      driveTerm("dignity", 1),
    ]);
  });

  it("given a SEDUCTIVE tone to someone not attracted but bold when modulating then positives are halved", () => {
    const modulation = toneModulation("SEDUCTIVE", aView({ boldness: 0 }), 2);

    expect([modulation.positive, modulation.valence, modulation.extras]).toEqual([5000, 2, []]);
  });

  it("given an IRONIC praise when modulating then it mocks: valence -1 with resentment, respect, anger and shame", () => {
    const modulation = toneModulation("IRONIC", aView(), 2);

    expect([modulation.positive, modulation.negative, modulation.valence]).toEqual([
      2500, 10000, -1,
    ]);
    expect(modulation.extras).toEqual([
      bondTerm("resentment", 1),
      bondTerm("respect", -1),
      emotionTerm("anger", 1),
      emotionTerm("shame", 1),
    ]);
  });

  it("given an IRONIC act of valence 0 when modulating then there is no mockery", () => {
    const modulation = toneModulation("IRONIC", aView(), 0);

    expect(modulation.valence).toBe(-1);
    expect(modulation.extras).toEqual([bondTerm("resentment", 1), bondTerm("respect", -1)]);
  });

  it("given an AGGRESSIVE accusation when modulating then positives vanish, negatives are ×1.5, fear and anger rise and the valence stops at -3", () => {
    const modulation = toneModulation("AGGRESSIVE", aView(), -2);

    expect([modulation.positive, modulation.negative, modulation.valence]).toEqual([0, 15000, -3]);
    expect(modulation.extras).toEqual([emotionTerm("fear", 1), emotionTerm("anger", 1)]);
  });
});

it("given an AGGRESSIVE praise when modulating then the valence is min(valence, 0) - 2", () => {
  expect(toneModulation("AGGRESSIVE", aView(), 2).valence).toBe(-2);
});

describe("termDeltas (dialogue-acts §7.1 and §7.2, order of calculation)", () => {
  const reader = aCharacter(2, 0);

  it("given emotion, bond and drive terms when scaling then emotions and drives take k units and bonds k half units", () => {
    const deltas = termDeltas(
      [emotionTerm("surprise", 2), bondTerm("dependence", 3), driveTerm("fun", 1)],
      reader,
      one,
      { unit: 401, ...NEUTRAL_SCALING },
      noDrive,
    );

    expect(deltas).toEqual([
      { kind: "EMOTION", who: two, emotion: "surprise", delta: 802 },
      { kind: "BOND", who: two, toward: one, axis: "dependence", delta: 600 },
      { kind: "DRIVE", who: two, drive: "fun", toward: null, delta: 401 },
    ]);
  });

  it("given good and bad effects when scaling then the positive multiplier takes the good and the negative the bad", () => {
    const deltas = termDeltas(
      [
        emotionTerm("joy", 1),
        emotionTerm("sadness", -1),
        driveTerm("fun", -1),
        emotionTerm("disgust", 1),
        bondTerm("resentment", 1),
        driveTerm("fun", 1),
        bondTerm("trust", -1),
      ],
      reader,
      one,
      { unit: 400, positive: 12000, negative: 5000 },
      noDrive,
    );

    expect(deltas.map((delta) => delta.delta)).toEqual([480, -480, -480, 200, 100, 200, -100]);
  });

  it("given neutral effects when scaling then no multiplier applies", () => {
    const deltas = termDeltas(
      [emotionTerm("surprise", 1), bondTerm("dependence", 2)],
      reader,
      one,
      { unit: 400, positive: 0, negative: 15000 },
      noDrive,
    );

    expect(deltas.map((delta) => delta.delta)).toEqual([400, 400]);
  });

  it("given anger, fear and guilt gains when scaling then each takes its effective trait factor", () => {
    const hot = aCharacter(2, 0, {
      traits: someTraits({ temper: 4000, courage: -2000, honesty: 6000 }),
      tendencies: someTraits({ temper: 10000, courage: 0, honesty: -10000 }),
    });
    const deltas = termDeltas(
      [emotionTerm("anger", 1), emotionTerm("fear", 1), emotionTerm("guilt", 1)],
      hot,
      one,
      { unit: 400, ...NEUTRAL_SCALING },
      noDrive,
    );

    expect(deltas.map((delta) => delta.delta)).toEqual([
      mulBp(400, 13500),
      mulBp(400, 11000),
      mulBp(400, 11500),
    ]);
  });

  it("given an anger loss when scaling then the trait factor does not apply", () => {
    const hot = aCharacter(2, 0, { traits: someTraits({ temper: 8000 }) });

    const [delta] = termDeltas(
      [emotionTerm("anger", -2)],
      hot,
      one,
      { unit: 400, ...NEUTRAL_SCALING },
      noDrive,
    );

    expect(delta?.delta).toBe(-800);
  });

  it("given the fear of a THREATEN when scaling then it also takes (10000 + fearOf) after the courage factor", () => {
    const scared = aCharacter(2, 0, {
      traits: someTraits({ courage: -4000 }),
      bonds: [aBond(1, { fearOf: 5000 })],
    });

    const [delta] = termDeltas(
      [{ kind: "EMOTION", emotion: "fear", k: 3, byFearOf: true }],
      scared,
      one,
      { unit: 400, ...NEUTRAL_SCALING },
      noDrive,
    );

    expect(delta?.delta).toBe(mulBp(mulBp(1200, 12000), 15000));
  });

  it("given directed and object drives when scaling then directed ones are toward the counterpart, request ones resolve and unresolved ones are dropped", () => {
    const deltas = termDeltas(
      [driveTerm("justice", 1), driveTerm("RECEIVER", -3), driveTerm("GIVER", -1)],
      reader,
      one,
      { unit: 100, ...NEUTRAL_SCALING },
      plainDrive,
    );

    expect(deltas).toEqual([
      { kind: "DRIVE", who: two, drive: "justice", toward: one, delta: 100 },
      { kind: "DRIVE", who: two, drive: "material_security", toward: null, delta: -300 },
    ]);
  });
});
