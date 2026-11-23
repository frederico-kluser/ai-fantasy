import { describe, expect, it } from "vitest";

import { aBond } from "../../test/support/character.ts";
import { specAppraisalRows } from "../../test/support/spec-appraisal.ts";
import { toBp } from "../domain/bp.ts";
import type { ActId } from "../presets/acts.ts";
import { appraisalRows, combinedValence, IGNORED_ROW, termsOf } from "./appraisal-table.ts";
import type { AppraisalRow, EffectTerm, RowContext } from "./effect-terms.ts";

/** A NEUTRAL reading by a stranger, sincerity 5000, nothing about the topic, no answer. */
const BASE: RowContext = {
  tone: "NEUTRAL",
  bond: aBond(1).axes,
  sincerity: toBp(5000),
  topicInterests: false,
  newFact: false,
  secret: false,
  badFact: false,
  accusationTrue: false,
  answer: null,
};

const bond = (axes: Parameters<typeof aBond>[1]) => aBond(1, axes).axes;

/**
 * Each row of dialogue-acts §7.1 and the act and context that select exactly
 * it. Rows whose cells defer to another rule ("como `CHAT`", "ver 8.3") are
 * tested with those rules.
 */
const SELECTION: ReadonlyMap<string, readonly [ActId, Partial<RowContext>]> = new Map([
  ["`GREET`", ["GREET", {}]],
  ["`CHAT`, tópico interessa", ["CHAT", { topicInterests: true }]],
  ["`CHAT`, não interessa", ["CHAT", {}]],
  ["`ASK`", ["ASK", { badFact: true }]],
  ["`TELL`, fato novo para o alvo", ["TELL", { newFact: true }]],
  ["`TELL` de segredo ao alvo", ["TELL", { secret: true }]],
  ["`TELL` de fato ruim para o alvo", ["TELL", { badFact: true }]],
  ["`PRAISE`", ["PRAISE", {}]],
  [
    "`TEASE`, diverte (`PLAYFUL` e afeto ≥ 5000)",
    ["TEASE", { tone: "PLAYFUL", bond: bond({ affection: 5000 }) }],
  ],
  ["`TEASE`, ofende (demais casos)", ["TEASE", {}]],
  ["`ACCUSE`", ["ACCUSE", { accusationTrue: true }]],
  ["`REQUEST`", ["REQUEST", {}]],
  ["`OFFER`, sinceridade percebida ≥ 5000", ["OFFER", {}]],
  ["`OFFER`, sinceridade percebida < 5000", ["OFFER", { sincerity: toBp(4999) }]],
  ["`APOLOGIZE`, sinceridade percebida ≥ 5000", ["APOLOGIZE", {}]],
  ["`APOLOGIZE`, sinceridade percebida < 5000", ["APOLOGIZE", { sincerity: toBp(4999) }]],
  ["`THREATEN`", ["THREATEN", {}]],
  [
    "`REFUSE` a uma pergunta (não responder)",
    ["REFUSE", { answer: { act: "ASK", band: null, object: null } }],
  ],
  [
    "`REFUSE` a uma acusação (negar)",
    ["REFUSE", { answer: { act: "ACCUSE", band: null, object: null } }],
  ],
  ["`FAREWELL`", ["FAREWELL", { bond: bond({ affection: 6000 }) }]],
  ["`TOUCH` `WARM`, afeto ≥ 4000", ["TOUCH", { tone: "WARM", bond: bond({ affection: 4000 }) }]],
  ["`TOUCH` `WARM`, afeto < 4000", ["TOUCH", { tone: "WARM" }]],
  [
    "`TOUCH` `SEDUCTIVE`, atração ≥ 5000",
    ["TOUCH", { tone: "SEDUCTIVE", bond: bond({ attraction: 5000 }) }],
  ],
  ["`TOUCH` `SEDUCTIVE`, atração < 5000", ["TOUCH", { tone: "SEDUCTIVE" }]],
  [
    "`TOUCH` `PLAYFUL`, afeto ≥ 5000",
    ["TOUCH", { tone: "PLAYFUL", bond: bond({ affection: 5000 }) }],
  ],
  ["`TOUCH` `PLAYFUL`, afeto < 5000", ["TOUCH", { tone: "PLAYFUL" }]],
  ["`TOUCH` `NEUTRAL`", ["TOUCH", {}]],
  ["`TOUCH` `IRONIC`", ["TOUCH", { tone: "IRONIC" }]],
  ["`TOUCH` `AGGRESSIVE`", ["TOUCH", { tone: "AGGRESSIVE" }]],
  ["`APPROACH`", ["APPROACH", { bond: bond({ affection: 6000, fearOf: 5000 }) }]],
  ["`WITHDRAW`", ["WITHDRAW", { bond: bond({ affection: 6000 }) }]],
  ["`MOVE`, `LEAVE`", ["MOVE", {}]],
]);

/** The rows tested with other rules: they defer to `CHAT` or to §8.3. */
const DEFERRED = [
  "`TELL`, demais casos (fato já conhecido, pessoa, sentimento, coisa, lugar, amenidades)",
  "`ACCEPT` (resposta a pedido)",
  "`REFUSE` a um pedido",
  "`STAY_SILENT` devido (ignorar)",
];

function pairs(terms: readonly EffectTerm[], kind: EffectTerm["kind"]): [string, number][] {
  return terms
    .filter((term) => term.kind === kind)
    .map((term): [string, number] => [
      ("emotion" in term && term.emotion) ||
        ("axis" in term && term.axis) ||
        String("drive" in term && term.drive),
      term.k,
    ])
    .sort();
}

function shapeOf(label: string, rows: readonly AppraisalRow[]) {
  const terms = termsOf(rows);
  return {
    label,
    valence: combinedValence(rows),
    emotions: pairs(terms, "EMOTION"),
    bonds: pairs(terms, "BOND"),
    drives: pairs(terms, "DRIVE"),
  };
}

const SPEC = specAppraisalRows();

describe("the appraisal table against dialogue-acts §7.1", () => {
  it("given the document when listing its rows then each is selected here or deferred to its rule", () => {
    expect(SPEC.map((row) => row.label).sort()).toEqual([...SELECTION.keys(), ...DEFERRED].sort());
  });

  it.each(SPEC.filter((row) => SELECTION.has(row.label)))(
    "given the row $label when selecting its rows then valence and effects match the document",
    (row) => {
      const [act, overrides] = SELECTION.get(row.label) ?? ["MOVE", {}];

      expect(shapeOf(row.label, appraisalRows(act, { ...BASE, ...overrides }))).toEqual(row);
    },
  );

  it("given the row of STAY_SILENT owed when reading the ignored row then it matches the document", () => {
    const row = SPEC.find((entry) => entry.label === "`STAY_SILENT` devido (ignorar)");

    expect(shapeOf(row?.label ?? "", [IGNORED_ROW])).toEqual(row);
  });
});
