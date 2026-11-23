import { describe, expect, it } from "vitest";

import { aLabel, anActFact, ids } from "../../test/support/acts.ts";
import {
  aBody,
  aCharacter,
  someDrives,
  someEmotions,
  someTraits,
} from "../../test/support/character.ts";
import { anObligation } from "../../test/support/decision.ts";
import { toBp } from "../domain/bp.ts";
import { createCopy } from "../memory/copy.ts";
import { factIdOf } from "../../test/support/acts.ts";
import { socialPressure, urgeToAct, type UrgeContext } from "./urge.ts";

const context = (overrides: Partial<UrgeContext> = {}): UrgeContext => ({
  present: ids(1, 2, 3),
  facts: [],
  obligations: [],
  silentTicks: 0,
  ...overrides,
});

describe("urgeToAct (simulation-model §11 item 2)", () => {
  it("given known inputs for every term when computing the urge then it follows the formula term by term", () => {
    const character = aCharacter(1, 0, {
      traits: someTraits({ sociability: 2000 }),
      tendencies: someTraits({ sociability: 10000 }),
      emotions: someEmotions({ anger: 5000, joy: 4000 }),
      drives: someDrives({ weights: { company: 8000 }, deficits: { company: 5000 } }),
      body: aBody({ fatigue: 7001 }),
    });
    const asked = anActFact(0, 2, aLabel({ act: "ASK", targets: ids(1) }));
    const input = context({
      facts: [asked],
      obligations: [anObligation(1, 2, 0, "ASK", asked.label.topic)],
      silentTicks: 30,
    });
    const base = 2000;
    const trait = 2250; // effective sociability 5000: 15000 × 3000 / 20000
    const addressed = 4000 + 1000;
    const emotion = 1500; // the highest, anger 5000 × 3000
    const pressure = 800; // company: mulBp(8000, 5000) × 2000
    const silence = 1125; // min(30 × 50, 3000) = 1500, × 15000 / 20000
    const fatigue = -1000; // (7001 − 5000) / 2, truncated

    expect(urgeToAct(character, input)).toBe(
      base + trait + addressed + emotion + pressure + silence + fatigue,
    );
  });

  it("given 100 silent ticks when computing the urge then the silence term stops at 3000", () => {
    const character = aCharacter(1, 0, { traits: someTraits({ sociability: 10000 }) });

    expect(urgeToAct(character, context({ silentTicks: 100 }))).toBe(2000 + 3000 + 3000);
  });

  it("given the last act addressed to someone else when computing the urge then it adds nothing", () => {
    const facts = [
      anActFact(0, 2, aLabel({ targets: ids(1) })),
      anActFact(1, 2, aLabel({ targets: ids(3) })),
    ];

    expect(urgeToAct(aCharacter(1, 0), context({ facts }))).toBe(3500);
  });

  it("given a GROUP act heard directly when computing the urge then it was addressed to the character", () => {
    const facts = [anActFact(0, 2, aLabel({ targets: "GROUP" }))];
    const heard = aCharacter(1, 0, {
      memories: [createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0))],
    });
    const fragment = aCharacter(1, 0, {
      memories: [createCopy(factIdOf(0), { perspective: "FRAGMENT" }, toBp(0))],
    });

    expect([urgeToAct(heard, context({ facts })), urgeToAct(fragment, context({ facts }))]).toEqual(
      [7500, 3500],
    );
  });

  it("given an obligation of an older act when computing the urge then the last act adds no obligation bonus", () => {
    const facts = [
      anActFact(0, 2, aLabel({ act: "ASK", targets: ids(1) })),
      anActFact(1, 3, aLabel({ targets: ids(1) })),
    ];
    const obligations = [anObligation(1, 2, 0, "ASK", { type: "SMALL_TALK" })];

    expect(urgeToAct(aCharacter(1, 0), context({ facts, obligations }))).toBe(7500);
  });
});

describe("socialPressure (simulation-model §11 item 2)", () => {
  it("given a pressing level 2 drive and a lighter level 4 one when reading then only levels 3 to 5 count", () => {
    const character = aCharacter(1, 0, {
      drives: someDrives({
        weights: { physical_safety: 10000, recognition: 5000 },
        deficits: { physical_safety: 4000, recognition: 4000 },
      }),
    });

    expect(socialPressure(character, ids(1, 2))).toBe(2000);
  });

  it("given a directed drive toward an absent and a present person when reading then only the present one counts", () => {
    const character = aCharacter(1, 0, {
      drives: someDrives({
        weights: { care: 10000 },
        directed: {
          care: [
            [2, 3000],
            [9, 9000],
          ],
        },
      }),
    });

    expect(socialPressure(character, ids(1, 2))).toBe(3000);
  });
});
