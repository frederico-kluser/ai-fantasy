import { describe, expect, it } from "vitest";

import { aboutFact, aHistoryFact, aLabel, factIdOf, ids } from "../../test/support/acts.ts";
import {
  aBond,
  aCharacter,
  someDrives,
  someEmotions,
  someTraits,
} from "../../test/support/character.ts";
import { aDecisionScene } from "../../test/support/decision.ts";
import { idOf } from "../../test/support/space.ts";
import { toBp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import { createCopy } from "../memory/copy.ts";
import { lieVariant, npcVolume, offerObjects, requestObjects } from "./values.ts";

const knows = (fact: number, falseOffenders: readonly CharacterId[] | null = null) =>
  createCopy(factIdOf(fact), { perspective: "DIRECT" }, toBp(5000), falseOffenders);

describe("npcVolume (dialogue-acts §5)", () => {
  const withAnger = (anger: number) =>
    aDecisionScene(aCharacter(1, 0, { emotions: someEmotions({ anger }) }));

  it.each([
    [7000, "AGGRESSIVE", false, "SHOUT"],
    [6999, "AGGRESSIVE", false, "NORMAL"],
    [9000, "IRONIC", false, "NORMAL"],
    [0, "WARM", true, "SHOUT"],
    [0, "AGGRESSIVE", false, "NORMAL"],
  ] as const)(
    "given anger %i, a %s CHAT and a target that only hears a shout (%s) when choosing the volume then it is %s",
    (anger, tone, shouted, expected) => {
      expect(
        npcVolume(withAnger(anger), { act: "CHAT", tone, topic: { type: "SMALL_TALK" } }, shouted),
      ).toBe(expected);
    },
  );

  it("given a TELL of a secret from an angry author when choosing the volume then it is still a whisper", () => {
    expect(
      npcVolume(
        withAnger(9000),
        { act: "TELL", tone: "AGGRESSIVE", topic: aboutFact("SECRET", 0) },
        true,
      ),
    ).toBe("WHISPER");
  });
});

describe("requestObjects and offerObjects (dialogue-acts §5)", () => {
  it("given a directed drive pressing toward the target and not toward another when asking then the objects follow the target", () => {
    const author = aCharacter(1, 0, {
      drives: someDrives({
        weights: { desire: 9000, fun: 5000, purpose: 4000 },
        deficits: { fun: 5000, purpose: 5000 },
        directed: { desire: [[2, 9000]] },
      }),
    });
    const scene = aDecisionScene(author);

    expect([requestObjects(scene, idOf(2)), requestObjects(scene, idOf(3))]).toEqual([
      ["DATE"],
      ["FAVOR"],
    ]);
  });

  it("given a giver drive of weight 6999 when offering then it gives no object", () => {
    const scene = aDecisionScene(
      aCharacter(1, 0, { drives: someDrives({ weights: { care: 6999, influence: 7000 } }) }),
    );

    expect(offerObjects(scene)).toEqual(["INFORMATION", "MONEY", "FAVOR"]);
  });
});

describe("lieVariant (dialogue-acts §5)", () => {
  const liar = (overrides: Parameters<typeof aCharacter>[2] = {}) =>
    aCharacter(1, 0, { traits: someTraits({ honesty: -3000 }), ...overrides });
  const others = [aCharacter(4, 3), aCharacter(3, 2), aCharacter(2, 1)];
  const facts = [
    aHistoryFact(0, 9, 9, { offenders: ids(2) }),
    aHistoryFact(1, 9, 9, { offenders: ids(1) }),
    aHistoryFact(2, 9, 9),
  ];
  const tell = (fact: number) =>
    aLabel({ act: "TELL", targets: ids(2), topic: aboutFact("EVENT", fact) });

  it("given a fact the author itself offended in when lying then the lie denies", () => {
    const scene = aDecisionScene(liar({ memories: [knows(0), knows(1), knows(2)] }), {
      others,
      facts,
    });

    expect(lieVariant(scene, tell(1))).toStrictEqual({ ...tell(1), isFalse: true });
  });

  it("given a fact of an offender the author does not love, among others it knows, when lying then the most resented other is blamed", () => {
    const author = liar({
      memories: [knows(0), knows(1), knows(2)],
      bonds: [
        aBond(2, { affection: 5999, resentment: 9000 }),
        aBond(3, { resentment: 3000 }),
        aBond(4, { resentment: 2999 }),
      ],
    });
    const scene = aDecisionScene(author, { others, facts });

    expect(lieVariant(scene, tell(0))).toStrictEqual({ ...tell(0), isFalse: true, blamed: 3 });
  });

  it("given two others resented alike when lying then the lowest id is blamed; a stronger resentment wins over a lower id", () => {
    const blamed = (resentments: readonly [number, number]) =>
      lieVariant(
        aDecisionScene(
          liar({
            memories: [knows(2)],
            bonds: [
              aBond(3, { resentment: resentments[0] }),
              aBond(4, { resentment: resentments[1] }),
            ],
          }),
          { others, facts },
        ),
        tell(2),
      )?.blamed;

    expect([blamed([5000, 5000]), blamed([4000, 5000]), blamed([5000, 4000])]).toEqual([3, 4, 3]);
  });

  it("given an offender the author loves when lying then the lie denies", () => {
    const author = liar({
      memories: [knows(0)],
      bonds: [aBond(2, { affection: 6000 }), aBond(3, { resentment: 9000 })],
    });

    expect(lieVariant(aDecisionScene(author, { others, facts }), tell(0))?.blamed).toBeUndefined();
  });

  it("given the author's copy blames someone else when lying then that false offender decides", () => {
    const author = liar({
      memories: [knows(0, ids(3))],
      bonds: [aBond(2, { resentment: 9000 }), aBond(3, { affection: 6000 })],
    });

    expect(lieVariant(aDecisionScene(author, { others, facts }), tell(0))).toStrictEqual({
      ...tell(0),
      isFalse: true,
    });
  });

  it("given nobody resented enough when lying about a fact then there is no lie variant", () => {
    const author = liar({ memories: [knows(2)], bonds: [aBond(3, { resentment: 2999 })] });

    expect(lieVariant(aDecisionScene(author, { others, facts }), tell(2))).toBeNull();
  });

  it("given a TELL about a fact the author holds no copy of when lying then there is no lie variant", () => {
    const author = liar({ memories: [knows(2)], bonds: [aBond(3, { resentment: 9000 })] });

    expect(lieVariant(aDecisionScene(author, { others, facts }), tell(0))).toBeNull();
  });

  it.each([
    [aLabel({ act: "OFFER", object: "PROMISE" }), true],
    [aLabel({ act: "OFFER", object: "HELP" }), false],
    [aLabel({ act: "APOLOGIZE" }), true],
    [aLabel({ act: "CHAT", topic: aboutFact("EVENT", 2) }), false],
    [aLabel({ act: "TELL" }), false],
    [aLabel({ act: "APOLOGIZE", isFalse: true }), false],
  ] as const)(
    "given %j from a liar when lying then there is a lie variant: %s",
    (label, expected) => {
      const author = liar({ memories: [knows(2)], bonds: [aBond(3, { resentment: 9000 })] });
      const lie = lieVariant(aDecisionScene(author, { others, facts }), label);

      expect(lie !== null).toBe(expected);
    },
  );

  it("given an honest author when lying then there is no lie variant", () => {
    const author = aCharacter(1, 0, { traits: someTraits({ honesty: -2999 }) });

    expect(lieVariant(aDecisionScene(author), aLabel({ act: "APOLOGIZE" }))).toBeNull();
  });
});

describe("lieVariant reads the effective honesty", () => {
  it("given honesty 0 with a tendency of −10000 when lying then the author lies (0 + mulBp(−10000, 3000) = −3000)", () => {
    const author = aCharacter(1, 0, { tendencies: someTraits({ honesty: -10000 }) });

    expect(lieVariant(aDecisionScene(author), aLabel({ act: "APOLOGIZE" }))?.isFalse).toBe(true);
  });
});
