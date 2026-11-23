import { describe, expect, it } from "vitest";

import {
  aDrawer,
  aLabel,
  anActFact,
  defaultRules,
  factIdOf,
  forcing,
  ids,
} from "../../test/support/acts.ts";
import { aCharacter } from "../../test/support/character.ts";
import { openGrid } from "../../test/support/context.ts";
import { idOf } from "../../test/support/space.ts";
import { toBp } from "../domain/bp.ts";
import { createRngState } from "../rng/state.ts";
import type { ActLabel } from "./label.ts";
import type { Obligation } from "./obligations.ts";
import { resolveAct, type OwnDraws, type ResolveScene } from "./resolve.ts";

const RNG = createRngState({ castSeed: 1, sceneSeed: 7 });
const ASK = aLabel({ act: "ASK", tone: "IRONIC", targets: ids(2), topic: { type: "SMALL_TALK" } });

/** Author 1 at cell 0; 2 next to it; 3 at 12 cells (fragment range); 4 far beyond, unseen at night. */
function resolving(
  label: ActLabel,
  overrides: Partial<ResolveScene & OwnDraws> = {},
): ResolveScene & OwnDraws {
  return {
    rules: defaultRules(),
    grid: openGrid(25),
    now: { noise: toBp(0), vision: 20 },
    tick: 30,
    author: idOf(1),
    label,
    characters: [aCharacter(1, 0), aCharacter(2, 1), aCharacter(3, 12), aCharacter(4, 24 * 25)],
    facts: [],
    obligations: [],
    leaving: false,
    rng: RNG,
    mode: "NORMAL",
    forced: [],
    ...overrides,
  };
}

describe("resolveAct (simulation-model §16 step 5)", () => {
  it("given an invalid label when resolving then the error comes back and nothing is drawn", () => {
    expect(resolveAct(resolving({ ...ASK, targets: ids(9) }))).toStrictEqual({
      ok: false,
      error: { code: "TARGET_ABSENT", target: 9 },
    });
  });

  it("given an ASK when resolving then the listeners, readings and draws come in id order", () => {
    const forced = [
      forcing("HEAR_FRAGMENT", 1, 3),
      forcing("TONE_MISREAD", 1, 2),
      forcing("TONE_CONFUSION", 0, 2),
    ];
    const result = resolveAct(resolving(ASK, { forced }));

    expect(result).toMatchObject({
      ok: true,
      value: {
        ticks: 2,
        listeners: [
          { id: 2, perspective: "DIRECT", reading: { tone: "AGGRESSIVE", misread: true } },
          { id: 3, perspective: "FRAGMENT", reading: null },
        ],
      },
    });
  });

  it("given an ASK when resolving then the records name the tick, the purposes and the listeners", () => {
    const result = resolveAct(resolving(ASK, { forced: [forcing("TONE_MISREAD", 0, 2)] }));

    expect(
      result.ok && result.value.draws?.records.map((r) => [r.tick, r.purpose, r.target]),
    ).toStrictEqual([
      [30, "HEAR_FRAGMENT", 3],
      [30, "TONE_MISREAD", 2],
    ]);
  });

  it("given an ASK when resolving then the fact keeps the real tone and the target owes an answer", () => {
    const result = resolveAct(resolving(ASK, { forced: [forcing("TONE_MISREAD", 1, 2)] }));

    expect(result).toMatchObject({
      ok: true,
      value: {
        fact: { id: 0, tick: 30, author: 1, label: ASK },
        obligations: [{ debtor: 2, creditor: 1, fact: 0, act: "ASK", tick: 30 }],
        ended: [],
        movement: { kind: "STAY" },
        interruption: false,
      },
    });
  });

  it("given an ASK when resolving then every perceiver keeps a copy and the far one none", () => {
    const result = resolveAct(resolving(ASK, { forced: [forcing("HEAR_FRAGMENT", 0, 3)] }));
    const copies =
      result.ok && result.value.characters.map((c) => c.memories.map((m) => m.perspective));

    expect(copies).toStrictEqual([["DIRECT"], ["DIRECT"], ["SEEN"], []]);
  });

  it("given a pending question when its debtor answers then it ends ANSWERED", () => {
    const owed: Obligation = {
      debtor: idOf(1),
      creditor: idOf(2),
      fact: factIdOf(0),
      act: "ASK",
      topic: { type: "SMALL_TALK" },
      tick: 20,
    };
    const tell = aLabel({ act: "TELL", targets: ids(2) });
    const result = resolveAct(
      resolving(tell, { obligations: [owed], facts: [anActFact(0, 2, ASK, 20)] }),
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        obligations: [],
        ended: [{ obligation: owed, ending: "ANSWERED" }],
        fact: { id: 1 },
      },
    });
  });

  it("given a pending question to someone else when a third party acts then it is an interruption", () => {
    const owed: Obligation = {
      debtor: idOf(2),
      creditor: idOf(3),
      fact: factIdOf(0),
      act: "ASK",
      topic: { type: "SMALL_TALK" },
      tick: 20,
    };
    const result = resolveAct(
      resolving(aLabel(), { obligations: [owed], facts: [anActFact(0, 3, ASK, 20)] }),
    );

    expect(result).toMatchObject({ ok: true, value: { interruption: true, obligations: [owed] } });
  });

  it("given a LEAVE when resolving then it costs 1 tick and heads for the exit", () => {
    const grid = openGrid(25);
    const exits = grid.cells.map((_, cell) => cell === 4);
    const leave = aLabel({ act: "LEAVE", topic: { type: "NONE" } });

    expect(resolveAct(resolving(leave, { grid: { ...grid, exits } }))).toMatchObject({
      ok: true,
      value: { ticks: 1, movement: { kind: "GOAL", goal: { kind: "EXIT" }, destination: 4 } },
    });
  });

  it("given an author who is not present when resolving then it is a programming error", () => {
    expect(() => resolveAct(resolving(ASK, { author: idOf(9) }))).toThrow(RangeError);
  });
});

describe("resolveAct with the caller's drawer (one drawer per tick)", () => {
  it("given an open drawer when resolving then the draws go to it and the result leaves them to the caller", () => {
    const drawer = aDrawer([forcing("TONE_MISREAD", 0, 2)]);
    const result = resolveAct({ ...resolving(ASK), drawer });

    expect(result).toMatchObject({ ok: true, value: { draws: null } });
    expect(drawer.finish().records.map((record) => record.purpose)).toStrictEqual([
      "HEAR_FRAGMENT",
      "TONE_MISREAD",
    ]);
  });
});
