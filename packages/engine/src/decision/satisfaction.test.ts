import { describe, expect, it } from "vitest";

import { specSatisfactionRows } from "../../test/support/spec-decision.ts";
import { ACT_IDS } from "../presets/acts.ts";
import {
  ACT_SATISFACTION,
  satisfaction,
  TONE_SATISFACTION,
  type SatisfactionContext,
} from "./satisfaction.ts";

const NONE: SatisfactionContext = {
  receiver: null,
  giver: null,
  answered: null,
  badFact: false,
  targetOffender: false,
};

const cells = (act: (typeof ACT_IDS)[number]) =>
  ACT_SATISFACTION[act].map((entry) => `${entry.drive}:${entry.level}`);

describe("the satisfaction table (dialogue-acts §9.2)", () => {
  const rows = specSatisfactionRows();

  it.each([...rows.keys()])(
    "given the row of %s in the document when reading the data then the levels match",
    (act) => {
      expect(cells(act as (typeof ACT_IDS)[number])).toEqual(rows.get(act));
    },
  );

  it("given the document when listing its rows then every act but MOVE, FAREWELL and LEAVE has one", () => {
    expect([...rows.keys()].sort()).toEqual(
      ACT_IDS.filter((act) => !["MOVE", "FAREWELL", "LEAVE"].includes(act)).sort(),
    );
  });

  it("given the tone sums of the document when reading the data then each tone adds its drives", () => {
    const sums = Object.fromEntries(
      Object.entries(TONE_SATISFACTION).map(([tone, entries]) => [
        tone,
        entries.map((entry) => `${entry.drive}:${entry.level}${entry.when ?? ""}`),
      ]),
    );

    expect(sums).toEqual({
      WARM: ["intimacy:1"],
      NEUTRAL: [],
      PLAYFUL: ["fun:2"],
      SEDUCTIVE: ["desire:3"],
      IRONIC: ["fun:1", "influence:1", "justice:1"],
      AGGRESSIVE: ["influence:2", "justice:2TARGET_OFFENDER"],
    });
  });
});

describe("satisfaction (dialogue-acts §9.2)", () => {
  it.each([
    ["CHAT", "NEUTRAL", "company", 9000],
    ["CHAT", "NEUTRAL", "intimacy", 6000],
    ["CHAT", "NEUTRAL", "curiosity", 3000],
    ["CHAT", "NEUTRAL", "dignity", 0],
    ["CHAT", "PLAYFUL", "fun", 6000],
    ["CHAT", "WARM", "intimacy", 6000],
    ["TEASE", "PLAYFUL", "fun", 9000],
    ["GREET", "WARM", "intimacy", 3000],
    ["PRAISE", "SEDUCTIVE", "desire", 9000],
    ["TEASE", "IRONIC", "justice", 3000],
    ["STAY_SILENT", "NEUTRAL", "company", 0],
  ] as const)(
    "given %s in %s when reading the satisfaction of %s then it is the larger level, %i",
    (act, tone, drive, expected) => {
      expect(satisfaction(act, tone, drive, NONE)).toBe(expected);
    },
  );

  it.each([
    [false, 0],
    [true, 3000],
  ] as const)(
    "given a TELL whose fact is bad for someone (%s) when reading justice then it is %i",
    (badFact, expected) => {
      expect(satisfaction("TELL", "NEUTRAL", "justice", { ...NONE, badFact })).toBe(expected);
    },
  );

  it.each([
    [false, 0, 6000],
    [true, 6000, 6000],
  ] as const)(
    "given an AGGRESSIVE CHAT with the target an offender %s when reading then justice is %i and influence %i",
    (targetOffender, justice, influence) => {
      const context = { ...NONE, targetOffender };

      expect([
        satisfaction("CHAT", "AGGRESSIVE", "justice", context),
        satisfaction("CHAT", "AGGRESSIVE", "influence", context),
      ]).toEqual([justice, influence]);
    },
  );

  it("given a REQUEST whose object serves physical safety in who receives it when reading then physical safety is served a lot", () => {
    const context = { ...NONE, receiver: "physical_safety", giver: "care" } as const;

    expect([
      satisfaction("REQUEST", "NEUTRAL", "physical_safety", context),
      satisfaction("REQUEST", "NEUTRAL", "care", context),
      satisfaction("OFFER", "NEUTRAL", "care", context),
      satisfaction("OFFER", "NEUTRAL", "physical_safety", context),
    ]).toEqual([9000, 0, 9000, 0]);
  });

  it("given an ACCEPT of a request that serves intimacy in who accepts when reading then intimacy is served", () => {
    const context = { ...NONE, answered: "intimacy" } as const;

    expect([
      satisfaction("ACCEPT", "NEUTRAL", "intimacy", context),
      satisfaction("ACCEPT", "NEUTRAL", "influence", context),
    ]).toEqual([6000, 0]);
  });
});

describe("acts that are never chosen", () => {
  it("given FAREWELL, MOVE and LEAVE when reading the table then they serve nothing", () => {
    expect([ACT_SATISFACTION.FAREWELL, ACT_SATISFACTION.MOVE, ACT_SATISFACTION.LEAVE]).toEqual([
      [],
      [],
      [],
    ]);
  });
});
