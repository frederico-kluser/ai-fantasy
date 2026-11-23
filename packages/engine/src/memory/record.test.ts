import { describe, expect, it } from "vitest";

import {
  aboutFact,
  aHistoryFact,
  aLabel,
  anActFact,
  factIdOf,
  ids,
} from "../../test/support/acts.ts";
import { aCharacter } from "../../test/support/character.ts";
import { idOf } from "../../test/support/space.ts";
import type { Perceived } from "../acts/perspectives.ts";
import { toBp } from "../domain/bp.ts";
import type { CharacterState } from "../character/state.ts";
import { createCopy, type FactCopy } from "./copy.ts";
import {
  addressees,
  involvedIn,
  nextFactId,
  recordAct,
  withCopy,
  type RecordInput,
} from "./record.ts";

/** A copy of fact `fact` with the fidelity and peak given, importance 0. */
function aCopy(fact: number, fidelity: number, peak = fidelity): FactCopy {
  return {
    ...createCopy(factIdOf(fact), { perspective: "DIRECT" }, toBp(0)),
    fidelity: toBp(fidelity),
    peakFidelity: toBp(peak),
  };
}

const HISTORY = aHistoryFact(0, 3, 4, { offenders: ids(3) });
const TELL = aLabel({ act: "TELL", targets: ids(2), topic: aboutFact("EVENT", 0) });

/** Author 1 at tick 7 with the label given; characters 1 to 4 present, with the memories given. */
function recording(
  label = aLabel(),
  perceived: readonly Perceived[] = [],
  memories: Readonly<Record<number, readonly FactCopy[]>> = {},
): RecordInput {
  const characters: CharacterState[] = [1, 2, 3, 4].map((id) =>
    aCharacter(id, id, { memories: memories[id] ?? [] }),
  );
  return { facts: [HISTORY], tick: 7, author: idOf(1), label, perceived, characters };
}

function memoriesOf(characters: readonly CharacterState[], id: number): readonly FactCopy[] {
  return characters.find((character) => character.id === id)?.memories ?? [];
}

describe("recordAct: the fact (simulation-model §12)", () => {
  it("given a resolved act when recording then the fact takes the next id and keeps the real act", () => {
    const label = aLabel({ tone: "IRONIC", targets: ids(2) });

    expect(recordAct(recording(label)).fact).toStrictEqual({
      kind: "ACT",
      id: 1,
      tick: 7,
      author: 1,
      label,
      band: null,
      offenders: [],
      secret: false,
    });
  });

  it("given a resolved act when recording then the record gains the fact at its end", () => {
    const { fact, facts } = recordAct(recording());

    expect(facts).toStrictEqual([HISTORY, fact]);
  });
});

describe("recordAct: the copies (simulation-model §12)", () => {
  it("given a resolved act when recording then every hearer holds a copy with the right perspective", () => {
    const perceived: Perceived[] = [
      { id: idOf(2), perspective: "DIRECT" },
      { id: idOf(3), perspective: "FRAGMENT" },
      { id: idOf(4), perspective: "SEEN" },
    ];
    const { characters } = recordAct(recording(aLabel({ targets: ids(2) }), perceived));

    expect([2, 3, 4].map((id) => memoriesOf(characters, id))).toStrictEqual([
      [createCopy(factIdOf(1), { perspective: "DIRECT" }, toBp(3000))],
      [createCopy(factIdOf(1), { perspective: "FRAGMENT" }, toBp(0))],
      [createCopy(factIdOf(1), { perspective: "SEEN" }, toBp(0))],
    ]);
  });

  it("given a resolved act when recording then the author holds a DIRECT copy of it, as someone involved", () => {
    const { characters } = recordAct(recording());

    expect(memoriesOf(characters, 1)).toStrictEqual([
      createCopy(factIdOf(1), { perspective: "DIRECT" }, toBp(3000)),
    ]);
  });

  it("given someone who perceived nothing when recording then its memories do not change", () => {
    const { characters } = recordAct(recording());

    expect(memoriesOf(characters, 3)).toStrictEqual([]);
  });
});

describe("recordAct: TOLD copies (simulation-model §12)", () => {
  const HEARD: Perceived[] = [
    { id: idOf(2), perspective: "DIRECT" },
    { id: idOf(3), perspective: "FRAGMENT" },
  ];

  it("given a TELL about a fact when a hearer has no copy then the hearer gets a TOLD copy with 80% of the teller's fidelity", () => {
    const { characters } = recordAct(recording(TELL, HEARD, { 1: [aCopy(0, 6000, 9000)] }));

    expect(memoriesOf(characters, 2)[0]).toStrictEqual(
      createCopy(factIdOf(0), { perspective: "TOLD", tellerFidelity: toBp(6000) }, toBp(0)),
    );
    expect(memoriesOf(characters, 2)[0]?.fidelity).toBe(4800);
  });

  it("given a TELL about a fact when a hearer already has a copy then it keeps its own", () => {
    const own = aCopy(0, 2000);
    const { characters } = recordAct(recording(TELL, HEARD, { 1: [aCopy(0, 6000)], 2: [own] }));

    expect(memoriesOf(characters, 2)[0]).toBe(own);
  });

  it("given a TELL about a fact when a hearer only got a FRAGMENT then it gets no TOLD copy", () => {
    const { characters } = recordAct(recording(TELL, HEARD, { 1: [aCopy(0, 6000)] }));

    expect(memoriesOf(characters, 3).map((copy) => copy.fact)).toStrictEqual([1]);
  });

  it("given a TELL about a fact when recording then the teller's copy goes back to its highest fidelity", () => {
    const { characters } = recordAct(recording(TELL, HEARD, { 1: [aCopy(0, 6000, 9000)] }));

    expect(memoriesOf(characters, 1)[0]?.fidelity).toBe(9000);
  });

  it("given a TELL of a false version when recording then the TOLD copy carries the falsehood", () => {
    const falseCopy = { ...aCopy(0, 10000), falseOffenders: ids(4) };
    const { characters } = recordAct(recording(TELL, HEARD, { 1: [falseCopy] }));

    expect(memoriesOf(characters, 2)[0]?.falseOffenders).toStrictEqual(ids(4));
  });

  it("given a TELL about a fact when a hearer is in it then its TOLD copy has the importance of someone involved", () => {
    const perceived: Perceived[] = [{ id: idOf(4), perspective: "DIRECT" }];
    const { characters } = recordAct(
      recording({ ...TELL, targets: ids(4) }, perceived, { 1: [aCopy(0, 10000)] }),
    );

    expect(memoriesOf(characters, 4)[0]?.importance).toBe(3000);
  });

  it("given a TELL about small talk when recording then nobody gets a TOLD copy", () => {
    const { characters } = recordAct(recording({ ...TELL, topic: { type: "SMALL_TALK" } }, HEARD));

    expect(memoriesOf(characters, 2).map((copy) => copy.fact)).toStrictEqual([1]);
  });

  it("given a TELL of a fact the teller has no copy of when recording then it is a programming error", () => {
    expect(() => recordAct(recording(TELL, HEARD))).toThrow(RangeError);
  });
});

describe("recordAct: other acts about a fact (simulation-model §12)", () => {
  it.each(["ASK", "ACCUSE"] as const)(
    "given an %s about a fact when recording then nobody gets a TOLD copy",
    (act) => {
      const perceived: Perceived[] = [{ id: idOf(2), perspective: "DIRECT" }];
      const { characters } = recordAct(
        recording({ ...TELL, act }, perceived, { 1: [aCopy(0, 10000)] }),
      );

      expect(memoriesOf(characters, 2).map((copy) => copy.fact)).toStrictEqual([1]);
    },
  );

  it("given a hearer who is not in the act when recording then its copy has importance 0", () => {
    const label = aLabel({ targets: ids(2), topic: { type: "PERSON", person: idOf(4) } });
    const perceived: Perceived[] = [{ id: idOf(3), perspective: "DIRECT" }];
    const { characters } = recordAct(recording(label, perceived));

    expect(memoriesOf(characters, 3)[0]?.importance).toBe(0);
  });
});

describe("recordAct: what the appraisal adds (SOC-03)", () => {
  const LIE = { ...TELL, isFalse: true, blamed: idOf(4) };
  const HEARD: Perceived[] = [
    { id: idOf(2), perspective: "DIRECT" },
    { id: idOf(3), perspective: "DIRECT" },
  ];

  it("given offenders from the appraisal when recording then the fact keeps them", () => {
    const input = { ...recording(), appraisal: { offenders: ids(1) } };

    expect(recordAct(input).fact.offenders).toStrictEqual(ids(1));
  });

  it("given the band of an answer from the appraisal when recording then the fact keeps it", () => {
    const input = { ...recording(), appraisal: { band: "PARTIAL" as const } };

    expect(recordAct(input).fact.band).toBe("PARTIAL");
  });

  it("given an importance from the appraisal when recording then that character's copy has it", () => {
    const perceived: Perceived[] = [{ id: idOf(2), perspective: "DIRECT" }];
    const importances = [{ id: idOf(2), importance: toBp(7000) }];
    const { characters } = recordAct({
      ...recording(aLabel(), perceived),
      appraisal: { importances },
    });

    expect([1, 2].map((id) => memoriesOf(characters, id)[0]?.importance)).toStrictEqual([
      3000, 7000,
    ]);
  });

  it("given a lie believed by one hearer when recording then only the believer gets the false version", () => {
    const input = recording(LIE, HEARD, { 1: [aCopy(0, 10000)] });
    const { characters } = recordAct({ ...input, appraisal: { believers: ids(2) } });

    expect([2, 3].map((id) => memoriesOf(characters, id)[0]?.falseOffenders)).toStrictEqual([
      ids(4),
      null,
    ]);
    expect(memoriesOf(characters, 3).map((copy) => copy.fact)).toStrictEqual([1]);
  });

  it("given a believed denial when recording then the false version names nobody", () => {
    const denial = { ...TELL, isFalse: true };
    const input = recording(denial, HEARD, { 1: [aCopy(0, 10000)] });
    const { characters } = recordAct({ ...input, appraisal: { believers: ids(2, 3) } });

    expect(memoriesOf(characters, 3)[0]?.falseOffenders).toStrictEqual([]);
  });

  it("given a lie without decided belief when recording then the TOLD copy carries the teller's version", () => {
    const { characters } = recordAct(recording(LIE, HEARD, { 1: [aCopy(0, 10000)] }));

    expect(memoriesOf(characters, 2)[0]?.falseOffenders).toBeNull();
  });

  it("given believers for an honest TELL when recording then they change nothing", () => {
    const input = recording(TELL, HEARD, { 1: [aCopy(0, 10000)] });
    const { characters } = recordAct({ ...input, appraisal: { believers: [] } });

    expect(memoriesOf(characters, 3)[0]?.perspective).toBe("TOLD");
  });
});

describe("helpers", () => {
  it("given memories when adding a copy of an older fact then they stay sorted by fact id", () => {
    expect(
      withCopy([aCopy(1, 1), aCopy(5, 1)], aCopy(3, 1)).map((copy) => copy.fact),
    ).toStrictEqual([1, 3, 5]);
  });

  it("given memories with a copy of the fact when adding a copy then it replaces the old one", () => {
    expect(withCopy([aCopy(1, 1), aCopy(3, 1)], aCopy(3, 2))).toStrictEqual([
      aCopy(1, 1),
      aCopy(3, 2),
    ]);
  });

  it("given an empty record when numbering then the first fact is 0", () => {
    expect(nextFactId([])).toBe(0);
  });

  it("given a record when numbering then the next fact follows the highest id", () => {
    expect(nextFactId([HISTORY, aHistoryFact(4, 1, 2)])).toBe(5);
  });

  it("given a GROUP act when listing the addressees then they are the DIRECT hearers", () => {
    const perceived: Perceived[] = [
      { id: idOf(2), perspective: "DIRECT" },
      { id: idOf(3), perspective: "SEEN" },
    ];

    expect(addressees("GROUP", perceived)).toStrictEqual(ids(2));
  });

  it.each([
    [1, true],
    [2, true],
    [5, true],
    [3, false],
  ])(
    "given an act of 1 to 2 about 5 when asking whether %i is in it then it is %s",
    (id, inside) => {
      const fact = anActFact(
        9,
        1,
        aLabel({ targets: ids(2), topic: { type: "PERSON", person: idOf(5) } }),
      );

      expect(involvedIn(fact, idOf(id), [])).toBe(inside);
    },
  );

  it("given a GROUP act when asking whether a DIRECT hearer is in it then it is", () => {
    const fact = anActFact(9, 1, aLabel({ targets: "GROUP" }));

    expect(involvedIn(fact, idOf(2), [{ id: idOf(2), perspective: "DIRECT" }])).toBe(true);
  });

  it.each([
    [3, true],
    [4, true],
    [1, false],
  ])(
    "given a history fact of 3 against 4 when asking whether %i is in it then it is %s",
    (id, inside) => {
      expect(involvedIn(HISTORY, idOf(id), [])).toBe(inside);
    },
  );
});
