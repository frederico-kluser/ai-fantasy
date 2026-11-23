import { describe, expect, it } from "vitest";

import { aDrawer, defaultRules, forcing } from "../../test/support/acts.ts";
import { aBond, aCharacter, someTraits } from "../../test/support/character.ts";
import { idOf } from "../../test/support/space.ts";
import { toBipolarBp, toBp } from "../domain/bp.ts";
import { NO_BOND_AXES } from "../character/bonds.ts";
import type { ToneId } from "../presets/tones.ts";
import {
  confusionWeights,
  distanceBands,
  misreadChance,
  readerView,
  readTone,
  type ReaderView,
  type ToneReadingInput,
} from "./tone.ts";

const RULES = defaultRules();

/** A reader with perceptiveness 5000, trust in others 0 and no bond, with the overrides given. */
function aReader(overrides: Partial<ReaderView> = {}): ReaderView {
  return {
    perceptiveness: toBp(5000),
    trustInOthers: toBipolarBp(0),
    bond: NO_BOND_AXES,
    ...overrides,
  };
}

/** Listener 2 reading `tone` from 1 cell away, without noise. */
function near(tone: ToneId, reader: ReaderView): ToneReadingInput {
  return { tone, listener: idOf(2), reader, distance: 1, noise: toBp(0) };
}

const DISTRUSTFUL = aReader({
  perceptiveness: toBp(2000),
  trustInOthers: toBipolarBp(-6000),
  bond: aBond(1, { resentment: 3000, trust: 1000, affection: 1000 }).axes,
});

describe("misreadChance (dialogue-acts §3)", () => {
  it("given an IRONIC tone heard by a distrustful listener when interpreting then the misread chance follows the formula term by term", () => {
    const ambiguity = 2500;
    const distance = 500; // 5 cells: one band above 3
    const noise = 1500 / 5;
    const perceptiveness = -2000 / 4;
    const distrust = 6000 / 4;
    const badBond = (3000 - 1000) / 5;
    const goodBond = -1000 / 10;

    expect(misreadChance(ambiguity, 5, toBp(1500), DISTRUSTFUL)).toBe(
      ambiguity + distance + noise + perceptiveness + distrust + badBond + goodBond,
    );
  });

  it("given a trusting listener when interpreting then trust in others adds nothing", () => {
    const reader = aReader({ perceptiveness: toBp(0), trustInOthers: toBipolarBp(8000) });

    expect(misreadChance(2500, 1, toBp(0), reader)).toBe(2500);
  });

  it("given trust above resentment when interpreting then the bad bond adds nothing", () => {
    const reader = aReader({
      perceptiveness: toBp(0),
      bond: aBond(1, { trust: 5000, resentment: 1000 }).axes,
    });

    expect(misreadChance(2500, 1, toBp(0), reader)).toBe(2500);
  });

  it("given a sharp friend when interpreting then the chance is clamped at 0", () => {
    const reader = aReader({ perceptiveness: toBp(10000), bond: aBond(1, { affection: 10000 }).axes });

    expect(misreadChance(300, 1, toBp(0), reader)).toBe(0);
  });

  it("given every term at its worst when interpreting then the chance is clamped at 9000", () => {
    const reader = aReader({
      perceptiveness: toBp(0),
      trustInOthers: toBipolarBp(-10000),
      bond: aBond(1, { resentment: 10000 }).axes,
    });

    expect(misreadChance(2500, 30, toBp(10000), reader)).toBe(9000);
  });

  it.each([
    [1, 0],
    [3, 0],
    [4, 1],
    [6, 1],
    [7, 2],
    [12, 2],
    [13, 3],
    [40, 3],
  ])("given a distance of %i cells when banding then it is %i bands above 3", (distance, bands) => {
    expect(distanceBands(distance)).toBe(bands);
  });
});

describe("confusionWeights (dialogue-acts §3)", () => {
  it("given an IRONIC tone when weighing its confusions then worse is 10000 + resentment + distrust and better is 10000 + affection + attraction", () => {
    const reader = aReader({
      trustInOthers: toBipolarBp(-2000),
      bond: aBond(1, { resentment: 3000, affection: 1500, attraction: 500 }).axes,
    });

    expect(confusionWeights(RULES, "IRONIC", reader)).toStrictEqual({
      tones: ["AGGRESSIVE", "PLAYFUL"],
      weights: [10000 + 3000 + 2000, 10000 + 1500 + 500],
    });
  });

  it("given a trusting listener when weighing a worse confusion then trust in others adds nothing", () => {
    const reader = aReader({ trustInOthers: toBipolarBp(4000) });

    expect(confusionWeights(RULES, "NEUTRAL", reader).weights).toStrictEqual([10000]);
  });
});

describe("readerView", () => {
  it("given a listener with a bond toward the author when viewing then it reads perceptiveness, the effective trust in others and the bond", () => {
    const listener = aCharacter(2, 0, {
      traits: someTraits({ trustInOthers: -4000 }),
      tendencies: someTraits({ trustInOthers: -10000 }),
      bonds: [aBond(1, { affection: 7000 })],
    });

    expect(readerView(listener, idOf(1))).toStrictEqual({
      perceptiveness: 5000,
      trustInOthers: -4000 - 3000,
      bond: aBond(1, { affection: 7000 }).axes,
    });
  });
});

describe("readTone (dialogue-acts §3, stream perception)", () => {
  it("given a right reading when reading the tone then the tone stays and no confusion is drawn", () => {
    const drawer = aDrawer([forcing("TONE_MISREAD", 0, 2)]);

    expect(readTone(drawer, RULES, near("IRONIC", DISTRUSTFUL))).toStrictEqual({
      tone: "IRONIC",
      misread: false,
      chance: misreadChance(2500, 1, toBp(0), DISTRUSTFUL),
    });
    expect(drawer.finish().records.map((record) => record.purpose)).toStrictEqual([
      "TONE_MISREAD",
    ]);
  });

  it.each<[number, ToneId]>([
    [0, "AGGRESSIVE"],
    [1, "PLAYFUL"],
  ])(
    "given a misreading of IRONIC when the confusion draw gives %i then the tone read is %s",
    (index, read) => {
      const drawer = aDrawer([forcing("TONE_MISREAD", 1, 2), forcing("TONE_CONFUSION", index, 2)]);

      expect(readTone(drawer, RULES, near("IRONIC", DISTRUSTFUL))).toMatchObject({
        tone: read,
        misread: true,
      });
    },
  );

  it("given a misreading when drawing then both draws go to the perception stream with the listener as target", () => {
    const drawer = aDrawer([forcing("TONE_MISREAD", 1, 2)]);
    readTone(drawer, RULES, near("PLAYFUL", DISTRUSTFUL));

    expect(drawer.finish().records).toMatchObject([
      { stream: "perception", purpose: "TONE_MISREAD", target: 2, kind: "CHANCE" },
      {
        stream: "perception",
        purpose: "TONE_CONFUSION",
        target: 2,
        kind: "WEIGHTED",
        bound: (10000 + 3000 + 6000) * 2,
      },
    ]);
  });

  it("given a listener at a distance in noise when reading then the chance uses them", () => {
    const drawer = aDrawer();

    expect(
      readTone(drawer, RULES, { ...near("NEUTRAL", aReader()), distance: 7, noise: toBp(2000) })
        .chance,
    ).toBe(300 + 1000 + 400 - 1250);
  });
});
