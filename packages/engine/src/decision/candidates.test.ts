import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  aboutFact,
  aHistoryFact,
  aLabel,
  anActFact,
  factIdOf,
  ids,
} from "../../test/support/acts.ts";
import {
  aBond,
  aCharacter,
  someDrives,
  someEmotions,
  someTraits,
} from "../../test/support/character.ts";
import {
  aDecisionScene,
  anObligation,
  arbitraryDecisionScene,
} from "../../test/support/decision.ts";
import { gridOf, idOf } from "../../test/support/space.ts";
import { validateAct } from "../acts/validate.ts";
import { toBp } from "../domain/bp.ts";
import { createCopy } from "../memory/copy.ts";
import type { ActId } from "../presets/acts.ts";
import { generateCandidates } from "./candidates.ts";
import type { DecisionScene } from "./scene.ts";
import type { Candidate } from "./utility.ts";

/** `act tone targets topic`, with ` *` for an answer and ` lie` for a lie. */
const MARKS = new Map([
  [true, " *"],
  [false, ""],
]);
const LIES = new Map([
  [true, " lie"],
  [false, ""],
]);

function summary({ label, answers }: Candidate): string {
  const marks = `${MARKS.get(answers) ?? ""}${LIES.get(label.isFalse) ?? ""}`;
  return `${label.act} ${label.tone} ${JSON.stringify(label.targets)} ${label.topic.type}${marks}`;
}

function ofAct(scene: DecisionScene, act: ActId): Candidate[] {
  return generateCandidates(scene).filter((candidate) => candidate.label.act === act);
}

const personOf = (id: number) => ({ type: "PERSON", person: idOf(id) }) as const;
const knows = (fact: number, importance = 5000) =>
  createCopy(factIdOf(fact), { perspective: "DIRECT" }, toBp(importance));

describe("generateCandidates: answers owed (simulation-model §10 item 1)", () => {
  const creditor = aCharacter(2, 1);

  it("given a character owing an answer to a REQUEST with band REFUSE when generating candidates then only REFUSE and STAY_SILENT are offered", () => {
    const topic = personOf(1);
    const request = anActFact(
      0,
      2,
      aLabel({ act: "REQUEST", targets: ids(1), topic, object: "HELP" }),
    );
    const scene = aDecisionScene(aCharacter(1, 0), {
      others: [creditor],
      facts: [request],
      obligations: [anObligation(1, 2, 0, "REQUEST", topic)],
      bands: [{ fact: factIdOf(0), debtor: idOf(1), band: "REFUSE" }],
    });

    expect(generateCandidates(scene).map(summary)).toEqual([
      "REFUSE NEUTRAL [2] PERSON *",
      "STAY_SILENT WARM [] NONE",
    ]);
  });

  it.each([
    [{ affection: 5000 }, "WARM"],
    [{ resentment: 5000 }, "NEUTRAL"],
  ] as const)(
    "given a bond %j with who asked when answering an ACCEPT band then the tone is the one of higher bias, %s",
    (axes, tone) => {
      const topic = personOf(1);
      const request = anActFact(
        0,
        2,
        aLabel({ act: "OFFER", targets: ids(1), topic, object: "HELP" }),
      );
      const scene = aDecisionScene(aCharacter(1, 0, { bonds: [aBond(2, axes)] }), {
        others: [creditor],
        facts: [request],
        obligations: [anObligation(1, 2, 0, "OFFER", topic)],
        bands: [{ fact: factIdOf(0), debtor: idOf(1), band: "ACCEPT" }],
      });

      expect(ofAct(scene, "ACCEPT").map((candidate) => candidate.label.tone)).toEqual([tone]);
    },
  );

  it("given an ENTHUSIASTIC band when answering then the ACCEPT is WARM with intensity 8000", () => {
    const topic = personOf(1);
    const request = anActFact(0, 2, aLabel({ act: "THREATEN", targets: ids(1), topic }));
    const scene = aDecisionScene(aCharacter(1, 0), {
      others: [creditor],
      facts: [request],
      obligations: [anObligation(1, 2, 0, "THREATEN", topic)],
      bands: [{ fact: factIdOf(0), debtor: idOf(1), band: "ENTHUSIASTIC" }],
    });

    expect(ofAct(scene, "ACCEPT").map(({ label }) => [label.tone, label.intensity])).toEqual([
      ["WARM", 8000],
    ]);
  });

  it("given a request owed whose band was not drawn when generating then it is a programming error", () => {
    const topic = personOf(1);
    const scene = aDecisionScene(aCharacter(1, 0), {
      others: [creditor],
      facts: [anActFact(0, 2, aLabel({ act: "REQUEST", targets: ids(1), topic, object: "HELP" }))],
      obligations: [anObligation(1, 2, 0, "REQUEST", topic)],
    });

    expect(() => generateCandidates(scene)).toThrow(RangeError);
  });

  it("given a question about a fact the author knows when generating then TELL and REFUSE come in 3 tones each", () => {
    const topic = aboutFact("EVENT", 0);
    const scene = aDecisionScene(aCharacter(1, 0, { memories: [knows(0)] }), {
      others: [creditor],
      facts: [
        aHistoryFact(0, 2, 3),
        anActFact(1, 2, aLabel({ act: "ASK", targets: ids(1), topic })),
      ],
      obligations: [anObligation(1, 2, 1, "ASK", topic)],
    });

    expect(generateCandidates(scene).map(summary)).toEqual([
      "TELL WARM [2] EVENT *",
      "TELL NEUTRAL [2] EVENT *",
      "TELL PLAYFUL [2] EVENT *",
      "REFUSE WARM [2] EVENT *",
      "REFUSE NEUTRAL [2] EVENT *",
      "REFUSE PLAYFUL [2] EVENT *",
      "STAY_SILENT WARM [] NONE",
    ]);
  });

  it("given a question about a fact the author does not know when generating then only REFUSE answers it", () => {
    const topic = aboutFact("EVENT", 0);
    const scene = aDecisionScene(aCharacter(1, 0), {
      others: [creditor],
      facts: [
        aHistoryFact(0, 2, 3),
        anActFact(1, 2, aLabel({ act: "ASK", targets: ids(1), topic })),
      ],
      obligations: [anObligation(1, 2, 1, "ASK", topic)],
    });

    expect(new Set(generateCandidates(scene).map(({ label }) => label.act))).toEqual(
      new Set(["REFUSE", "STAY_SILENT"]),
    );
  });

  it("given a true accusation and an offence of the accuser when generating then APOLOGIZE, a lying REFUSE and an ACCUSE back are offered", () => {
    const topic = aboutFact("EVENT", 0);
    const author = aCharacter(1, 0, { memories: [knows(0), knows(1)] });
    const scene = aDecisionScene(author, {
      others: [creditor],
      facts: [
        aHistoryFact(0, 1, 2, { offenders: ids(1) }),
        aHistoryFact(1, 2, 1, { offenders: ids(2) }),
        anActFact(2, 2, aLabel({ act: "ACCUSE", targets: ids(1), topic })),
      ],
      obligations: [anObligation(1, 2, 2, "ACCUSE", topic)],
    });
    const answers = generateCandidates(scene).filter((candidate) => candidate.answers);

    expect(answers.map(({ label }) => [label.act, label.isFalse, label.topic])).toEqual([
      ["APOLOGIZE", false, topic],
      ["APOLOGIZE", false, topic],
      ["APOLOGIZE", false, topic],
      ["REFUSE", true, topic],
      ["REFUSE", true, topic],
      ["REFUSE", true, topic],
      ["ACCUSE", false, aboutFact("EVENT", 1)],
      ["ACCUSE", false, aboutFact("EVENT", 1)],
      ["ACCUSE", false, aboutFact("EVENT", 1)],
    ]);
  });

  it("given an obligation to someone who left when generating then only STAY_SILENT is offered", () => {
    const topic = personOf(1);
    const scene = aDecisionScene(aCharacter(1, 0), {
      facts: [anActFact(0, 2, aLabel({ act: "ASK", targets: ids(1), topic }))],
      obligations: [anObligation(1, 2, 0, "ASK", topic)],
    });

    expect(generateCandidates(scene).map(summary)).toEqual(["STAY_SILENT WARM [] NONE"]);
  });

  it("given a creditor that only hears a shout when answering then the answer is shouted", () => {
    const topic = personOf(1);
    const scene = aDecisionScene(aCharacter(1, 0), {
      others: [aCharacter(2, 10)],
      facts: [anActFact(0, 2, aLabel({ act: "ASK", targets: ids(1), topic, volume: "SHOUT" }))],
      obligations: [anObligation(1, 2, 0, "ASK", topic)],
    });

    expect(new Set(ofAct(scene, "REFUSE").map(({ label }) => label.volume))).toEqual(
      new Set(["SHOUT"]),
    );
  });
});

describe("generateCandidates: more answers", () => {
  it("given two questions owed out of order when generating then the answers follow the fact order", () => {
    const first = anActFact(0, 3, aLabel({ act: "ASK", targets: ids(1), topic: personOf(3) }));
    const second = anActFact(1, 2, aLabel({ act: "ASK", targets: ids(1), topic: personOf(2) }));
    const scene = aDecisionScene(aCharacter(1, 0), {
      others: [aCharacter(2, 1), aCharacter(3, 2)],
      facts: [first, second],
      obligations: [
        anObligation(1, 2, 1, "ASK", personOf(2)),
        anObligation(1, 3, 0, "ASK", personOf(3)),
      ],
    });
    const targets = generateCandidates(scene)
      .filter(({ label }) => label.act === "REFUSE")
      .map(({ label }) => JSON.stringify(label.targets));

    expect([...new Set(targets)]).toEqual(["[3]", "[2]"]);
  });

  it("given a question about a secret from someone at 2 cells when generating then the secret is not told, only refused", () => {
    const topic = aboutFact("SECRET", 0);
    const scene = aDecisionScene(aCharacter(1, 0, { memories: [knows(0)] }), {
      others: [aCharacter(2, 2)],
      facts: [
        aHistoryFact(0, 2, 3, { secret: true }),
        anActFact(1, 2, aLabel({ act: "ASK", targets: ids(1), topic })),
      ],
      obligations: [anObligation(1, 2, 1, "ASK", topic)],
    });

    expect(new Set(generateCandidates(scene).map(({ label }) => label.act))).toEqual(
      new Set(["REFUSE", "STAY_SILENT"]),
    );
  });

  it("given a creditor beyond the reach of a shout when generating then only STAY_SILENT is offered", () => {
    const topic = personOf(1);
    const scene = aDecisionScene(aCharacter(1, 0), {
      grid: gridOf([".".repeat(40)]),
      others: [aCharacter(2, 35)],
      facts: [anActFact(0, 2, aLabel({ act: "ASK", targets: ids(1), topic }))],
      obligations: [anObligation(1, 2, 0, "ASK", topic)],
    });

    expect(generateCandidates(scene).map(summary)).toEqual(["STAY_SILENT WARM [] NONE"]);
  });

  it("given someone beyond the reach of a shout when generating then only STAY_SILENT is left (no voice reaches and no sight)", () => {
    const scene = aDecisionScene(aCharacter(1, 0), {
      grid: gridOf([".".repeat(40)]),
      others: [aCharacter(2, 35)],
    });

    expect(generateCandidates(scene).map(summary)).toEqual(["STAY_SILENT WARM [] NONE"]);
  });
});

describe("generateCandidates: targets (simulation-model §10 item 2)", () => {
  const scene = aDecisionScene(aCharacter(1, 0), {
    others: [aCharacter(5, 10), aCharacter(4, 4), aCharacter(3, 2), aCharacter(2, 1)],
  });
  const targetsOf = (act: ActId) => [
    ...new Set(ofAct(scene, act).map(({ label }) => JSON.stringify([label.targets, label.volume]))),
  ];

  it("given others near and far when generating CHAT then each hearer in id order comes first, the far one shouted, then the group", () => {
    expect(targetsOf("CHAT")).toEqual([
      '[[2],"NORMAL"]',
      '[[3],"NORMAL"]',
      '[[4],"NORMAL"]',
      '[[5],"SHOUT"]',
      '["GROUP","NORMAL"]',
    ]);
  });

  it.each([
    ["TOUCH", ['[[2],"NORMAL"]']],
    ["APPROACH", ['[[3],"NORMAL"]', '[[4],"NORMAL"]', '[[5],"NORMAL"]']],
    ["WITHDRAW", ['[[2],"NORMAL"]', '[[3],"NORMAL"]']],
    ["PRAISE", ['[[2],"NORMAL"]', '[[3],"NORMAL"]', '[[4],"NORMAL"]', '[[5],"SHOUT"]']],
    ["STAY_SILENT", ['[[],"NORMAL"]']],
  ] as const)(
    "given others at 1, 2, 4 and 10 cells when generating %s then the targets are %j",
    (act, expected) => {
      expect(targetsOf(act)).toEqual(expected);
    },
  );

  it("given only one listener when generating GREET then there is no GROUP", () => {
    const alone = aDecisionScene(aCharacter(1, 0), { others: [aCharacter(2, 1)] });

    expect(ofAct(alone, "GREET").map(summary)).toEqual([
      "GREET WARM [2] PERSON",
      "GREET NEUTRAL [2] PERSON",
      "GREET PLAYFUL [2] PERSON",
    ]);
  });

  it("given a GROUP greeting when generating then its topic is small talk", () => {
    expect(
      ofAct(scene, "GREET")
        .filter(({ label }) => label.targets === "GROUP")
        .map(({ label }) => label.topic.type),
    ).toEqual(["SMALL_TALK", "SMALL_TALK", "SMALL_TALK"]);
  });
});

describe("generateCandidates: pre-conditions (dialogue-acts §9.1)", () => {
  it("given a greeting to 2 in this slice and one in a previous slice to 3 when generating GREET then only 3 is greeted", () => {
    const facts = [
      anActFact(0, 1, aLabel({ act: "GREET", targets: ids(3), topic: personOf(3) })),
      anActFact(1, 1, aLabel({ act: "GREET", targets: ids(2), topic: personOf(2) })),
    ];
    const scene = aDecisionScene(aCharacter(1, 0), {
      others: [aCharacter(2, 1), aCharacter(3, 2)],
      facts,
      sliceStart: 1,
    });

    expect(
      new Set(ofAct(scene, "GREET").map(({ label }) => JSON.stringify(label.targets))),
    ).toEqual(new Set(["[3]"]));
  });

  it.each([
    [1999, [], []],
    [2000, [], ["[2]", "[3]"]],
    [0, [anActFact(0, 2, aLabel({ act: "ACCUSE", targets: ids(1) }))], ["[2]"]],
    [0, [anActFact(0, 3, aLabel({ act: "ACCUSE", targets: ids(1) }))], ["[3]"]],
  ] as const)(
    "given guilt %i and accusations %j when generating APOLOGIZE then the targets are %j",
    (guilt, facts, expected) => {
      const scene = aDecisionScene(aCharacter(1, 0, { emotions: someEmotions({ guilt }) }), {
        others: [aCharacter(2, 1), aCharacter(3, 2)],
        facts,
      });
      const targets = new Set(
        ofAct(scene, "APOLOGIZE").map(({ label }) => JSON.stringify(label.targets)),
      );

      expect(targets).toEqual(new Set<string>(expected));
    },
  );

  it("given a secret and the target at 2 cells when generating TELL then the secret is not offered; at 1 cell it is whispered", () => {
    const facts = [aHistoryFact(0, 2, 3, { secret: true })];
    const author = aCharacter(1, 0, { memories: [knows(0)] });
    const tellSecret = (cell: number) =>
      ofAct(aDecisionScene(author, { others: [aCharacter(2, cell)], facts }), "TELL")
        .filter(({ label }) => label.topic.type === "SECRET")
        .map(({ label }) => label.volume);

    expect([tellSecret(2), tellSecret(1)]).toEqual([[], ["WHISPER", "WHISPER", "WHISPER"]]);
  });
});

describe("generateCandidates: tones, objects and lies (simulation-model §10, dialogue-acts §5)", () => {
  it("given no bias when generating then the 3 tones are the first of the catalog", () => {
    const scene = aDecisionScene(aCharacter(1, 0), { others: [aCharacter(2, 1)] });

    expect(ofAct(scene, "TEASE").map(({ label }) => label.tone)).toEqual([
      "WARM",
      "NEUTRAL",
      "PLAYFUL",
    ]);
  });

  it("given an angry author when generating TEASE then the 3 tones of highest bias come in bias order and the aggressive one is shouted", () => {
    const author = aCharacter(1, 0, { emotions: someEmotions({ anger: 8000 }) });
    const scene = aDecisionScene(author, { others: [aCharacter(2, 1)] });

    expect([
      ...new Set(ofAct(scene, "TEASE").map(({ label }) => `${label.tone} ${label.volume}`)),
    ]).toEqual(["AGGRESSIVE SHOUT", "IRONIC NORMAL", "NEUTRAL NORMAL"]);
  });

  it("given the author's two most pressing drives when generating REQUEST then each object of those drives is asked for, about the target", () => {
    const author = aCharacter(1, 0, {
      drives: someDrives({
        weights: { physical_safety: 5000, curiosity: 9000, fun: 9000 },
        deficits: { physical_safety: 9000, curiosity: 6000, fun: 4000 },
      }),
    });
    const scene = aDecisionScene(author, { others: [aCharacter(2, 1)] });
    const asked = ofAct(scene, "REQUEST").filter(({ label }) => label.tone === "WARM");

    expect(asked.map(({ label }) => [label.object, label.topic])).toEqual([
      ["HELP", personOf(2)],
      ["INFORMATION", personOf(2)],
    ]);
  });

  it("given an author whose salient topics are all facts when generating REQUEST candidates then the topic is PERSON of the target", () => {
    const facts = [aHistoryFact(0, 2, 3, { offenders: ids(2) }), aHistoryFact(1, 3, 2)];
    const last = anActFact(
      2,
      2,
      aLabel({ act: "ASK", targets: ids(1), topic: aboutFact("EVENT", 0) }),
    );
    const author = aCharacter(1, 0, {
      memories: [knows(0), knows(1)],
      drives: someDrives({ weights: { curiosity: 9000 }, deficits: { curiosity: 9000 } }),
    });
    const scene = aDecisionScene(author, { others: [aCharacter(2, 1)], facts: [...facts, last] });

    expect(
      new Set(ofAct(scene, "REQUEST").map(({ label }) => JSON.stringify(label.topic))),
    ).toEqual(new Set([JSON.stringify(personOf(2))]));
  });

  it("given dominant drives served by giving when generating OFFER then each object whose giver drive is dominant is offered", () => {
    const author = aCharacter(1, 0, {
      drives: someDrives({ weights: { company: 7000, desire: 7000 } }),
    });
    const scene = aDecisionScene(author, { others: [aCharacter(2, 1)] });

    expect([...new Set(ofAct(scene, "OFFER").map(({ label }) => label.object))]).toEqual([
      "COMPANY",
      "DATE",
    ]);
  });

  it("given a liar who resents a present when generating a TELL of a fact then the lie blames that person", () => {
    const facts = [aHistoryFact(0, 2, 3)];
    const author = aCharacter(1, 0, {
      traits: someTraits({ honesty: -3000 }),
      bonds: [aBond(3, { resentment: 3000 }), aBond(4, { resentment: 2999 })],
      memories: [knows(0)],
    });
    const scene = aDecisionScene(author, {
      others: [aCharacter(4, 3), aCharacter(3, 2), aCharacter(2, 1)],
      facts,
    });
    const lies = ofAct(scene, "TELL").filter(({ label }) => label.isFalse);

    expect(new Set(lies.map(({ label }) => label.blamed))).toEqual(new Set([idOf(3)]));
  });

  it("given a liar whose friend is the offender when generating a TELL of the fact then the lie denies", () => {
    const facts = [aHistoryFact(0, 2, 3, { offenders: ids(2) })];
    const author = aCharacter(1, 0, {
      traits: someTraits({ honesty: -3000 }),
      bonds: [aBond(2, { affection: 6000 }), aBond(3, { resentment: 9000 })],
      memories: [knows(0)],
    });
    const scene = aDecisionScene(author, { others: [aCharacter(2, 1), aCharacter(3, 2)], facts });
    const lies = ofAct(scene, "TELL").filter(
      ({ label }) => label.isFalse && label.topic.type === "EVENT",
    );

    expect(lies.map(({ label }) => label.blamed ?? "denies").slice(0, 1)).toEqual(["denies"]);
  });

  it("given an honest author of honesty −2999 when generating then nothing is a lie", () => {
    const author = aCharacter(1, 0, {
      traits: someTraits({ honesty: -2999 }),
      emotions: someEmotions({ guilt: 5000 }),
      drives: someDrives({ weights: { intimacy: 9000 } }),
    });
    const scene = aDecisionScene(author, { others: [aCharacter(2, 1)] });

    expect(generateCandidates(scene).filter(({ label }) => label.isFalse)).toEqual([]);
  });

  it("given a liar when generating APOLOGIZE and an OFFER of PROMISE then each has a lie variant right after the truth", () => {
    const author = aCharacter(1, 0, {
      traits: someTraits({ honesty: -5000 }),
      emotions: someEmotions({ guilt: 5000 }),
      drives: someDrives({ weights: { intimacy: 9000 } }),
    });
    const scene = aDecisionScene(author, { others: [aCharacter(2, 1)] });
    const marked = (act: ActId) => ofAct(scene, act).slice(0, 2).map(summary);

    expect([marked("APOLOGIZE"), marked("OFFER")]).toEqual([
      ["APOLOGIZE WARM [2] PERSON", "APOLOGIZE WARM [2] PERSON lie"],
      ["OFFER WARM [2] PERSON", "OFFER WARM [2] PERSON lie"],
    ]);
  });
});

describe("generateCandidates: every candidate is a valid act (property)", () => {
  it("given any scene when generating candidates then each one passes the validation of the act", () => {
    fc.assert(
      fc.property(arbitraryDecisionScene(), (scene) => {
        const context = { ...scene, noise: scene.now.noise };
        const invalid = generateCandidates(scene)
          .map(({ label }) => ({ label, result: validateAct(label, context) }))
          .filter(({ result }) => !result.ok);

        expect(invalid).toEqual([]);
      }),
      { numRuns: 150 },
    );
  });

  it("given any scene when generating candidates then STAY_SILENT is offered exactly once", () => {
    fc.assert(
      fc.property(arbitraryDecisionScene(), (scene) => {
        const silent = generateCandidates(scene).filter(({ label }) => label.act === "STAY_SILENT");

        expect(silent.map(({ label }) => label.targets)).toEqual([[]]);
      }),
      { numRuns: 50 },
    );
  });
});
