import { describe, expect, it } from "vitest";

import {
  aboutFact,
  aHistoryFact,
  aLabel,
  anActFact,
  factIdOf,
  ids,
} from "../../test/support/acts.ts";
import { aBond, aCharacter, someDrives } from "../../test/support/character.ts";
import { toBipolarBp, toBp } from "../domain/bp.ts";
import type { CharacterId, ThingId } from "../domain/ids.ts";
import { createCopy } from "../memory/copy.ts";
import {
  actInterests,
  badSubjects,
  rowContext,
  topicInterests,
  toldOffenders,
} from "./appraisal-context.ts";
import type { Topic } from "./label.ts";

const [one, two, three] = ids(1, 2, 3) as [CharacterId, CharacterId, CharacterId];

function person(id: number): Topic {
  return { type: "PERSON", person: id as CharacterId };
}

describe("topicInterests (simulation-model §5.2)", () => {
  const reader = aCharacter(2, 0, {
    bonds: [aBond(3, { resentment: 5000 }), aBond(4, { affection: 4999, attraction: 4999 })],
    drives: someDrives({ directed: { care: [[5, 3000]], justice: [[6, 2999]] } }),
    associations: [
      { subject: { kind: "THING", thing: 9 as ThingId }, valence: toBipolarBp(-4000) },
      { subject: { kind: "TAG", tag: "forest" }, valence: toBipolarBp(3000) },
    ],
    memories: [
      createCopy(factIdOf(3), { perspective: "SEEN" }, toBp(0)),
      createCopy(factIdOf(7), { perspective: "SEEN" }, toBp(0)),
    ],
  });
  const present = ids(1, 2, 3, 4);

  it.each<[string, Topic, boolean]>([
    ["the reader itself", person(2), true],
    ["someone present it resents (5000)", person(3), true],
    ["someone present it barely likes (4999)", person(4), false],
    ["a target of a directed drive (3000)", person(5), true],
    ["a weak directed drive (2999)", person(6), false],
    ["an associated thing", { type: "THING", thing: 9 as ThingId }, true],
    ["another thing", { type: "THING", thing: 8 as ThingId }, false],
    ["an associated tag", { type: "PLACE", place: "forest" }, true],
    ["another tag", { type: "PLACE", place: "water" }, false],
    ["the place of the scene", { type: "PLACE", place: "SCENE" }, false],
    ["a fact it knows", aboutFact("RUMOR", 7), true],
    ["a fact it does not know", aboutFact("EVENT", 6), false],
    ["a feeling", { type: "FEELING", feeling: { kind: "EMOTION", emotion: "joy" } }, false],
    ["small talk", { type: "SMALL_TALK" }, false],
  ])(
    "given a topic about %s when checking the interest then it is %s",
    (_case, topic, interests) => {
      expect(topicInterests(reader, topic, present)).toBe(interests);
    },
  );

  it("given someone it resents who is not present when checking then the bond does not count", () => {
    expect(topicInterests(reader, person(3), ids(1, 2))).toBe(false);
  });
});

describe("fact versions (dialogue-acts §4 and §5)", () => {
  const fact = anActFact(0, 3, aLabel({ act: "TEASE" }));
  const offended = { ...fact, offenders: [three] };

  it("given a true TELL when reading the version told then it is the teller's copy version, or the fact's", () => {
    const told = aLabel({ act: "TELL", topic: aboutFact("EVENT", 0) });
    const falseCopy = createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0), [one]);
    const trueCopy = createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0));

    expect(toldOffenders(told, offended, falseCopy)).toEqual([one]);
    expect(toldOffenders(told, offended, trueCopy)).toEqual([three]);
  });

  it.each([
    [
      "blames someone",
      aLabel({ act: "TELL", topic: aboutFact("EVENT", 0), isFalse: true, blamed: two }),
      [two],
    ],
    ["denies", aLabel({ act: "TELL", topic: aboutFact("EVENT", 0), isFalse: true }), []],
  ])(
    "given a lie that %s when reading the version told then the offenders are %j",
    (_case, lie, offenders) => {
      expect(toldOffenders(lie, offended, undefined)).toEqual(offenders);
    },
  );

  it("given a true TELL without the teller's copy when reading the version told then it is the fact's", () => {
    const told = aLabel({ act: "TELL", topic: aboutFact("EVENT", 0) });

    expect(toldOffenders(told, offended, undefined)).toEqual([three]);
  });

  it("given a secret when finding who the fact is bad for then its author joins the offenders, once", () => {
    const secret = aHistoryFact(0, 2, 3, { secret: true });

    expect(badSubjects(secret, [three], "SECRET")).toEqual([two, three]);
    expect(badSubjects(secret, [two], "SECRET")).toEqual([two]);
    expect(badSubjects(secret, [three], "EVENT")).toEqual([three]);
  });
});

describe("rowContext (dialogue-acts §7.1)", () => {
  const author = aCharacter(1, 0, {
    memories: [createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0))],
  });
  const facts = [{ ...anActFact(0, 3, aLabel()), offenders: [two] }];

  function contextOf(
    label = aLabel(),
    believers: readonly CharacterId[] | null = null,
    reader = aCharacter(2, 0),
  ) {
    return rowContext({
      author,
      label,
      facts,
      present: ids(1, 2),
      reader,
      subject: two,
      tone: "IRONIC",
      answer: null,
      believers,
    });
  }

  it("given a TELL of a fact the subject offended in when building the context then it is new and bad for the subject", () => {
    const context = contextOf(aLabel({ act: "TELL", topic: aboutFact("EVENT", 0) }));

    expect([context.tone, context.newFact, context.badFact, context.secret]).toEqual([
      "IRONIC",
      true,
      true,
      false,
    ]);
  });

  it("given a lie the reader did not believe when building the context then the fact is not new", () => {
    const lie = aLabel({ act: "TELL", topic: aboutFact("EVENT", 0), isFalse: true });

    expect(contextOf(lie, ids(3)).newFact).toBe(false);
    expect(contextOf(lie, ids(2)).newFact).toBe(true);
  });

  it("given a lie that blames someone else when building the context then the fact is no longer bad for the subject", () => {
    const lie = aLabel({ act: "TELL", topic: aboutFact("EVENT", 0), isFalse: true, blamed: three });

    expect(contextOf(lie, ids(2)).badFact).toBe(false);
  });

  it("given a fact the reader knows when building the context then it is not new", () => {
    const reader = aCharacter(2, 0, {
      memories: [
        createCopy(factIdOf(0), { perspective: "TOLD", tellerFidelity: toBp(9000) }, toBp(0)),
      ],
    });

    expect(
      contextOf(aLabel({ act: "TELL", topic: aboutFact("EVENT", 0) }), null, reader).newFact,
    ).toBe(false);
  });

  it("given an ASK about a fact the subject offended in when building the context then it is bad for the subject by the record", () => {
    expect(contextOf(aLabel({ act: "ASK", topic: aboutFact("EVENT", 0) })).badFact).toBe(true);
  });

  it("given an ACCUSE of the offender when building the context then the accusation is true", () => {
    expect(contextOf(aLabel({ act: "ACCUSE", topic: aboutFact("EVENT", 0) })).accusationTrue).toBe(
      true,
    );
  });

  it("given a TELL of a SECRET when building the context then it is a secret told", () => {
    expect(contextOf(aLabel({ act: "TELL", topic: aboutFact("SECRET", 0) })).secret).toBe(true);
    expect(contextOf(aLabel({ act: "ASK", topic: aboutFact("SECRET", 0) })).secret).toBe(true);
  });

  it("given several facts and copies when building the context of a TELL then the fact told and the teller's copy of it count", () => {
    const facts2 = [
      { ...anActFact(0, 3, aLabel()), offenders: [three] },
      { ...anActFact(1, 3, aLabel()), offenders: [three] },
    ];
    const teller = aCharacter(1, 0, {
      memories: [
        createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0)),
        createCopy(factIdOf(1), { perspective: "DIRECT" }, toBp(0), [two]),
      ],
    });
    const reader = aCharacter(2, 0, {
      memories: [createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0))],
    });
    const context = rowContext({
      author: teller,
      label: aLabel({ act: "TELL", topic: aboutFact("EVENT", 1) }),
      facts: facts2,
      present: ids(1, 2),
      reader,
      subject: two,
      tone: "NEUTRAL",
      answer: null,
      believers: null,
    });

    expect([context.newFact, context.badFact]).toEqual([true, true]);
  });

  it("given an ASK about a fact the asker holds in a false version when building the context then the record decides", () => {
    const teller = aCharacter(1, 0, {
      memories: [createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0), [three])],
    });
    const context = rowContext({
      author: teller,
      label: aLabel({ act: "ASK", topic: aboutFact("EVENT", 0) }),
      facts,
      present: ids(1, 2),
      reader: aCharacter(2, 0),
      subject: two,
      tone: "NEUTRAL",
      answer: null,
      believers: null,
    });

    expect([context.badFact, context.accusationTrue]).toEqual([true, false]);
  });

  it.each([
    ["a TELL about a person", aLabel({ act: "TELL", topic: { type: "PERSON", person: three } })],
    [
      "an ACCUSE of a fact not in the record",
      aLabel({ act: "ACCUSE", topic: aboutFact("EVENT", 9) }),
    ],
    ["a CHAT about small talk", aLabel()],
  ])(
    "given %s heard by someone with memories when building the context then nothing about a fact holds",
    (_case, label) => {
      const reader = aCharacter(2, 0, {
        memories: [createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0))],
      });
      const context = contextOf(label, null, reader);

      expect([context.newFact, context.badFact, context.accusationTrue]).toEqual([
        false,
        false,
        false,
      ]);
    },
  );

  it("given a CHAT about small talk when building the context then nothing about a fact holds", () => {
    const context = contextOf();

    expect([context.newFact, context.badFact, context.accusationTrue, context.secret]).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });
});

describe("actInterests (simulation-model §5.2)", () => {
  const reader = aCharacter(2, 0);

  it.each<[string, boolean, Topic, boolean]>([
    ["addressed, about small talk", true, { type: "SMALL_TALK" }, true],
    ["not addressed, about itself", false, { type: "PERSON", person: two }, true],
    ["not addressed, about small talk", false, { type: "SMALL_TALK" }, false],
  ])(
    "given an act %s when checking the interest then the result is as the rule says",
    (_case, addressed, topic, interests) => {
      expect(actInterests(reader, topic, ids(1, 2), addressed)).toBe(interests);
    },
  );
});
