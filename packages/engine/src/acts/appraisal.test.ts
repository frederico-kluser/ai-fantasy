import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  aboutFact,
  aDrawer,
  aLabel,
  anActFact,
  defaultObjects,
  factIdOf,
  forcing,
  ids,
} from "../../test/support/acts.ts";
import {
  aBond,
  aCharacter,
  arbitraryCharacter,
  rangeProblems,
  someDrives,
  someTraits,
} from "../../test/support/character.ts";
import { toBp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import { mulBp } from "../domain/math.ts";
import { createCopy } from "../memory/copy.ts";
import type { Fact } from "../memory/fact.ts";
import { recordAct } from "../memory/record.ts";
import { ACT_IDS } from "../presets/acts.ts";
import { TONE_IDS, type ToneId } from "../presets/tones.ts";
import { appraiseAct, ignoringDeltas, type AppraisalInput } from "./appraisal.ts";
import type { StateDelta } from "./deltas.ts";
import type { ActLabel, OutcomeBand } from "./label.ts";
import type { Obligation } from "./obligations.ts";
import type { ActPerspective } from "./perspectives.ts";
import type { ListenerView } from "./resolve.ts";

const [z, y, w, v] = ids(1, 2, 3, 4) as [CharacterId, CharacterId, CharacterId, CharacterId];
const OBJECTS = defaultObjects();
/** Intensity 5000: u = 400, half unit 200. */
const U = 400;

/** A DIRECT listener who read `tone`. */
function heard(id: number, _perspective: "DIRECT", tone: ToneId): ListenerView {
  return {
    id: id as CharacterId,
    perspective: "DIRECT",
    reading: { tone, misread: false, chance: toBp(0) },
  };
}

/** One who perceived the act without hearing it directly. */
function perceived(id: number, perspective: Exclude<ActPerspective, "DIRECT">): ListenerView {
  return { id: id as CharacterId, perspective, reading: null };
}

/** Author 1 does `label` (intensity 5000) heard by `listeners`, with the characters given. */
function anInput(
  label: Partial<ActLabel>,
  listeners: readonly ListenerView[],
  characters: readonly ReturnType<typeof aCharacter>[],
  more: Partial<AppraisalInput> = {},
): AppraisalInput {
  return {
    objects: OBJECTS,
    author: z,
    label: aLabel({ intensity: toBp(5000), ...label }),
    listeners,
    characters,
    facts: [],
    obligations: [],
    ...more,
  };
}

function deltasOf(
  input: AppraisalInput,
  forced: Parameters<typeof aDrawer>[0] = [],
): readonly StateDelta[] {
  return appraiseAct(aDrawer(forced), input).deltas;
}

function amount(deltas: readonly StateDelta[], who: CharacterId, what: string): number | undefined {
  return deltas.find(
    (delta) =>
      delta.who === who &&
      (
        [
          "emotion" in delta && delta.emotion,
          "axis" in delta && delta.axis,
          "drive" in delta && delta.drive,
          "value" in delta && delta.value,
        ] as readonly unknown[]
      ).includes(what),
  )?.delta;
}

describe("appraiseAct: targets (dialogue-acts §7.1 and §7.2, simulation-model §9)", () => {
  it("given a PLAYFUL accusation between friends with affection 6000 when appraising then negative effects are halved", () => {
    const facts: Fact[] = [{ ...anActFact(0, 2, aLabel()), offenders: [y] }];
    const author = aCharacter(1, 0, {
      memories: [createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0))],
    });
    const friend = aCharacter(2, 1, { bonds: [aBond(1, { affection: 6000 })] });
    const input = anInput(
      { act: "ACCUSE", tone: "PLAYFUL", targets: [y], topic: aboutFact("EVENT", 0) },
      [heard(2, "DIRECT", "PLAYFUL")],
      [author, friend],
      { facts },
    );

    const deltas = deltasOf(input);

    expect(amount(deltas, y, "anger")).toBe(mulBp(3 * U, 5000));
    expect(amount(deltas, y, "shame")).toBe(mulBp(2 * U, 5000));
    expect(amount(deltas, y, "trust")).toBe(mulBp(-2 * (U / 2), 5000));
    expect(amount(deltas, y, "dignity")).toBe(mulBp(3 * U, 5000));
    expect(appraiseAct(aDrawer(), input).valences).toEqual([{ id: y, valence: -1 }]);
  });

  it("given a SEDUCTIVE praise to someone with low attraction and negative romanticBoldness when appraising then shame rises instead of desire", () => {
    const shy = aCharacter(2, 1, {
      bonds: [aBond(1, { attraction: 4999 })],
      traits: someTraits({ romanticBoldness: 2000 }),
      tendencies: someTraits({ romanticBoldness: -10000 }),
    });
    const input = anInput(
      { act: "PRAISE", tone: "SEDUCTIVE", targets: [y], topic: { type: "PERSON", person: y } },
      [heard(2, "DIRECT", "SEDUCTIVE")],
      [aCharacter(1, 0), shy],
    );

    const deltas = deltasOf(input);

    expect(amount(deltas, y, "shame")).toBe(2 * U);
    expect(amount(deltas, y, "joy")).toBeUndefined();
    expect(amount(deltas, y, "desire")).toBeUndefined();
  });

  it("given a SEDUCTIVE praise read as WARM when appraising then the reading of the target rules its effects", () => {
    const input = anInput(
      { act: "PRAISE", tone: "SEDUCTIVE", targets: [y], topic: { type: "PERSON", person: y } },
      [heard(2, "DIRECT", "WARM")],
      [aCharacter(1, 0), aCharacter(2, 1)],
    );

    expect(amount(deltasOf(input), y, "joy")).toBe(mulBp(2 * U, 12000));
  });

  it("given a REFUSE to a question when appraising then the asker gets anger +1, trust -1 and curiosity +1", () => {
    const asked: Obligation = {
      debtor: z,
      creditor: y,
      fact: factIdOf(0),
      act: "ASK",
      topic: { type: "SMALL_TALK" },
      tick: 0,
    };
    const input = anInput(
      { act: "REFUSE", targets: [y] },
      [heard(2, "DIRECT", "NEUTRAL")],
      [aCharacter(1, 0), aCharacter(2, 1)],
      { obligations: [asked], facts: [anActFact(0, 2, aLabel({ act: "ASK", targets: [z] }))] },
    );

    expect(deltasOf(input).filter((delta) => delta.who === y)).toEqual([
      { kind: "EMOTION", who: y, emotion: "anger", delta: U },
      { kind: "BOND", who: y, toward: z, axis: "trust", delta: -U / 2 },
      { kind: "DRIVE", who: y, drive: "curiosity", toward: null, delta: U },
      { kind: "PERCEPTION", who: y, toward: z, value: "perceivedHostility", delta: 1000 },
    ]);
  });

  it("given a THREATEN when appraising then the target perceives threat +2000 and hostility +1000 per unit of valence", () => {
    const input = anInput(
      { act: "THREATEN", targets: [y], topic: { type: "PERSON", person: y } },
      [heard(2, "DIRECT", "NEUTRAL")],
      [aCharacter(1, 0), aCharacter(2, 1)],
    );
    const deltas = deltasOf(input);

    expect(amount(deltas, y, "perceivedThreat")).toBe(2000);
    expect(amount(deltas, y, "perceivedHostility")).toBe(3000);
  });

  it("given a GREET when appraising then the target perceives interest +500 per unit of valence", () => {
    const input = anInput(
      { act: "GREET", targets: [y], topic: { type: "PERSON", person: y } },
      [heard(2, "DIRECT", "NEUTRAL")],
      [aCharacter(1, 0), aCharacter(2, 1)],
    );

    expect(amount(deltasOf(input), y, "perceivedInterest")).toBe(500);
  });

  it.each([
    ["a resented author", { resentment: 6000 }, "PRAISE", { type: "PERSON", person: y }],
    ["a loved author", { affection: 6000 }, "ACCUSE", aboutFact("EVENT", 0)],
  ] as const)(
    "given a strong act from %s when appraising then surprise rises by 2 units and predictability by half",
    (_case, axes, act, topic) => {
      const tone = "NEUTRAL";
      const facts: Fact[] = [anActFact(0, 3, aLabel())];
      const author = aCharacter(1, 0, {
        memories: [createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0))],
      });
      const input = anInput(
        { act, tone, targets: [y], topic },
        [heard(2, "DIRECT", tone)],
        [author, aCharacter(2, 1, { bonds: [aBond(1, axes)] })],
        { facts },
      );
      const deltas = deltasOf(input);

      expect(amount(deltas, y, "surprise")).toBe(2 * U);
      expect(amount(deltas, y, "predictability")).toBe(U);
    },
  );

  it("given a PRAISE from someone barely resented (5999) when appraising then there is no surprise", () => {
    const input = anInput(
      { act: "PRAISE", targets: [y], topic: { type: "PERSON", person: y } },
      [heard(2, "DIRECT", "NEUTRAL")],
      [aCharacter(1, 0), aCharacter(2, 1, { bonds: [aBond(1, { resentment: 5999 })] })],
    );

    expect(amount(deltasOf(input), y, "surprise")).toBeUndefined();
  });

  it("given a GROUP act when appraising then every DIRECT listener is a target and the others are not appraised", () => {
    const input = anInput(
      { act: "GREET", targets: "GROUP", topic: { type: "SMALL_TALK" } },
      [heard(3, "DIRECT", "NEUTRAL"), heard(2, "DIRECT", "NEUTRAL"), perceived(4, "SEEN")],
      [aCharacter(1, 0), aCharacter(2, 1), aCharacter(3, 2), aCharacter(4, 9)],
    );

    expect(appraiseAct(aDrawer(), input).valences).toEqual([
      { id: y, valence: 1 },
      { id: w, valence: 1 },
    ]);
  });
});

describe("appraiseAct: witnesses and jealousy (dialogue-acts §7.4)", () => {
  it("given a hostile ACCUSE seen by a friend of the target when appraising then the witness gets half the emotions, anger, care and hostility", () => {
    const facts: Fact[] = [anActFact(0, 2, aLabel())];
    const author = aCharacter(1, 0, {
      memories: [createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0))],
    });
    const friend = aCharacter(3, 2, { bonds: [aBond(2, { affection: 6000 })] });
    const input = anInput(
      { act: "ACCUSE", targets: [y], topic: aboutFact("EVENT", 0) },
      [heard(3, "DIRECT", "NEUTRAL"), heard(2, "DIRECT", "NEUTRAL")],
      [author, aCharacter(2, 1), friend],
      { facts },
    );
    const witness = deltasOf(input).filter((delta) => delta.who === w);

    expect(witness).toEqual([
      { kind: "EMOTION", who: w, emotion: "anger", delta: mulBp(3 * U, 5000) + U },
      { kind: "DRIVE", who: w, drive: "care", toward: y, delta: 2 * U },
      { kind: "PERCEPTION", who: w, toward: z, value: "perceivedHostility", delta: 1000 },
    ]);
  });

  it("given a TELL of a new fact bad for Y to a witness with justice toward Y when appraising then the witness learns it and its justice falls", () => {
    const facts: Fact[] = [{ ...anActFact(0, 2, aLabel()), offenders: [y] }];
    const author = aCharacter(1, 0, {
      memories: [createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0))],
    });
    const avenger = aCharacter(3, 2, {
      drives: someDrives({ directed: { justice: [[2, 6000]] } }),
    });
    const input = anInput(
      { act: "TELL", targets: [v], topic: aboutFact("EVENT", 0) },
      [heard(3, "DIRECT", "NEUTRAL"), heard(4, "DIRECT", "NEUTRAL")],
      [author, aCharacter(2, 9), avenger, aCharacter(4, 1)],
      { facts },
    );
    const deltas = deltasOf(input);

    expect(amount(deltas, w, "curiosity")).toBe(-U);
    expect(amount(deltas, w, "justice")).toBe(-3 * U);
    expect(amount(deltas, w, "surprise")).toBe(mulBp(U, 5000));
  });

  it("given a SEDUCTIVE praise from Z to Y seen by Y's spouse when appraising then the spouse's jealousy rises by 2 units", () => {
    const spouse = aCharacter(3, 9, { bonds: [aBond(2, {}, ["SPOUSE"])] });
    const input = anInput(
      { act: "PRAISE", tone: "SEDUCTIVE", targets: [y], topic: { type: "PERSON", person: y } },
      [heard(2, "DIRECT", "SEDUCTIVE"), perceived(3, "SEEN")],
      [aCharacter(1, 0), aCharacter(2, 1), spouse],
    );
    const deltas = deltasOf(input);

    expect(amount(deltas, w, "jealousy")).toBe(2 * U);
    expect(amount(deltas, w, "resentment")).toBe(U / 2);
  });

  it.each([
    ["an admirer with attraction 6000", aBond(2, { attraction: 6000 }), "WARM", 2 * U],
    ["an admirer with attraction 5999", aBond(2, { attraction: 5999 }), "WARM", undefined],
    ["a partner", aBond(2, {}, ["PARTNER"]), "WARM", 2 * U],
    ["a partner, before a NEUTRAL act", aBond(2, {}, ["PARTNER"]), "NEUTRAL", undefined],
  ] as const)(
    "given a praise of Y seen by %s when appraising then jealousy is %s",
    (_case, bond, tone, jealousy) => {
      const input = anInput(
        { act: "PRAISE", tone, targets: [y], topic: { type: "PERSON", person: y } },
        [heard(2, "DIRECT", tone), perceived(3, "FRAGMENT")],
        [aCharacter(1, 0), aCharacter(2, 1), aCharacter(3, 9, { bonds: [bond] })],
      );

      expect(
        amount(
          deltasOf({ ...input, listeners: [heard(2, "DIRECT", tone), perceived(3, "SEEN")] }),
          w,
          "jealousy",
        ),
      ).toBe(jealousy);
      expect(amount(deltasOf(input), w, "jealousy")).toBeUndefined();
    },
  );
});

describe("appraiseAct: the author (dialogue-acts §7.3)", () => {
  it("given an honest liar when lying then guilt rises by one unit times the guilt factor", () => {
    const liar = aCharacter(1, 0, {
      traits: someTraits({ honesty: 2000 }),
      tendencies: someTraits({ honesty: 10000 }),
    });
    const input = anInput(
      { act: "APOLOGIZE", targets: [y], topic: { type: "PERSON", person: y }, isFalse: true },
      [heard(2, "DIRECT", "NEUTRAL")],
      [liar, aCharacter(2, 1)],
    );

    expect(amount(deltasOf(input), z, "guilt")).toBe(mulBp(U, 10000 + 2500));
  });

  it("given a liar with honesty 0 when lying then there is no guilt", () => {
    const input = anInput(
      { act: "APOLOGIZE", targets: [y], topic: { type: "PERSON", person: y }, isFalse: true },
      [heard(2, "DIRECT", "NEUTRAL")],
      [aCharacter(1, 0), aCharacter(2, 1)],
    );

    expect(amount(deltasOf(input), z, "guilt")).toBeUndefined();
  });

  it("given a hot author who threatens someone loved and someone it wants justice from when appraising then it feels guilt, relief and joy", () => {
    const author = aCharacter(1, 0, {
      traits: someTraits({ temper: 1 }),
      bonds: [aBond(2, { affection: 6000 })],
      drives: someDrives({ directed: { justice: [[3, 5000]] } }),
    });
    const input = anInput(
      { act: "THREATEN", targets: [y, w], topic: { type: "SMALL_TALK" } },
      [heard(3, "DIRECT", "PLAYFUL"), heard(2, "DIRECT", "NEUTRAL")],
      [author, aCharacter(2, 1), aCharacter(3, 2)],
    );
    const deltas = deltasOf(input).filter((delta) => delta.who === z);

    expect(deltas).toEqual([
      { kind: "EMOTION", who: z, emotion: "guilt", delta: U },
      { kind: "DRIVE", who: z, drive: "justice", toward: w, delta: -2 * U },
      { kind: "EMOTION", who: z, emotion: "joy", delta: mulBp(U, 10000) },
    ]);
  });

  it("given a GREET misread as AGGRESSIVE when appraising then the author is no offender: the real tone decides", () => {
    const input = anInput(
      { act: "GREET", targets: [y], topic: { type: "PERSON", person: y } },
      [heard(2, "DIRECT", "AGGRESSIVE")],
      [aCharacter(1, 0), aCharacter(2, 1)],
    );
    const appraisal = appraiseAct(aDrawer(), input);

    expect(appraisal.valences).toEqual([{ id: y, valence: -2 }]);
    expect(appraisal.record.offenders).toEqual([]);
  });

  it("given a real AGGRESSIVE TEASE when appraising then the author is the offender", () => {
    const input = anInput(
      { act: "TEASE", tone: "AGGRESSIVE", targets: [y], topic: { type: "PERSON", person: y } },
      [heard(2, "DIRECT", "PLAYFUL")],
      [aCharacter(1, 0), aCharacter(2, 1, { bonds: [aBond(1, { affection: 9000 })] })],
    );

    expect(appraiseAct(aDrawer(), input).record.offenders).toEqual([z]);
  });
});

describe("appraiseAct: request answers (dialogue-acts §8.3)", () => {
  const request = anActFact(
    0,
    2,
    aLabel({ act: "REQUEST", targets: [z], object: "MONEY", topic: { type: "PERSON", person: z } }),
  );
  const owed: Obligation = {
    debtor: z,
    creditor: y,
    fact: factIdOf(0),
    act: "REQUEST",
    topic: { type: "PERSON", person: z },
    tick: 0,
  };

  function answer(act: "ACCEPT" | "REFUSE", tone: ToneId, band?: OutcomeBand, intensity = 5000) {
    return anInput(
      { act, tone, targets: [y], topic: { type: "PERSON", person: z }, intensity: toBp(intensity) },
      [heard(2, "DIRECT", tone)],
      [aCharacter(1, 0), aCharacter(2, 1)],
      { facts: [request], obligations: [owed], band },
    );
  }

  it("given an ENTHUSIASTIC acceptance of a REQUEST of MONEY when appraising then the asker and the giver feel 8.3 and the band is recorded", () => {
    const input = answer("ACCEPT", "NEUTRAL", "ENTHUSIASTIC");
    const appraisal = appraiseAct(aDrawer(), input);

    expect(amount(appraisal.deltas, y, "joy")).toBe(3 * U);
    expect(amount(appraisal.deltas, y, "material_security")).toBe(-3 * U);
    expect(amount(appraisal.deltas, y, "dependence")).toBe(U / 2);
    expect(amount(appraisal.deltas, z, "influence")).toBe(-U);
    expect(amount(appraisal.deltas, z, "material_security")).toBe(U);
    expect(appraisal.record.band).toBe("ENTHUSIASTIC");
  });

  it("given a PARTIAL acceptance when appraising then the effects of 8.3 are halved", () => {
    const deltas = deltasOf(answer("ACCEPT", "NEUTRAL", "PARTIAL"));

    expect(amount(deltas, y, "joy")).toBe(U);
    expect(amount(deltas, z, "influence")).toBe(-U / 2);
  });

  it("given the player's warm, strong acceptance without a band when appraising then the band comes from the answer", () => {
    expect(appraiseAct(aDrawer(), answer("ACCEPT", "WARM", undefined, 7000)).record.band).toBe(
      "ENTHUSIASTIC",
    );
  });

  it("given a HARD_REFUSE when appraising then the asker resents the one who refused", () => {
    const deltas = deltasOf(answer("REFUSE", "AGGRESSIVE"));

    expect(amount(deltas, y, "resentment")).toBe(mulBp(2 * (U / 2), 15000));
    expect(amount(deltas, y, "influence")).toBe(mulBp(2 * U, 15000));
  });

  it("given an act that does not answer when appraising then the creditor suffers the ignored row", () => {
    const input = anInput(
      { act: "CHAT", targets: [] },
      [heard(2, "DIRECT", "NEUTRAL")],
      [aCharacter(1, 0), aCharacter(2, 1)],
      { facts: [request], obligations: [owed] },
    );

    expect(deltasOf(input)).toEqual([
      { kind: "EMOTION", who: y, emotion: "anger", delta: U },
      { kind: "BOND", who: y, toward: z, axis: "respect", delta: -U / 2 },
      { kind: "DRIVE", who: y, drive: "recognition", toward: null, delta: 2 * U },
    ]);
  });
});

describe("ignoringDeltas (simulation-model §10)", () => {
  it("given an obligation ignored when appraising then the creditor gets the STAY_SILENT row at intensity 5000 with its temper", () => {
    const owed: Obligation = {
      debtor: z,
      creditor: y,
      fact: factIdOf(0),
      act: "ASK",
      topic: { type: "SMALL_TALK" },
      tick: 0,
    };
    const hot = aCharacter(2, 1, { traits: someTraits({ temper: 4000 }) });

    expect(ignoringDeltas([aCharacter(1, 0), hot], [owed])).toEqual([
      { kind: "EMOTION", who: y, emotion: "anger", delta: mulBp(400, 12000) },
      { kind: "BOND", who: y, toward: z, axis: "respect", delta: -200 },
      { kind: "DRIVE", who: y, drive: "recognition", toward: null, delta: 800 },
    ]);
  });
});

describe("ignoringDeltas without the creditor", () => {
  it("given an obligation whose creditor left when appraising then nothing happens", () => {
    const owed: Obligation = {
      debtor: z,
      creditor: y,
      fact: factIdOf(0),
      act: "ASK",
      topic: { type: "SMALL_TALK" },
      tick: 0,
    };

    expect(ignoringDeltas([aCharacter(1, 0)], [owed])).toEqual([]);
  });
});

describe("appraiseAct: inputs", () => {
  it("given a listener who is not present when appraising then it is a programming error", () => {
    const input = anInput(
      { act: "GREET", targets: [y] },
      [heard(2, "DIRECT", "NEUTRAL")],
      [aCharacter(1, 0)],
    );

    expect(() => appraiseAct(aDrawer(), input)).toThrow(RangeError);
  });

  it("given a DIRECT listener without a reading when appraising then it reads the real tone", () => {
    const input = anInput(
      { act: "PRAISE", tone: "WARM", targets: [y], topic: { type: "PERSON", person: y } },
      [{ id: y, perspective: "DIRECT", reading: null }],
      [aCharacter(1, 0), aCharacter(2, 1)],
    );

    expect(amount(deltasOf(input), y, "joy")).toBe(mulBp(2 * U, 12000));
  });

  it("given an answer to an obligation of a history fact when appraising then there is no object", () => {
    const owed: Obligation = {
      debtor: z,
      creditor: y,
      fact: factIdOf(0),
      act: "REQUEST",
      topic: { type: "PERSON", person: z },
      tick: 0,
    };
    const input = anInput(
      { act: "ACCEPT", targets: [y], topic: { type: "PERSON", person: z } },
      [heard(2, "DIRECT", "NEUTRAL")],
      [aCharacter(1, 0), aCharacter(2, 1)],
      {
        facts: [
          {
            kind: "HISTORY",
            id: factIdOf(0),
            event: "betrayed_trust",
            author: y,
            subject: z,
            offenders: [],
            secret: false,
          },
        ],
        obligations: [owed],
        band: "ACCEPT",
      },
    );
    const deltas = deltasOf(input);

    expect(amount(deltas, y, "influence")).toBe(-2 * U);
    expect(amount(deltas, y, "material_security")).toBeUndefined();
  });
});

describe("appraiseAct: interruption (simulation-model §11 item 4)", () => {
  it("given an act over a pending obligation of the last act when appraising then the debtor's anger and recognition rise and its respect for the interrupter falls", () => {
    const asked = anActFact(0, 3, aLabel({ act: "ASK", targets: [y] }));
    const owed: Obligation = {
      debtor: y,
      creditor: w,
      fact: factIdOf(0),
      act: "ASK",
      topic: { type: "SMALL_TALK" },
      tick: 0,
    };
    const input = anInput(
      { act: "CHAT", targets: [] },
      [],
      [
        aCharacter(1, 0),
        aCharacter(2, 1, { traits: someTraits({ temper: -4000 }) }),
        aCharacter(3, 2),
      ],
      { facts: [asked], obligations: [owed] },
    );

    expect(deltasOf(input)).toEqual([
      { kind: "EMOTION", who: y, emotion: "anger", delta: mulBp(U, 8000) },
      { kind: "DRIVE", who: y, drive: "recognition", toward: null, delta: U },
      { kind: "BOND", who: y, toward: z, axis: "respect", delta: -U / 2 },
    ]);
  });
});

describe("appraiseAct: lies (dialogue-acts §5, simulation-model §12)", () => {
  const facts: Fact[] = [{ ...anActFact(0, 1, aLabel()), offenders: [z] }];
  const liar = aCharacter(1, 0, {
    memories: [createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0))],
  });
  const lie = {
    act: "TELL" as const,
    targets: [y],
    topic: aboutFact("EVENT", 0),
    isFalse: true,
    blamed: v,
  };

  it("given a believed lie that blames Z when recording then the listener's copy names Z as the offender and is marked false", () => {
    const input = anInput(
      lie,
      [heard(2, "DIRECT", "NEUTRAL")],
      [liar, aCharacter(2, 1), aCharacter(4, 9)],
      { facts },
    );
    const appraisal = appraiseAct(aDrawer([forcing("LIE_BELIEF", 1, 2)]), input);
    const recorded = recordAct({
      facts,
      tick: 1,
      author: z,
      label: input.label,
      perceived: [{ id: y, perspective: "DIRECT" }],
      characters: appraisal.characters,
      appraisal: appraisal.record,
    });

    expect(recorded.characters[1]?.memories[0]).toMatchObject({
      fact: 0,
      perspective: "TOLD",
      falseOffenders: [v],
    });
    expect(appraisal.lies).toEqual([{ listener: y, kind: "BELIEVED" }]);
    expect(amount(appraisal.deltas, y, "surprise")).toBe(U);
  });

  it("given a doubted lie when appraising then the listener finds the liar less sincere and learns nothing new", () => {
    const input = anInput(lie, [heard(2, "DIRECT", "NEUTRAL")], [liar, aCharacter(2, 1)], {
      facts,
    });
    const appraisal = appraiseAct(aDrawer([forcing("LIE_BELIEF", 0, 2)]), input);

    expect(appraisal.record.believers).toEqual([]);
    expect(amount(appraisal.deltas, y, "perceivedSincerity")).toBe(-1500);
    expect(amount(appraisal.deltas, y, "surprise")).toBeUndefined();
  });

  it("given a lie detected by a witness when appraising then trust drops 1500 and the new fact matters 3000 more to it", () => {
    const witness = aCharacter(2, 1, {
      memories: [createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0))],
    });
    const silent = { ...lie, targets: [v], intensity: toBp(0) };
    const input = anInput(
      silent,
      [heard(2, "DIRECT", "NEUTRAL")],
      [liar, witness, aCharacter(4, 9)],
      {
        facts,
      },
    );
    const appraisal = appraiseAct(aDrawer([forcing("LIE_DETECT", 1, 2)]), input);
    const importance = appraisal.record.importances?.find((entry) => entry.id === y)?.importance;

    expect(appraisal.lies).toEqual([{ listener: y, kind: "DETECTED" }]);
    expect(amount(appraisal.deltas, y, "trust")).toBe(-1500);
    expect(importance).toBe(2 * (1500 + 1000) + 3000);
  });

  it("given a truth when appraising then nobody is asked to believe it", () => {
    const input = anInput(
      { act: "TELL", targets: [y], topic: aboutFact("EVENT", 0) },
      [heard(2, "DIRECT", "NEUTRAL")],
      [liar, aCharacter(2, 1)],
      { facts },
    );
    const appraisal = appraiseAct(aDrawer(), input);

    expect(appraisal.lies).toEqual([]);
    expect(appraisal.record.believers).toBeUndefined();
  });
});

describe("appraiseAct: importance and ranges (simulation-model §12 and §18)", () => {
  it("given a GREET when appraising then each one's importance sums its deltas and involvement", () => {
    const input = anInput(
      { act: "GREET", targets: [y], topic: { type: "PERSON", person: y } },
      [heard(2, "DIRECT", "NEUTRAL"), perceived(3, "SEEN")],
      [aCharacter(1, 0), aCharacter(2, 1), aCharacter(3, 9)],
    );

    expect(appraiseAct(aDrawer(), input).record.importances).toEqual([
      { id: z, importance: 3000 },
      { id: y, importance: U + 2 * (3 * (U / 2)) + 3000 },
      { id: w, importance: 0 },
    ]);
  });

  it("given any act, tone and characters when appraising then every value stays in its scale", () => {
    const characters = fc.tuple(
      arbitraryCharacter(1, 0, [2, 3]),
      arbitraryCharacter(2, 1, [1, 3]),
      arbitraryCharacter(3, 2, [1, 2]),
    );
    fc.assert(
      fc.property(
        characters,
        fc.constantFrom(...ACT_IDS),
        fc.constantFrom(...TONE_IDS),
        fc.integer({ min: 0, max: 10000 }),
        (cast, act, tone, intensity) => {
          const input = anInput(
            {
              act,
              tone,
              targets: [y],
              topic: { type: "PERSON", person: y },
              intensity: toBp(intensity),
            },
            [heard(2, "DIRECT", tone), heard(3, "DIRECT", tone)],
            cast,
          );

          expect(appraiseAct(aDrawer(), input).characters.flatMap(rangeProblems)).toEqual([]);
        },
      ),
    );
  });
});
