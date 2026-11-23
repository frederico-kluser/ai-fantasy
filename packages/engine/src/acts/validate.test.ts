import { describe, expect, it } from "vitest";

import {
  aboutFact,
  aHistoryFact,
  aLabel,
  codeOrOk,
  defaultRules,
  factIdOf,
  ids,
} from "../../test/support/acts.ts";
import { aCharacter } from "../../test/support/character.ts";
import { openGrid } from "../../test/support/context.ts";
import { gridOf, idOf } from "../../test/support/space.ts";
import { toBp, type Bp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import { createCopy, type FactCopy } from "../memory/copy.ts";
import type { ActId } from "../presets/acts.ts";
import type { ActLabel } from "./label.ts";
import type { Obligation } from "./obligations.ts";
import {
  ACT_ERROR_CODES,
  describeActError,
  validateAct,
  type ActContext,
  type ActErrorCode,
} from "./validate.ts";

const NONE = { type: "NONE" } as const;
/** Fact 0: 3 betrayed 4, a secret; fact 1: 4 betrayed 3, not secret. */
const FACTS = [
  aHistoryFact(0, 3, 4, { offenders: ids(3), secret: true }),
  aHistoryFact(1, 4, 3, { offenders: ids(4) }),
];

function aCopy(fact: number, falseOffenders: readonly CharacterId[] | null = null): FactCopy {
  return createCopy(factIdOf(fact), { perspective: "DIRECT" }, toBp(0), falseOffenders);
}

/**
 * Author 1 at cell 0 of an open 25 × 25 grid without noise, knowing facts 0
 * and 1; 2 next to it, 3 two cells away, 4 twenty cells away (beyond normal
 * speech).
 */
function context(overrides: Partial<ActContext> = {}): ActContext {
  return {
    rules: defaultRules(),
    grid: openGrid(25),
    noise: toBp(0),
    author: aCharacter(1, 0, { memories: [aCopy(0), aCopy(1)] }),
    others: [aCharacter(2, 1), aCharacter(3, 2), aCharacter(4, 20)],
    facts: FACTS,
    obligations: [],
    ...overrides,
  };
}

function codeOf(label: ActLabel, overrides: Partial<ActContext> = {}): ActErrorCode | "OK" {
  return codeOrOk(validateAct(label, context(overrides)));
}

describe("validateAct: targets (dialogue-acts §1 and §2)", () => {
  it("given a TOUCH to someone two cells away when validating then it is rejected", () => {
    const touch = aLabel({ act: "TOUCH", targets: ids(3), topic: NONE });

    expect(validateAct(touch, context())).toStrictEqual({
      ok: false,
      error: { code: "TARGET_TOO_FAR", target: 3 },
    });
  });

  it("given a TOUCH to someone next to the author when validating then it is accepted", () => {
    const touch = aLabel({ act: "TOUCH", targets: ids(2), topic: NONE });

    expect(validateAct(touch, context())).toStrictEqual({ ok: true, value: touch });
  });

  it.each<[string, ActLabel, ActErrorCode | "OK"]>([
    ["a CHAT to nobody", aLabel(), "OK"],
    ["a CHAT to the GROUP", aLabel({ targets: "GROUP" }), "OK"],
    ["a CHAT to two in earshot", aLabel({ targets: ids(2, 3) }), "OK"],
    [
      "a CHAT to someone beyond normal speech",
      aLabel({ targets: ids(4) }),
      "TARGET_OUT_OF_EARSHOT",
    ],
    ["a SHOUT to someone far away", aLabel({ targets: ids(4), volume: "SHOUT" }), "OK"],
    [
      "a WHISPER two cells away",
      aLabel({ targets: ids(3), volume: "WHISPER" }),
      "TARGET_OUT_OF_EARSHOT",
    ],
    ["a CHAT to someone absent", aLabel({ targets: ids(9) }), "TARGET_ABSENT"],
    ["a CHAT to oneself", aLabel({ targets: ids(1) }), "SELF_TARGET"],
    ["targets out of order", aLabel({ targets: ids(3, 2) }), "TARGETS_NOT_SORTED"],
    ["a repeated target", aLabel({ targets: ids(2, 2) }), "TARGETS_NOT_SORTED"],
    [
      "a TOUCH to the GROUP",
      aLabel({ act: "TOUCH", targets: "GROUP", topic: NONE }),
      "GROUP_NOT_ALLOWED",
    ],
    ["a TOUCH to nobody", aLabel({ act: "TOUCH", topic: NONE }), "TARGET_REQUIRED"],
    [
      "an APPROACH to two",
      aLabel({ act: "APPROACH", targets: ids(2, 3), topic: NONE }),
      "ONE_TARGET_REQUIRED",
    ],
    ["an APPROACH to nobody", aLabel({ act: "APPROACH", topic: NONE }), "ONE_TARGET_REQUIRED"],
    ["an APPROACH far away", aLabel({ act: "APPROACH", targets: ids(4), topic: NONE }), "OK"],
    [
      "a WITHDRAW from the GROUP",
      aLabel({ act: "WITHDRAW", targets: "GROUP", topic: NONE }),
      "GROUP_NOT_ALLOWED",
    ],
    [
      "a LEAVE to someone",
      aLabel({ act: "LEAVE", targets: ids(2), topic: NONE }),
      "NO_TARGET_ALLOWED",
    ],
    [
      "a STAY_SILENT to the GROUP",
      aLabel({ act: "STAY_SILENT", targets: "GROUP", topic: NONE }),
      "NO_TARGET_ALLOWED",
    ],
    ["a STAY_SILENT to nobody", aLabel({ act: "STAY_SILENT", topic: NONE }), "OK"],
  ])("given %s when validating then the result is %s", (_name, label, code) => {
    expect(codeOf(label)).toBe(code);
  });

  it("given a CHAT through a wall when validating then the target is out of earshot", () => {
    const others = [aCharacter(2, 4)];

    expect(codeOf(aLabel({ targets: ids(2) }), { grid: gridOf(["..#.."]), others })).toBe(
      "TARGET_OUT_OF_EARSHOT",
    );
  });
});

describe("validateAct: fields (dialogue-acts §1)", () => {
  const PERSON_2 = { type: "PERSON", person: idOf(2) } as const;

  it.each<[string, ActLabel, ActErrorCode | "OK"]>([
    [
      "a REQUEST with an object",
      aLabel({ act: "REQUEST", targets: ids(2), topic: PERSON_2, object: "HELP" }),
      "OK",
    ],
    [
      "a REQUEST without an object",
      aLabel({ act: "REQUEST", targets: ids(2), topic: PERSON_2 }),
      "OBJECT_REQUIRED",
    ],
    [
      "an OFFER without an object",
      aLabel({ act: "OFFER", targets: ids(2), topic: PERSON_2 }),
      "OBJECT_REQUIRED",
    ],
    ["a CHAT with an object", aLabel({ object: "HELP" }), "OBJECT_NOT_ALLOWED"],
    ["a MOVE with a destination", aLabel({ act: "MOVE", topic: NONE, destination: 30 }), "OK"],
    ["a MOVE without a destination", aLabel({ act: "MOVE", topic: NONE }), "DESTINATION_REQUIRED"],
    ["a CHAT with a destination", aLabel({ destination: 3 }), "DESTINATION_NOT_ALLOWED"],
    [
      "a MOVE outside the grid",
      aLabel({ act: "MOVE", topic: NONE, destination: 625 }),
      "BAD_DESTINATION",
    ],
    [
      "a MOVE to a broken index",
      aLabel({ act: "MOVE", topic: NONE, destination: 1.5 }),
      "BAD_DESTINATION",
    ],
    ["an intensity above 10000", aLabel({ intensity: 10001 as Bp }), "BAD_INTENSITY"],
    ["a broken intensity", aLabel({ intensity: 10.5 as Bp }), "BAD_INTENSITY"],
  ])("given %s when validating then the result is %s", (_name, label, code) => {
    expect(codeOf(label)).toBe(code);
  });

  it("given a MOVE to a wall when validating then the destination is rejected", () => {
    const move = aLabel({ act: "MOVE", topic: NONE, destination: 1 });

    expect(codeOf(move, { grid: gridOf([".#."]), others: [] })).toBe("BAD_DESTINATION");
  });
});

describe("validateAct: topics (dialogue-acts §4)", () => {
  const PERSON_2 = { type: "PERSON", person: idOf(2) } as const;
  const PERSON_3 = { type: "PERSON", person: idOf(3) } as const;

  it.each<[string, ActLabel, ActErrorCode | "OK"]>([
    ["a CHAT about a secret", aLabel({ topic: aboutFact("SECRET", 0) }), "TOPIC_NOT_ACCEPTED"],
    [
      "a MOVE about someone",
      aLabel({ act: "MOVE", topic: PERSON_2, destination: 3 }),
      "TOPIC_NOT_ACCEPTED",
    ],
    ["a CHAT without a topic", aLabel({ topic: NONE }), "TOPIC_NOT_ACCEPTED"],
    ["a CHAT about an unknown fact", aLabel({ topic: aboutFact("EVENT", 7) }), "FACT_NOT_FOUND"],
    [
      "a TELL of a secret",
      aLabel({ act: "TELL", targets: ids(2), topic: aboutFact("SECRET", 0) }),
      "OK",
    ],
    [
      "a TELL of a fact that is no secret as a secret",
      aLabel({ act: "TELL", topic: aboutFact("SECRET", 1) }),
      "NOT_A_SECRET",
    ],
    ["a GREET about its target", aLabel({ act: "GREET", targets: ids(2), topic: PERSON_2 }), "OK"],
    [
      "a GREET about someone else",
      aLabel({ act: "GREET", targets: ids(2), topic: PERSON_3 }),
      "PERSON_NOT_TARGET",
    ],
    [
      "a GREET to the GROUP about someone present",
      aLabel({ act: "GREET", targets: "GROUP", topic: PERSON_3 }),
      "OK",
    ],
    [
      "a GREET to the GROUP about the author",
      aLabel({ act: "GREET", targets: "GROUP", topic: { type: "PERSON", person: idOf(1) } }),
      "PERSON_NOT_TARGET",
    ],
    ["a CHAT about someone absent", aLabel({ topic: { type: "PERSON", person: idOf(9) } }), "OK"],
    [
      "an ACCUSE of the offender",
      aLabel({ act: "ACCUSE", targets: ids(3), topic: aboutFact("EVENT", 0) }),
      "OK",
    ],
    [
      "an ACCUSE of someone who is not the offender",
      aLabel({ act: "ACCUSE", targets: ids(2), topic: aboutFact("EVENT", 0) }),
      "NOT_THE_OFFENDER",
    ],
  ])("given %s when validating then the result is %s", (_name, label, code) => {
    expect(codeOf(label)).toBe(code);
  });

  it("given a TELL of a fact the author has no copy of when validating then it is rejected", () => {
    const tell = aLabel({ act: "TELL", targets: ids(2), topic: aboutFact("RUMOR", 1) });

    expect(codeOf(tell, { author: aCharacter(1, 0) })).toBe("FACT_UNKNOWN");
  });

  it("given an ASK about a fact the author has no copy of when validating then it is accepted", () => {
    const ask = aLabel({ act: "ASK", targets: ids(2), topic: aboutFact("EVENT", 1) });

    expect(codeOf(ask, { author: aCharacter(1, 0) })).toBe("OK");
  });

  it("given an ACCUSE of a fact the author has no copy of when validating then it is rejected", () => {
    const accuse = aLabel({ act: "ACCUSE", targets: ids(3), topic: aboutFact("EVENT", 0) });

    expect(codeOf(accuse, { author: aCharacter(1, 0) })).toBe("FACT_UNKNOWN");
  });

  it("given an ACCUSE when the author's copy is a false version then the false offender decides", () => {
    const accuse = aLabel({ act: "ACCUSE", targets: ids(2), topic: aboutFact("EVENT", 0) });

    expect(codeOf(accuse, { author: aCharacter(1, 0, { memories: [aCopy(0, ids(2))] }) })).toBe(
      "OK",
    );
  });
});

describe("validateAct: answers (dialogue-acts §4, simulation-model §10)", () => {
  const PERSON_1 = { type: "PERSON", person: idOf(1) } as const;
  const REQUEST_FROM_2: Obligation = {
    debtor: idOf(1),
    creditor: idOf(2),
    fact: factIdOf(1),
    act: "REQUEST",
    topic: PERSON_1,
    tick: 0,
  };

  it.each<[ActId, readonly Obligation[], ActErrorCode | "OK"]>([
    ["ACCEPT", [REQUEST_FROM_2], "OK"],
    ["REFUSE", [REQUEST_FROM_2], "OK"],
    ["ACCEPT", [], "NOTHING_TO_ANSWER"],
    ["ACCEPT", [{ ...REQUEST_FROM_2, act: "ASK" }], "NOTHING_TO_ANSWER"],
    ["REFUSE", [{ ...REQUEST_FROM_2, debtor: idOf(3) }], "NOTHING_TO_ANSWER"],
  ])(
    "given a %s with pending %j when validating then the result is %s",
    (act, obligations, code) => {
      expect(codeOf(aLabel({ act, targets: ids(2), topic: PERSON_1 }), { obligations })).toBe(code);
    },
  );
});

describe("describeActError", () => {
  it.each(ACT_ERROR_CODES)(
    "given the error %s when describing then it reads as an invalid act",
    (code) => {
      expect(describeActError({ code, target: null })).toMatch(/^ato inválido: \S/u);
    },
  );

  it("given an error about a target when describing then it names the target", () => {
    expect(describeActError({ code: "TARGET_ABSENT", target: idOf(9) })).toBe(
      "ato inválido: o alvo não está na cena (personagem 9)",
    );
  });
});

describe("validateAct: values (dialogue-acts §1)", () => {
  it.each<[string, ActLabel, ActErrorCode | "OK"]>([
    ["a negative intensity", aLabel({ intensity: -1 as Bp }), "BAD_INTENSITY"],
    ["a zero intensity", aLabel({ intensity: toBp(0) }), "OK"],
    ["a GREET about small talk", aLabel({ act: "GREET", targets: ids(2) }), "OK"],
    [
      "a FAREWELL to the GROUP about small talk",
      aLabel({ act: "FAREWELL", targets: "GROUP" }),
      "OK",
    ],
    ["the top intensity", aLabel({ intensity: toBp(10000) }), "OK"],
    ["a blame without a lie", aLabel({ blamed: idOf(3) }), "BLAME_WITHOUT_LIE"],
    ["a lie that blames someone", aLabel({ isFalse: true, blamed: idOf(3) }), "OK"],
  ])("given %s when validating then the result is %s", (_name, label, code) => {
    expect(codeOf(label)).toBe(code);
  });

  const ABOUT_3 = { targets: ids(2), topic: { type: "PERSON", person: idOf(3) } } as const;

  it.each<[ActId, Partial<ActLabel>]>([
    ["FAREWELL", {}],
    ["REQUEST", { object: "HELP" }],
    ["OFFER", { object: "HELP" }],
    ["APOLOGIZE", {}],
    ["THREATEN", {}],
  ])(
    "given a %s about someone who is not its target when validating then the person must be the target",
    (act, extra) => {
      expect(codeOf(aLabel({ act, ...ABOUT_3, ...extra }))).toBe("PERSON_NOT_TARGET");
    },
  );
});
