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
import { aDecisionScene } from "../../test/support/decision.ts";
import { idOf } from "../../test/support/space.ts";
import { toBipolarBp, toBp } from "../domain/bp.ts";
import type { ThingId } from "../domain/ids.ts";
import { createCopy } from "../memory/copy.ts";
import { acceptsTopic, candidateTopics, factTopic, salientTopics } from "./topics.ts";

const knows = (fact: number, importance = 5000, told = false) =>
  createCopy(
    factIdOf(fact),
    [
      { perspective: "DIRECT" } as const,
      { perspective: "TOLD", tellerFidelity: toBp(8000) } as const,
    ][Number(told)] ?? { perspective: "DIRECT" },
    toBp(importance),
  );
const personOf = (id: number) => ({ type: "PERSON", person: idOf(id) }) as const;
const target = aCharacter(2, 1);

describe("salientTopics (simulation-model §10 item 2)", () => {
  it("given every source of salience when listing then they come in the order of the rule, without repetition", () => {
    const facts = [
      aHistoryFact(0, 3, 9),
      anActFact(1, 3, aLabel({ targets: ids(1), topic: personOf(7) })),
    ];
    const author = aCharacter(1, 0, {
      drives: someDrives({
        weights: { care: 7000, intimacy: 7000 },
        directed: { care: [[3, 100]] },
      }),
      bonds: [aBond(2, { attraction: 6000, affection: 6000, resentment: 1000 })],
      memories: [knows(0)],
      associations: [
        { subject: { kind: "PERSON", person: idOf(9) }, valence: toBipolarBp(5000) },
        { subject: { kind: "TAG", tag: "dark" }, valence: toBipolarBp(5000) },
        { subject: { kind: "THING", thing: 4 as ThingId }, valence: toBipolarBp(-5000) },
      ],
    });
    const scene = aDecisionScene(author, {
      others: [aCharacter(3, 2), target],
      facts,
      now: { noise: toBp(0), vision: 20, presentTags: [] },
    });

    expect(salientTopics(scene, target)).toEqual([
      personOf(7),
      personOf(2), // intimacy: every deficit 0, the lowest id of the present others
      personOf(3), // care: 3 has the highest deficit
      aboutFact("EVENT", 0),
      { type: "FEELING", feeling: { kind: "BOND", axis: "affection" } },
      { type: "THING", thing: 4 },
      { type: "SMALL_TALK" },
    ]);
  });

  it("given a present tag of an association when listing then the tag is a place topic", () => {
    const author = aCharacter(1, 0, {
      associations: [{ subject: { kind: "TAG", tag: "dark" }, valence: toBipolarBp(5000) }],
    });
    const scene = aDecisionScene(author, {
      now: { noise: toBp(0), vision: 20, presentTags: ["dark"] },
    });

    expect(salientTopics(scene, null)).toEqual([
      { type: "PLACE", place: "dark" },
      { type: "SMALL_TALK" },
    ]);
  });

  const bondFeeling = (axis: string) => ({ type: "FEELING", feeling: { kind: "BOND", axis } });

  it.each([
    [{ affection: 5999, attraction: 5999, resentment: 5999 }, []],
    [{ resentment: 6000 }, [bondFeeling("resentment")]],
    [{ attraction: 7000, resentment: 7000 }, [bondFeeling("attraction")]],
  ] as const)("given the bond %j when listing then the feeling items are %j", (axes, expected) => {
    const scene = aDecisionScene(aCharacter(1, 0, { bonds: [aBond(2, axes)] }), {
      others: [target],
    });
    const feelings = salientTopics(scene, target).filter((topic) => topic.type === "FEELING");

    expect(feelings).toEqual(expected);
  });

  it("given a fact involving only the author and an absent person when listing then it is not salient", () => {
    const scene = aDecisionScene(aCharacter(1, 0, { memories: [knows(0)] }), {
      others: [target],
      facts: [aHistoryFact(0, 1, 9)],
    });

    expect(salientTopics(scene, null)).toEqual([{ type: "SMALL_TALK" }]);
  });

  it("given two facts with a present when listing then the more important wins, ties to the more recent", () => {
    const facts = [aHistoryFact(0, 2, 9), aHistoryFact(1, 2, 9), aHistoryFact(2, 2, 9)];
    const pick = (importances: readonly number[]) =>
      salientTopics(
        aDecisionScene(
          aCharacter(1, 0, { memories: importances.map((value, id) => knows(id, value)) }),
          {
            others: [target],
            facts,
          },
        ),
        null,
      )[0];

    expect([pick([1000, 3000, 2000]), pick([3000, 3000, 2000])]).toEqual([
      aboutFact("EVENT", 1),
      aboutFact("EVENT", 1),
    ]);
  });
});

describe("factTopic", () => {
  it.each([
    [false, false, "EVENT"],
    [false, true, "RUMOR"],
    [true, true, "SECRET"],
  ] as const)(
    "given a fact secret %s known by telling %s when naming it then it is a %s",
    (secret, told, type) => {
      expect(factTopic(aHistoryFact(0, 2, 3, { secret }), knows(0, 0, told)).type).toBe(type);
    },
  );
});

describe("candidateTopics", () => {
  it("given more than 4 salient topics and a secret when generating CHAT then the secret is filtered out before the limit of 4", () => {
    const facts = [
      aHistoryFact(0, 2, 3, { secret: true }),
      anActFact(1, 3, aLabel({ targets: ids(1), topic: personOf(7) })),
    ];
    const author = aCharacter(1, 0, {
      memories: [knows(0)],
      drives: someDrives({ weights: { care: 7000 } }),
      bonds: [aBond(2, { affection: 9000 })],
      associations: [{ subject: { kind: "THING", thing: 4 as ThingId }, valence: toBipolarBp(1) }],
    });
    const scene = aDecisionScene(author, { others: [target, aCharacter(3, 2)], facts });

    expect(candidateTopics(scene, "CHAT", target)).toEqual([
      personOf(7),
      personOf(2),
      { type: "FEELING", feeling: { kind: "BOND", axis: "affection" } },
      { type: "THING", thing: 4 },
    ]);
  });

  it("given the author's copy blames 3 for a fact of 2 when generating ACCUSE then 3 is accused of it and 2 of nothing", () => {
    const facts = [aHistoryFact(0, 2, 1, { offenders: ids(2) })];
    const copy = { ...knows(0), falseOffenders: ids(3) };
    const scene = aDecisionScene(aCharacter(1, 0, { memories: [copy] }), {
      others: [target, aCharacter(3, 2)],
      facts,
    });

    expect([
      candidateTopics(scene, "ACCUSE", target),
      candidateTopics(scene, "ACCUSE", aCharacter(3, 2)),
    ]).toEqual([[], [aboutFact("EVENT", 0)]]);
  });

  it("given an offence of the author against the target when generating APOLOGIZE then the topic is that fact; without one, the target", () => {
    const facts = [
      aHistoryFact(0, 1, 2, { offenders: ids(1) }),
      aHistoryFact(1, 1, 3, { offenders: ids(1) }),
    ];
    const scene = aDecisionScene(aCharacter(1, 0, { memories: [knows(0), knows(1)] }), {
      others: [target, aCharacter(3, 2), aCharacter(4, 3)],
      facts,
    });

    expect([
      candidateTopics(scene, "APOLOGIZE", target),
      candidateTopics(scene, "APOLOGIZE", aCharacter(4, 3)),
    ]).toEqual([[aboutFact("EVENT", 0)], [personOf(4)]]);
  });

  it("given an act of the author addressed to the target with an offence when generating APOLOGIZE then that act is the topic", () => {
    const offence = {
      ...anActFact(0, 1, aLabel({ act: "TEASE", targets: ids(2) })),
      offenders: ids(1),
    };
    const scene = aDecisionScene(aCharacter(1, 0, { memories: [knows(0)] }), {
      others: [target],
      facts: [offence],
    });

    expect(candidateTopics(scene, "APOLOGIZE", target)).toEqual([aboutFact("EVENT", 0)]);
  });

  it("given a secret offence of the target when generating THREATEN then the target and the blackmail are the topics", () => {
    const facts = [
      aHistoryFact(0, 2, 3, { offenders: ids(2), secret: true }),
      aHistoryFact(1, 2, 3, { offenders: ids(2) }),
    ];
    const scene = aDecisionScene(aCharacter(1, 0, { memories: [knows(0), knows(1, 9000)] }), {
      others: [target],
      facts,
    });

    expect(candidateTopics(scene, "THREATEN", target)).toEqual([
      personOf(2),
      aboutFact("SECRET", 0),
    ]);
  });

  it("given a group when generating GREET then the topic is small talk", () => {
    expect(candidateTopics(aDecisionScene(aCharacter(1, 0)), "GREET", null)).toEqual([
      { type: "SMALL_TALK" },
    ]);
  });

  it("given an act without speech when generating then the topic is NONE", () => {
    expect(candidateTopics(aDecisionScene(aCharacter(1, 0)), "TOUCH", target)).toEqual([
      { type: "NONE" },
    ]);
  });

  it("given a TELL when generating then the most important secret comes after the salient topics", () => {
    const facts = [
      aHistoryFact(0, 9, 9, { secret: true }),
      aHistoryFact(1, 9, 9, { secret: true }),
    ];
    const scene = aDecisionScene(aCharacter(1, 0, { memories: [knows(0, 4000), knows(1, 2000)] }), {
      others: [target],
      facts,
    });

    expect(candidateTopics(scene, "TELL", target)).toEqual([
      personOf(2),
      { type: "SMALL_TALK" },
      aboutFact("SECRET", 0),
    ]);
  });
});

describe("acceptsTopic (dialogue-acts §4)", () => {
  const scene = aDecisionScene(aCharacter(1, 0, { memories: [knows(0)] }), {
    facts: [aHistoryFact(0, 2, 3), aHistoryFact(1, 2, 3)],
  });

  it.each([
    ["TELL", aboutFact("EVENT", 0), true],
    ["TELL", aboutFact("EVENT", 1), false],
    ["ASK", aboutFact("EVENT", 1), true],
    ["CHAT", aboutFact("SECRET", 0), false],
    ["PRAISE", { type: "SMALL_TALK" }, false],
    ["REFUSE", { type: "SMALL_TALK" }, false],
  ] as const)(
    "given a %s about %j when filtering then it is accepted: %s",
    (act, topic, expected) => {
      expect(acceptsTopic(scene, act, topic)).toBe(expected);
    },
  );
});

describe("topics: more of the rules", () => {
  it("given a dominant directed drive and nobody else present when listing then it gives no person", () => {
    const author = aCharacter(1, 0, { drives: someDrives({ weights: { care: 9000 } }) });

    expect(salientTopics(aDecisionScene(author), null)).toEqual([{ type: "SMALL_TALK" }]);
  });

  it("given the last act addressed to the author is a TOUCH when listing then its topic is not salient", () => {
    const facts = [
      anActFact(0, 2, aLabel({ act: "TOUCH", targets: ids(1), topic: { type: "NONE" } })),
    ];

    expect(salientTopics(aDecisionScene(aCharacter(1, 0), { facts }), null)).toEqual([
      { type: "SMALL_TALK" },
    ]);
  });

  it.each([
    [personOf(2), [aboutFact("EVENT", 0)]],
    [personOf(3), [personOf(2)]],
  ] as const)(
    "given an offence of the author addressed to nobody about %j when generating APOLOGIZE to 2 then the topics are %j",
    (topic, expected) => {
      const offence = {
        ...anActFact(0, 1, aLabel({ act: "TEASE", targets: [], topic })),
        offenders: ids(1),
      };
      const scene = aDecisionScene(aCharacter(1, 0, { memories: [knows(0)] }), {
        others: [target],
        facts: [offence],
      });

      expect(candidateTopics(scene, "APOLOGIZE", target)).toEqual(expected);
    },
  );

  it.each(["ACCUSE", "APOLOGIZE", "THREATEN"] as const)(
    "given the GROUP when generating %s then there is no topic",
    (act) => {
      const scene = aDecisionScene(aCharacter(1, 0, { memories: [knows(0)] }), {
        others: [target],
        facts: [aHistoryFact(0, 2, 1, { offenders: ids(2), secret: true })],
      });

      expect(candidateTopics(scene, act, null)).toEqual([]);
    },
  );

  it("given an act fact addressed to a present other when listing then it is a salient fact", () => {
    const facts = [anActFact(0, 9, aLabel({ targets: ids(2) }))];
    const scene = aDecisionScene(aCharacter(1, 0, { memories: [knows(0)] }), {
      others: [target],
      facts,
    });

    expect(salientTopics(scene, null)[0]).toEqual(aboutFact("EVENT", 0));
  });
});
