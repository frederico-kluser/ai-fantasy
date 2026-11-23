import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { aBond } from "../../test/support/character.ts";
import { toBp } from "../domain/bp.ts";
import { ACT_IDS, type ActId } from "../presets/acts.ts";
import { TONE_IDS } from "../presets/tones.ts";
import { APPRAISAL_ROWS, appraisalRows, combinedValence, termsOf } from "./appraisal-table.ts";
import type { AnswerView, RowContext } from "./effect-terms.ts";

/** A NEUTRAL reading by a stranger, sincerity 5000, nothing about the topic, no answer. */
function aContext(overrides: Partial<RowContext> = {}): RowContext {
  return {
    tone: "NEUTRAL",
    bond: aBond(1).axes,
    sincerity: toBp(5000),
    topicInterests: false,
    newFact: false,
    secret: false,
    badFact: false,
    accusationTrue: false,
    answer: null,
    ...overrides,
  };
}

function answer(act: ActId, band: AnswerView["band"], object: AnswerView["object"] = null) {
  return { act, band, object };
}

const arbitraryContext = fc
  .record({
    tone: fc.constantFrom(...TONE_IDS),
    affection: fc.integer({ min: 0, max: 10000 }),
    attraction: fc.integer({ min: 0, max: 10000 }),
    fearOf: fc.integer({ min: 0, max: 10000 }),
    sincerity: fc.integer({ min: 0, max: 10000 }),
    flags: fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
  })
  .map(({ tone, affection, attraction, fearOf, sincerity, flags }) =>
    aContext({
      tone,
      bond: aBond(1, { affection, attraction, fearOf }).axes,
      sincerity: toBp(sincerity),
      topicInterests: flags[0] ?? false,
      newFact: flags[1] ?? false,
      secret: flags[2] ?? false,
      badFact: flags[3] ?? false,
      accusationTrue: flags[4] ?? false,
    }),
  );

describe("appraisal rows (dialogue-acts §7.1)", () => {
  it("given a GREET when selecting rows then one row gives +1 with joy, three bond axes and company", () => {
    const rows = appraisalRows("GREET", aContext());

    expect(combinedValence(rows)).toBe(1);
    expect(termsOf(rows)).toEqual([
      { kind: "EMOTION", emotion: "joy", k: 1 },
      { kind: "BOND", axis: "affection", k: 1 },
      { kind: "BOND", axis: "trust", k: 1 },
      { kind: "BOND", axis: "closeness", k: 1 },
      { kind: "DRIVE", drive: "company", k: -2 },
    ]);
  });

  it("given a TELL of a secret that is new to the target when selecting rows then both rows sum and the valence is +2", () => {
    const rows = appraisalRows("TELL", aContext({ newFact: true, secret: true }));

    expect(combinedValence(rows)).toBe(2);
    expect(termsOf(rows)).toHaveLength(7);
  });

  it("given a TELL of a new fact that is bad for the target when selecting rows then the valence of larger magnitude wins", () => {
    const rows = appraisalRows("TELL", aContext({ newFact: true, badFact: true }));

    expect(combinedValence(rows)).toBe(-2);
  });

  it("given a TELL of a fact the target knew about a topic that interests when selecting rows then it reads as an interesting CHAT", () => {
    const tell = termsOf(appraisalRows("TELL", aContext({ topicInterests: true })));
    const chat = termsOf(appraisalRows("CHAT", aContext({ topicInterests: true })));

    expect(tell).toEqual(chat);
  });

  it("given a TELL of a known fact that does not interest when selecting rows then it reads as a dull CHAT", () => {
    const rows = appraisalRows("TELL", aContext());

    expect(termsOf(rows)).toEqual([{ kind: "DRIVE", drive: "company", k: -1 }]);
  });

  it.each([
    [5000, 1],
    [4999, -1],
  ])(
    "given a PLAYFUL TEASE with affection %i when selecting rows then the valence is %i",
    (affection, valence) => {
      const context = aContext({ tone: "PLAYFUL", bond: aBond(1, { affection }).axes });

      expect(combinedValence(appraisalRows("TEASE", context))).toBe(valence);
    },
  );

  it("given a true ACCUSE when selecting rows then shame and guilt join the accusation", () => {
    const terms = termsOf(appraisalRows("ACCUSE", aContext({ accusationTrue: true })));

    expect(terms).toContainEqual({ kind: "EMOTION", emotion: "shame", k: 2 });
    expect(terms).toContainEqual({ kind: "EMOTION", emotion: "guilt", k: 2 });
  });

  it("given an APPROACH from someone loved and feared when selecting rows then the valence is +1 and fear still rises", () => {
    const context = aContext({ bond: aBond(1, { affection: 6000, fearOf: 5000 }).axes });
    const rows = appraisalRows("APPROACH", context);

    expect(combinedValence(rows)).toBe(1);
    expect(termsOf(rows)).toContainEqual({ kind: "EMOTION", emotion: "fear", k: 1 });
  });

  it("given an APPROACH from someone only feared when selecting rows then the valence is -1", () => {
    const context = aContext({ bond: aBond(1, { attraction: 5999, fearOf: 5000 }).axes });

    expect(combinedValence(appraisalRows("APPROACH", context))).toBe(-1);
  });

  it.each(["REQUEST", "MOVE", "LEAVE", "STAY_SILENT"] as const)(
    "given a %s when selecting rows then no row applies: valence 0 and no effect",
    (act) => {
      const rows = appraisalRows(act, aContext());

      expect(combinedValence(rows)).toBe(0);
      expect(termsOf(rows)).toEqual([]);
    },
  );

  it("given an ACCEPT without a request answered when selecting rows then nothing applies", () => {
    expect(appraisalRows("ACCEPT", aContext())).toEqual([]);
  });

  it("given an ENTHUSIASTIC ACCEPT of a REQUEST when selecting rows then the valence is +3 and joy adds up to 3 units", () => {
    const rows = appraisalRows(
      "ACCEPT",
      aContext({ answer: answer("REQUEST", "ENTHUSIASTIC", "HELP") }),
    );
    const joy = termsOf(rows)
      .filter((term) => term.kind === "EMOTION" && term.emotion === "joy")
      .reduce((sum, term) => sum + term.k, 0);

    expect(combinedValence(rows)).toBe(3);
    expect(joy).toBe(3);
  });

  it.each([
    ["ACCEPT", 2],
    ["PARTIAL", 1],
  ] as const)(
    "given an ACCEPT with band %s when selecting rows then the valence is %i",
    (band, v) => {
      const rows = appraisalRows("ACCEPT", aContext({ answer: answer("OFFER", band, "ITEM") }));

      expect(combinedValence(rows)).toBe(v);
    },
  );

  it("given an OFFER of MONEY accepted when selecting rows then the offerer's material security rises", () => {
    const rows = appraisalRows("ACCEPT", aContext({ answer: answer("OFFER", "ACCEPT", "MONEY") }));

    expect(termsOf(rows)).toContainEqual({ kind: "DRIVE", drive: "material_security", k: 1 });
  });

  it("given a HARD_REFUSE of an OFFER when selecting rows then the refusal, the offer and the offense rows sum", () => {
    const rows = appraisalRows(
      "REFUSE",
      aContext({ answer: answer("OFFER", "HARD_REFUSE", "DATE") }),
    );

    expect(combinedValence(rows)).toBe(-1);
    expect(termsOf(rows)).toEqual(
      expect.arrayContaining([
        { kind: "DRIVE", drive: "REQUESTED", k: 1 },
        { kind: "DRIVE", drive: "purpose", k: 1 },
        { kind: "BOND", axis: "resentment", k: 2 },
        { kind: "DRIVE", drive: "dignity", k: 1 },
      ]),
    );
  });

  it("given a REFUSE to a question when selecting rows then the asker gets anger, trust and curiosity", () => {
    const rows = appraisalRows("REFUSE", aContext({ answer: answer("ASK", null) }));

    expect(termsOf(rows)).toEqual([
      { kind: "EMOTION", emotion: "anger", k: 1 },
      { kind: "BOND", axis: "trust", k: -1 },
      { kind: "DRIVE", drive: "curiosity", k: 1 },
    ]);
  });

  it.each([
    ["WARM", { affection: 4000 }, 2, "joy"],
    ["WARM", { affection: 3999 }, -1, "disgust"],
    ["SEDUCTIVE", { attraction: 5000 }, 2, "joy"],
    ["SEDUCTIVE", { attraction: 4999 }, -2, "disgust"],
    ["PLAYFUL", { affection: 5000 }, 1, "joy"],
    ["PLAYFUL", { affection: 4999 }, -1, "anger"],
    ["IRONIC", {}, -1, "shame"],
    ["AGGRESSIVE", {}, -3, "fear"],
  ] as const)(
    "given a %s TOUCH with %j when selecting rows then the valence is %i and %s moves",
    (tone, axes, valence, emotion) => {
      const rows = appraisalRows("TOUCH", aContext({ tone, bond: aBond(1, axes).axes }));

      expect(combinedValence(rows)).toBe(valence);
      expect(termsOf(rows).map((term) => term.kind === "EMOTION" && term.emotion)).toContain(
        emotion,
      );
    },
  );

  it("given a NEUTRAL TOUCH when selecting rows then it applies with no effect", () => {
    const rows = appraisalRows("TOUCH", aContext());

    expect([rows.length, combinedValence(rows), termsOf(rows)]).toEqual([1, 0, []]);
  });

  it.each([
    ["FAREWELL", 6000, 0, 2],
    ["FAREWELL", 5999, 0, 1],
    ["WITHDRAW", 6000, -1, 2],
    ["WITHDRAW", 5999, 0, 1],
  ] as const)(
    "given a %s from someone with affection %i when selecting rows then the valence is %i with %i terms",
    (act, affection, valence, terms) => {
      const rows = appraisalRows(act, aContext({ bond: aBond(1, { affection }).axes }));

      expect([combinedValence(rows), termsOf(rows).length]).toEqual([valence, terms]);
    },
  );

  it.each([
    ["OFFER", 5000, 2],
    ["OFFER", 4999, 0],
    ["APOLOGIZE", 5000, 1],
    ["APOLOGIZE", 4999, -1],
  ] as const)(
    "given an %s perceived with sincerity %i when selecting rows then the valence is %i",
    (act, sincerity, valence) => {
      expect(combinedValence(appraisalRows(act, aContext({ sincerity: toBp(sincerity) })))).toBe(
        valence,
      );
    },
  );

  it.each([
    [{ badFact: true }, [2, 1]],
    [{ secret: true }, []],
  ] as const)(
    "given an ASK with %j when selecting rows then shame and fear are %j",
    (flags, ks) => {
      expect(termsOf(appraisalRows("ASK", aContext(flags))).map((term) => term.k)).toEqual(ks);
    },
  );

  it("given a THREATEN when selecting rows then its fear carries the factor of fearOf", () => {
    expect(termsOf(appraisalRows("THREATEN", aContext()))[0]).toEqual({
      kind: "EMOTION",
      emotion: "fear",
      k: 3,
      byFearOf: true,
    });
  });

  it("given a PRAISE when selecting rows then it gives +2 with joy, affection, respect and recognition", () => {
    const rows = appraisalRows("PRAISE", aContext());

    expect([combinedValence(rows), termsOf(rows).length]).toEqual([2, 4]);
  });

  it("given two rows of the same magnitude and opposite signs when combining then the first in table order wins", () => {
    const rows = appraisalRows("TELL", aContext({ secret: true, badFact: true }));

    expect(combinedValence(rows)).toBe(2);
  });

  it("given any context when selecting the rows of any act then every row valence stays in -3..3", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ACT_IDS), arbitraryContext, (act, context) => {
        const valence = combinedValence(appraisalRows(act, context));

        expect(Math.abs(valence)).toBeLessThanOrEqual(3);
      }),
    );
  });

  it("given the table when reading it then every row has an act of the catalog", () => {
    const acts = new Set<string>(ACT_IDS);

    expect(APPRAISAL_ROWS.filter((row) => !acts.has(row.act))).toEqual([]);
  });
});
