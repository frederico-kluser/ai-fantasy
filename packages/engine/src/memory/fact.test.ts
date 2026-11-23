import { describe, expect, it } from "vitest";

import { toBp } from "../domain/bp.ts";
import type { FactId } from "../domain/ids.ts";
import { canonicalize } from "../session/canonical.ts";
import { idOf } from "../../test/support/space.ts";
import { historyOffenders, type ActFact } from "./fact.ts";

describe("historyOffenders (presets §7, dialogue-acts §4)", () => {
  it.each([
    ["NONE", []],
    ["A", [4]],
    ["B", [2]],
    ["BOTH", [2, 4]],
  ] as const)(
    "given the offender column %s when A is 4 and B is 2 then the offenders are %j",
    (offender, ids) => {
      expect(historyOffenders(offender, idOf(4), idOf(2))).toStrictEqual(ids);
    },
  );
});

describe("facts in the state (simulation-model §12 and §15)", () => {
  it("given an act fact with every field when serializing it then it is canonical text", () => {
    const fact: ActFact = {
      kind: "ACT",
      id: 0 as FactId,
      tick: 12,
      author: idOf(1),
      label: {
        act: "TELL",
        tone: "NEUTRAL",
        targets: [idOf(2)],
        topic: { type: "RUMOR", fact: 3 as FactId },
        intensity: toBp(5000),
        volume: "WHISPER",
        isFalse: true,
      },
      band: null,
      offenders: [],
      secret: false,
    };

    expect(canonicalize(fact)).toBe(
      '{"author":1,"band":null,"id":0,"kind":"ACT","label":{"act":"TELL","intensity":5000,"isFalse":true,' +
        '"targets":[2],"tone":"NEUTRAL","topic":{"fact":3,"type":"RUMOR"},"volume":"WHISPER"},' +
        '"offenders":[],"secret":false,"tick":12}',
    );
  });
});
