import { describe, expect, it } from "vitest";

import { aHistoryFact, aLabel, anActFact, factIdOf, ids } from "../../test/support/acts.ts";
import { aCharacter } from "../../test/support/character.ts";
import { toBp } from "../domain/bp.ts";
import { createCopy, type Perspective } from "../memory/copy.ts";
import { isDirectedTo, knownFacts, lastAct, lastActTo, mostImportant, sliceActs } from "./facts.ts";

const copy = (fact: number, perspective: Exclude<Perspective, "TOLD"> = "DIRECT", importance = 0) =>
  createCopy(factIdOf(fact), { perspective }, toBp(importance));

describe("isDirectedTo", () => {
  const group = anActFact(1, 2, aLabel({ targets: "GROUP" }));

  it.each([
    [[copy(1)], true],
    [[copy(0), copy(1)], true],
    [[copy(0)], false],
    [[copy(1, "FRAGMENT")], false],
    [[], false],
  ] as const)(
    "given the copies %j when reading a GROUP act then it was addressed: %s",
    (memories, expected) => {
      expect(isDirectedTo(group, aCharacter(3, 0, { memories }))).toBe(expected);
    },
  );

  it("given a listed act when reading then only its targets were addressed, whatever their copies", () => {
    const listed = anActFact(1, 2, aLabel({ targets: ids(3) }));

    expect([
      isDirectedTo(listed, aCharacter(3, 0)),
      isDirectedTo(listed, aCharacter(4, 0, { memories: [copy(1)] })),
    ]).toEqual([true, false]);
  });
});

describe("the last acts", () => {
  const facts = [
    anActFact(0, 2, aLabel({ targets: ids(1) })),
    anActFact(1, 2, aLabel({ targets: ids(3) })),
    aHistoryFact(2, 2, 3),
  ];

  it("given acts and a history fact after them when reading the last act then it is the last act fact", () => {
    expect(lastAct(facts)?.id).toBe(1);
  });

  it("given a later act addressed to someone else when reading the last act addressed to 1 then it is the earlier one", () => {
    expect(lastActTo(facts, aCharacter(1, 0))?.id).toBe(0);
  });

  it("given a record without acts when reading then there is no last act", () => {
    expect([lastAct([aHistoryFact(0, 2, 3)]), lastActTo([], aCharacter(1, 0))]).toEqual([
      undefined,
      undefined,
    ]);
  });

  it("given facts before and from the start of the slice when listing the slice acts then only the acts from it on come", () => {
    expect(sliceActs(facts, 1).map((fact) => fact.id)).toEqual([1]);
  });
});

describe("knownFacts and mostImportant", () => {
  const facts = [aHistoryFact(0, 2, 3), aHistoryFact(2, 2, 3)];

  it("given a copy of a fact that is not in the record when listing the known facts then it is skipped", () => {
    const who = aCharacter(1, 0, { memories: [copy(0), copy(1), copy(2)] });

    expect(knownFacts(who, facts).map(({ fact }) => fact.id)).toEqual([0, 2]);
  });

  it("given nothing that passes when looking for the most important then there is none", () => {
    expect(mostImportant(aCharacter(1, 0, { memories: [copy(0)] }), facts, () => false)).toBeNull();
  });
});
