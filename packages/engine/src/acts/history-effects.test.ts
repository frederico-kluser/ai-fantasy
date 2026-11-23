import { describe, expect, it } from "vitest";

import {
  aHistoryFact,
  aLabel,
  anActFact,
  defaultHistoryEvents,
  factIdOf,
  ids,
} from "../../test/support/acts.ts";
import {
  aBond,
  aCharacter,
  someDrives,
  someEmotions,
  someShifts,
  someTraits,
} from "../../test/support/character.ts";
import { toBp } from "../domain/bp.ts";
import { createCopy } from "../memory/copy.ts";
import type { Fact } from "../memory/fact.ts";
import { historyEventSchema, type HistoryEvent } from "../presets/history-events.ts";
import { applyDeferredHistory, type HistoryRules } from "./history-effects.ts";

const EVENTS: HistoryRules = defaultHistoryEvents();

/** `secret_affair`-like test event: only A knows; B's shame rises, and guilt if honest. */
const SHAMING: HistoryEvent = historyEventSchema.parse({
  id: "secret_affair",
  name: "teste",
  onA: { bond: {}, drives: {}, baselines: {}, baselinesIfHonest: {} },
  onB: {
    bond: { trust: -1000 },
    drives: { justice: 2000, dignity: 500 },
    baselines: { shame: 800 },
    baselinesIfHonest: { guilt: 400 },
  },
  offender: "A",
  secretChance: 10000,
  knownBy: "A",
});

/** Fact 0: 1 betrayed the trust of 2 in secret (only 1 knows). */
const BETRAYAL: Fact = aHistoryFact(0, 1, 2, { offenders: ids(1), secret: true });

function told(fact = 0) {
  return createCopy(factIdOf(fact), { perspective: "TOLD", tellerFidelity: toBp(8000) }, toBp(0));
}

describe("applyDeferredHistory (presets §7: effects on B wait for B's first copy)", () => {
  it("given the victim of a secret betrayal who gets its first copy when applying then onB applies once and the fact is marked", () => {
    const before = aCharacter(2, 0, { bonds: [aBond(1, { trust: 5000 })] });
    const after = { ...before, memories: [told()] };

    const [victim] = applyDeferredHistory([before], [after], [BETRAYAL], EVENTS);

    expect(victim?.bonds[0]?.axes).toMatchObject({ trust: 1000, resentment: 4000 });
    expect(victim?.drives.directed.justice).toEqual([{ target: 1, deficit: 3000 }]);
    expect(victim?.historyApplied).toEqual([0]);
  });

  it("given a fact already marked when the victim gets a copy again then nothing applies twice", () => {
    const before = aCharacter(2, 0, { historyApplied: [factIdOf(0)] });
    const after = { ...before, memories: [told()] };

    expect(applyDeferredHistory([before], [after], [BETRAYAL], EVENTS)).toEqual([after]);
  });

  it.each([
    ["the author", aCharacter(1, 0), [BETRAYAL]],
    ["a third party", aCharacter(3, 0), [BETRAYAL]],
    ["the victim of a known event", aCharacter(2, 0), [{ ...BETRAYAL, secret: false }]],
    [
      "the victim of an event both know",
      aCharacter(2, 0),
      [{ ...BETRAYAL, event: "public_humiliation" as const }],
    ],
    ["someone told of an act", aCharacter(2, 0), [anActFact(0, 1, aLabel())]],
    ["someone told of an unknown fact", aCharacter(2, 0), []],
  ])(
    "given %s who gets a copy when applying then nothing happens",
    (_case, before, facts: readonly Fact[]) => {
      const after = { ...before, memories: [told()] };

      expect(applyDeferredHistory([before], [after], facts, EVENTS)).toEqual([after]);
    },
  );

  it("given a victim who already held a copy when applying then nothing happens", () => {
    const before = aCharacter(2, 0, { memories: [told()] });

    expect(applyDeferredHistory([before], [before], [BETRAYAL], EVENTS)).toEqual([before]);
  });

  it("given an event with baseline shifts when applying then the shifts add up and the baselines are recomputed, guilt only for the effectively honest", () => {
    const fact: Fact = { ...BETRAYAL, event: "secret_affair" };
    const honest = aCharacter(2, 0, {
      traits: someTraits({ honesty: -2000 }),
      tendencies: someTraits({ honesty: 10000 }),
      baselineShifts: someShifts({ shame: 100 }),
      drives: someDrives({ deficits: { dignity: 9800 } }),
    });
    const [after] = applyDeferredHistory(
      [honest],
      [{ ...honest, memories: [told()] }],
      [fact],
      [SHAMING],
    );

    expect(after?.baselineShifts).toEqual(someShifts({ shame: 900, guilt: 400 }));
    expect(after?.baselines).toMatchObject({ shame: 900, guilt: 400 });
    expect(after?.drives.deficits.dignity).toBe(10000);
    expect(after?.emotions).toEqual(someEmotions());
  });

  it("given a dishonest victim when applying then the guilt shift waits for honesty above 0", () => {
    const fact: Fact = { ...BETRAYAL, event: "secret_affair" };
    const victim = aCharacter(2, 0);
    const [after] = applyDeferredHistory(
      [victim],
      [{ ...victim, memories: [told()] }],
      [fact],
      [SHAMING],
    );

    expect(after?.baselineShifts.guilt).toBe(0);
  });

  it("given two new facts out of order when applying then the marks stay sorted", () => {
    const later: Fact = { ...BETRAYAL, id: factIdOf(4) };
    const before = aCharacter(2, 0, { historyApplied: [factIdOf(2)] });
    const after = { ...before, memories: [told(0), told(4)] };

    const [victim] = applyDeferredHistory([before], [after], [later, BETRAYAL], EVENTS);

    expect(victim?.historyApplied).toEqual([0, 2, 4]);
  });

  it("given an event missing from the catalog when the victim learns it then nothing happens", () => {
    const before = aCharacter(2, 0);
    const after = { ...before, memories: [told()] };

    expect(applyDeferredHistory([before], [after], [BETRAYAL], [])).toEqual([after]);
  });

  it("given two characters where only the second learns the fact when applying then only it changes", () => {
    const other = aCharacter(3, 0, { memories: [told()] });
    const victim = aCharacter(2, 0);
    const result = applyDeferredHistory(
      [other, victim],
      [other, { ...victim, memories: [told()] }],
      [BETRAYAL],
      EVENTS,
    );

    expect(result.map((character) => character.historyApplied)).toEqual([[], [0]]);
  });

  it("given a secret betrayal the victim learned nothing of when applying then nothing happens", () => {
    const victim = aCharacter(2, 0);
    const after = { ...victim, memories: [told(3)] };

    expect(applyDeferredHistory([victim], [after], [BETRAYAL], EVENTS)).toEqual([after]);
  });

  it("given a character who was not present before when applying then it is left as it is", () => {
    const after = { ...aCharacter(2, 0), memories: [told()] };

    expect(applyDeferredHistory([], [after], [BETRAYAL], EVENTS)).toEqual([after]);
  });
});
