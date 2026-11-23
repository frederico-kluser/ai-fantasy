import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  aboutFact,
  aHistoryFact,
  aLabel,
  anActFact,
  defaultRules,
  factIdOf,
  ids,
} from "../../test/support/acts.ts";
import { idOf } from "../../test/support/space.ts";
import type { ActLabel } from "./label.ts";
import {
  answeredObligation,
  createObligations,
  expireObligations,
  isInterruption,
  settleObligations,
  type Obligation,
} from "./obligations.ts";
import type { Perceived } from "./perspectives.ts";

const RULES = defaultRules();
const WEATHER = { type: "SMALL_TALK" } as const;
const ASK = aLabel({ act: "ASK", targets: ids(2), topic: WEATHER });

/** The obligations an act of author 1 at tick 10 creates, as fact 4. */
function created(label: ActLabel, perceived: readonly Perceived[]): Obligation[] {
  return createObligations(RULES, {
    fact: factIdOf(4),
    tick: 10,
    author: idOf(1),
    label,
    perceived,
  });
}

/** An obligation of `debtor` toward `creditor`, from fact `fact` with act and topic of `label`. */
function anObligation(debtor: number, creditor: number, fact: number, label = ASK): Obligation {
  return {
    debtor: idOf(debtor),
    creditor: idOf(creditor),
    fact: factIdOf(fact),
    act: label.act,
    topic: label.topic,
    tick: 0,
  };
}

const HEARD_BY_2: readonly Perceived[] = [{ id: idOf(2), perspective: "DIRECT" }];

describe("createObligations (simulation-model §10)", () => {
  it("given an ASK to someone who heard it DIRECT when resolving then it owes an answer", () => {
    expect(created(ASK, HEARD_BY_2)).toStrictEqual([
      {
        debtor: 2,
        creditor: 1,
        fact: 4,
        act: "ASK",
        topic: WEATHER,
        tick: 10,
      },
    ]);
  });

  it("given an ASK to two targets when only one heard it DIRECT then only that one owes an answer", () => {
    const perceived: Perceived[] = [
      { id: idOf(2), perspective: "FRAGMENT" },
      { id: idOf(3), perspective: "DIRECT" },
    ];

    expect(
      created({ ...ASK, targets: ids(2, 3) }, perceived).map((owed) => owed.debtor),
    ).toStrictEqual(ids(3));
  });

  it("given an ASK to the GROUP when resolving then nobody owes an answer", () => {
    expect(created({ ...ASK, targets: "GROUP" }, HEARD_BY_2)).toStrictEqual([]);
  });

  it("given an ASK to nobody when resolving then nobody owes an answer", () => {
    expect(created({ ...ASK, targets: [] }, HEARD_BY_2)).toStrictEqual([]);
  });

  it("given a CHAT to someone when resolving then nobody owes an answer", () => {
    expect(created({ ...ASK, act: "CHAT" }, HEARD_BY_2)).toStrictEqual([]);
  });
});

describe("answeredObligation (simulation-model §10 table)", () => {
  it("given a pending ASK when the debtor tells the creditor about the topic asked then it answers it", () => {
    const pending = [anObligation(2, 1, 4)];
    const tell = aLabel({ act: "TELL", targets: ids(1), topic: WEATHER });

    expect(answeredObligation(pending, idOf(2), tell)).toBe(pending[0]);
  });

  it("given a pending ASK when the debtor tells about another topic then it answers nothing", () => {
    const tell = aLabel({
      act: "TELL",
      targets: ids(1),
      topic: { type: "PERSON", person: idOf(1) },
    });

    expect(answeredObligation([anObligation(2, 1, 4)], idOf(2), tell)).toBeUndefined();
  });

  it("given a pending ASK when the debtor tells someone else then it answers nothing", () => {
    const tell = aLabel({ act: "TELL", targets: ids(3), topic: WEATHER });

    expect(answeredObligation([anObligation(2, 1, 4)], idOf(2), tell)).toBeUndefined();
  });

  it("given a pending ASK when someone else answers then it answers nothing", () => {
    const tell = aLabel({ act: "TELL", targets: ids(1), topic: WEATHER });

    expect(answeredObligation([anObligation(2, 1, 4)], idOf(3), tell)).toBeUndefined();
  });

  it("given a pending ACCUSE when the debtor accuses the accuser back about anything then it answers it", () => {
    const accusation = aLabel({ act: "ACCUSE", targets: ids(2), topic: aboutFact("EVENT", 0) });
    const pending = [anObligation(2, 1, 4, accusation)];
    const back = { ...accusation, targets: ids(1), topic: aboutFact("EVENT", 3) };

    expect(answeredObligation(pending, idOf(2), back)).toBe(pending[0]);
  });

  it("given a pending REQUEST when the debtor accepts it then it answers it", () => {
    const request = aLabel({
      act: "REQUEST",
      targets: ids(2),
      topic: { type: "PERSON", person: idOf(2) },
    });
    const pending = [anObligation(2, 1, 4, request)];
    const accept = aLabel({ act: "ACCEPT", targets: ids(1), topic: request.topic });

    expect(answeredObligation(pending, idOf(2), accept)).toBe(pending[0]);
  });

  it("given a pending ASK when the debtor accepts then ACCEPT does not answer a question", () => {
    const accept = aLabel({ act: "ACCEPT", targets: ids(1), topic: WEATHER });

    expect(answeredObligation([anObligation(2, 1, 4)], idOf(2), accept)).toBeUndefined();
  });

  it("given two pending ASKs that the act answers when answering then the oldest is answered", () => {
    const pending = [anObligation(2, 1, 4), anObligation(2, 1, 6)];
    const refuse = aLabel({ act: "REFUSE", targets: ids(1), topic: WEATHER });

    expect(answeredObligation(pending, idOf(2), refuse)).toBe(pending[0]);
  });
});

describe("answeredObligation: topics of the answers (simulation-model §10)", () => {
  const ACCUSATION = aLabel({ act: "ACCUSE", targets: ids(2), topic: aboutFact("EVENT", 0) });
  const REQUEST = aLabel({
    act: "REQUEST",
    targets: ids(2),
    topic: { type: "PERSON", person: idOf(2) },
  });
  const OTHER_TOPIC = aboutFact("EVENT", 3);

  it.each<[string, ActLabel, ActLabel, boolean]>([
    [
      "an ACCEPT of a request about another topic",
      REQUEST,
      aLabel({ act: "ACCEPT", targets: ids(1), topic: OTHER_TOPIC }),
      false,
    ],
    [
      "a REFUSE of a request about another topic",
      REQUEST,
      aLabel({ act: "REFUSE", targets: ids(1), topic: OTHER_TOPIC }),
      false,
    ],
    [
      "a REFUSE of a question about another topic",
      ASK,
      aLabel({ act: "REFUSE", targets: ids(1), topic: OTHER_TOPIC }),
      false,
    ],
    [
      "a REFUSE of an accusation about another topic",
      ACCUSATION,
      aLabel({ act: "REFUSE", targets: ids(1), topic: OTHER_TOPIC }),
      false,
    ],
    [
      "a REFUSE of an accusation about its topic",
      ACCUSATION,
      aLabel({ act: "REFUSE", targets: ids(1), topic: ACCUSATION.topic }),
      true,
    ],
    [
      "an APOLOGIZE for an accusation about another topic",
      ACCUSATION,
      aLabel({ act: "APOLOGIZE", targets: ids(1), topic: { type: "PERSON", person: idOf(1) } }),
      true,
    ],
  ])("given %s when answering then it answers: %s", (_name, owedLabel, answer, answered) => {
    const pending = [anObligation(2, 1, 4, owedLabel)];

    expect(answeredObligation(pending, idOf(2), answer) !== undefined).toBe(answered);
  });
});

describe("settleObligations (simulation-model §10)", () => {
  it("given several pending when the debtor answers one then it ends ANSWERED and the others stay", () => {
    const fromOne = anObligation(2, 1, 4);
    const fromThree = anObligation(2, 3, 5);
    const other = anObligation(4, 1, 5);
    const tell = aLabel({ act: "TELL", targets: ids(1), topic: WEATHER });

    expect(settleObligations([fromOne, fromThree, other], idOf(2), tell)).toStrictEqual({
      pending: [fromThree, other],
      ended: [{ obligation: fromOne, ending: "ANSWERED" }],
    });
  });

  it("given several pending when the debtor acts without answering any then all of them end IGNORED", () => {
    const fromOne = anObligation(2, 1, 4);
    const fromThree = anObligation(2, 3, 5);
    const other = anObligation(4, 1, 5);
    const silent = aLabel({ act: "STAY_SILENT", topic: { type: "NONE" } });

    expect(settleObligations([fromOne, fromThree, other], idOf(2), silent)).toStrictEqual({
      pending: [other],
      ended: [
        { obligation: fromOne, ending: "IGNORED" },
        { obligation: fromThree, ending: "IGNORED" },
      ],
    });
  });

  it("given someone who owes nothing when acting then nothing ends", () => {
    const pending = [anObligation(2, 1, 4)];

    expect(settleObligations(pending, idOf(3), ASK)).toStrictEqual({ pending, ended: [] });
  });
});

describe("expireObligations (simulation-model §10, OBLIGATION_TTL_TICKS)", () => {
  it("given an ASK to someone when 12 ticks pass without an answer then the obligation is ignored", () => {
    const [owed] = created(ASK, HEARD_BY_2);

    expect(expireObligations(created(ASK, HEARD_BY_2), 22)).toStrictEqual({
      pending: [],
      ended: [{ obligation: owed, ending: "IGNORED" }],
    });
  });

  it("given an ASK to someone when 11 ticks pass without an answer then it is still pending", () => {
    const pending = created(ASK, HEARD_BY_2);

    expect(expireObligations(pending, 21)).toStrictEqual({ pending, ended: [] });
  });

  it("given any creation tick when checked every tick then the obligation ends within 12 ticks (invariant 12)", () => {
    fc.assert(
      fc.property(fc.nat({ max: 10000 }), fc.nat({ max: 40 }), (tick, after) => {
        const owed = { ...anObligation(2, 1, 4), tick };
        const { pending } = expireObligations([owed], tick + after);

        expect(pending.length).toBe(Number(after < 12));
      }),
    );
  });
});

describe("isInterruption (simulation-model §11 item 4)", () => {
  /** Fact 4: 1 asked 2; fact 5 (a history fact) comes later but is no act. */
  const FACTS = [anActFact(4, 1, ASK), aHistoryFact(5, 3, 4)];
  const PENDING = [anObligation(2, 1, 4)];

  it.each([
    [3, true],
    [2, false],
    [1, false],
  ])(
    "given a pending answer to the last act when %i acts then the interruption is %s",
    (actor, interrupts) => {
      expect(isInterruption(PENDING, FACTS, idOf(actor))).toBe(interrupts);
    },
  );

  it("given a pending answer to an older act when a third party acts then it is no interruption", () => {
    const facts = [...FACTS, anActFact(6, 4, aLabel())];

    expect(isInterruption(PENDING, facts, idOf(3))).toBe(false);
  });

  it("given no act yet when someone acts then it is no interruption", () => {
    expect(isInterruption([], [aHistoryFact(0, 3, 4)], idOf(3))).toBe(false);
  });
});
