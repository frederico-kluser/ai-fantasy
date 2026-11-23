import { describe, expect, it } from "vitest";

import {
  aBond,
  aCharacter,
  aPerception,
  someEmotions,
  someTraits,
} from "../../test/support/character.ts";
import { ids } from "../../test/support/acts.ts";
import { idOf } from "../../test/support/space.ts";
import { specBiasTables, specLieWeight } from "../../test/support/spec-decision.ts";
import { toBipolarBp } from "../domain/bp.ts";
import type { ThingId } from "../domain/ids.ts";
import {
  associationBias,
  BOND_BIASES,
  bondBias,
  EMOTION_BIASES,
  emotionBias,
  LIE_WEIGHT,
  npcIntensity,
  PERCEPTION_BIASES,
  perceptionBias,
  TRAIT_BIASES,
  traitBias,
} from "./biases.ts";

/** A data table without its empty rows, as the document writes it. */
function asWritten(table: object) {
  return JSON.parse(JSON.stringify(table)) as unknown;
}

describe("the bias tables (dialogue-acts §9.3)", () => {
  const [emotions, traits, bonds, perceptions] = specBiasTables();

  it.each([
    ["emotions", EMOTION_BIASES, emotions],
    ["traits", TRAIT_BIASES, traits],
    ["bond", BOND_BIASES, bonds],
    ["perception", PERCEPTION_BIASES, perceptions],
  ] as const)(
    "given the %s table of the document when reading the data then every weight matches",
    (_name, data, written) => {
      expect(asWritten(data)).toEqual(written);
    },
  );

  it("given the honesty row of the document when reading the lie weight then it matches", () => {
    expect(LIE_WEIGHT).toBe(specLieWeight());
  });
});

describe("emotionBias", () => {
  it("given joy 4000 and anger 2000 when biasing a WARM PRAISE then each row adds mulBp(source, act + tone)", () => {
    const emotions = someEmotions({ joy: 4000, anger: 2000 });
    const joy = 1200; // 4000 × (1500 + 1500)
    const anger = -700; // 2000 × (−2000 − 1500)

    expect(emotionBias(emotions, "PRAISE", "WARM")).toBe(joy + anger);
  });
});

describe("traitBias", () => {
  it("given a trait with a tendency when biasing then the effective trait is the source", () => {
    const author = aCharacter(1, 0, {
      traits: someTraits({ humor: 4000 }),
      tendencies: someTraits({ humor: 10000 }),
    });

    expect(traitBias(author, "TEASE", "PLAYFUL", false)).toBe(2100); // 7000 × 3000
  });

  it("given a negative sociability when biasing STAY_SILENT then the bias is turned around", () => {
    const author = aCharacter(1, 0, { traits: someTraits({ sociability: -6000 }) });

    expect(traitBias(author, "STAY_SILENT", "NEUTRAL", false)).toBe(900);
  });

  it.each([
    [false, 0],
    [true, 1500],
  ] as const)(
    "given honesty −5000 and a lie variant %s when biasing then the lie adds %i",
    (isFalse, expected) => {
      const author = aCharacter(1, 0, { traits: someTraits({ honesty: -5000 }) });

      expect(traitBias(author, "TELL", "NEUTRAL", isFalse)).toBe(expected);
    },
  );
});

describe("bondBias and perceptionBias", () => {
  it("given affection 5000 and resentment 2000 when biasing a WARM OFFER then the rows add up", () => {
    const axes = aBond(2, { affection: 5000, resentment: 2000 }).axes;

    expect(bondBias(axes, "OFFER", "WARM")).toBe(1500 - 300);
  });

  it("given hostility 4000 when biasing an IRONIC ACCUSE then the act and the tone weights add up", () => {
    const values = aPerception(2, { perceivedHostility: 4000, perceivedSincerity: 9000 });

    expect(perceptionBias(values, "ACCUSE", "IRONIC")).toBe(800);
  });
});

describe("associationBias", () => {
  const author = aCharacter(1, 0, {
    associations: [
      { subject: { kind: "THING", thing: 3 as ThingId }, valence: toBipolarBp(-5000) },
      { subject: { kind: "TAG", tag: "forest" }, valence: toBipolarBp(4000) },
      { subject: { kind: "PERSON", person: idOf(7) }, valence: toBipolarBp(6000) },
    ],
  });

  it.each([
    ["CHAT", { type: "THING", thing: 3 as ThingId }, -1000],
    ["TELL", { type: "PLACE", place: "forest" }, 800],
    ["ASK", { type: "PERSON", person: 7 }, 1200],
    ["PRAISE", { type: "THING", thing: 3 as ThingId }, 0],
    ["CHAT", { type: "THING", thing: 4 as ThingId }, 0],
    ["CHAT", { type: "SMALL_TALK" }, 0],
  ] as const)(
    "given a %s about %j when biasing then the association adds %i",
    (act, topic, expected) => {
      expect(associationBias(author, act, topic as never, ids(2))).toBe(expected);
    },
  );

  it("given a topic about a person who is present when biasing then the association adds nothing", () => {
    expect(associationBias(author, "CHAT", { type: "PERSON", person: idOf(7) }, ids(7))).toBe(0);
  });
});

describe("npcIntensity (dialogue-acts §5)", () => {
  it("given joy 3000 and boredom 6000 when choosing a CHAT then the larger positive part (boredom) sets the intensity", () => {
    const emotions = someEmotions({ joy: 3000, boredom: 6000 });

    expect(npcIntensity(emotions, "CHAT", "NEUTRAL")).toBe(3000 + 4200);
  });

  it("given equal positive parts when choosing then the first emotion of the catalog wins", () => {
    const emotions = someEmotions({ joy: 2000, boredom: 3000 });

    expect(npcIntensity(emotions, "CHAT", "NEUTRAL")).toBe(3000 + 1400);
  });

  it("given only negative parts when choosing then the intensity is 3000", () => {
    const emotions = someEmotions({ fear: 9000 });

    expect(npcIntensity(emotions, "THREATEN", "NEUTRAL")).toBe(3000);
  });
});
