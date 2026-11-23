import { describe, expect, it } from "vitest";

import type { CharacterState } from "../character/state.ts";
import type { CharacterId, FactId } from "../domain/ids.ts";
import type { HistoryFact } from "../memory/fact.ts";
import { createDrawer } from "../rng/drawer.ts";
import { createRngState } from "../rng/state.ts";
import { aBond, aCharacter, someDrives } from "../../test/support/character.ts";
import { aBondSpec, aCastInput, defaultPresets, valueOf } from "../../test/support/cast.ts";
import { presetById } from "./lookup.ts";
import { planCast } from "./validate.ts";
import { drawHook, hasTension, hookPair, TENSION_EVENTS } from "./tension.ts";

const presets = defaultPresets();

/** Character 0 with `bond` toward 1, and character 1 with `back` toward 0. */
function pairOf(
  bond: Parameters<typeof aBond>[1],
  back: Parameters<typeof aBond>[1] = {},
  labels: Parameters<typeof aBond>[2] = [],
): [CharacterState, CharacterState] {
  return [
    aCharacter(0, 0, { bonds: [aBond(1, bond, labels)] }),
    aCharacter(1, 1, { bonds: [aBond(0, back)] }),
  ];
}

function aFact(author: number, subject: number, secret: boolean): HistoryFact {
  return {
    id: 0 as FactId,
    kind: "HISTORY",
    event: "stole",
    author: author as CharacterId,
    subject: subject as CharacterId,
    offenders: [],
    secret,
  };
}

describe("hasTension (presets §10 step 6)", () => {
  it.each([
    ["resentment 3000", pairOf({ resentment: 3000 }), true],
    ["resentment 2999", pairOf({ resentment: 2999 }), false],
    ["fear of the other 3000", pairOf({ fearOf: 3000 }), true],
    ["fear of the other 2999", pairOf({ fearOf: 2999 }), false],
    ["the other's resentment 3000", pairOf({}, { resentment: 3000 }), true],
    ["a CREDITOR label", pairOf({}, {}, ["CREDITOR"]), true],
    ["a DEBTOR label", pairOf({}, {}, ["DEBTOR"]), true],
    ["a FRIEND label", pairOf({}, {}, ["FRIEND"]), false],
    ["attraction 6000 against 2000", pairOf({ attraction: 6000 }, { attraction: 2000 }), true],
    ["attraction 2000 against 6000", pairOf({ attraction: 2000 }, { attraction: 6000 }), true],
    ["attraction 5999 against 2000", pairOf({ attraction: 5999 }, { attraction: 2000 }), false],
    ["attraction 6000 against 2001", pairOf({ attraction: 6000 }, { attraction: 2001 }), false],
  ] as const)("given %s when checking the bond then tension is %s", (_case, [x, y], tension) => {
    expect(hasTension(x, y, [])).toBe(tension);
  });

  it.each([
    [3000, true],
    [2999, false],
  ])(
    "given justice %i directed at the other when checking the bond then tension is %s",
    (deficit, tension) => {
      const x = aCharacter(0, 0, { drives: someDrives({ directed: { justice: [[1, deficit]] } }) });

      expect(hasTension(x, aCharacter(1, 1), [])).toBe(tension);
    },
  );

  it.each([
    ["a secret fact between them", [aFact(1, 0, true)], true],
    ["a known fact between them", [aFact(0, 1, false)], false],
    ["a secret fact with someone else", [aFact(0, 2, true)], false],
  ])("given %s when checking the bond then tension is %s", (_case, facts, tension) => {
    expect(hasTension(aCharacter(0, 0), aCharacter(1, 1), facts)).toBe(tension);
  });
});

describe("hookPair and drawHook (presets §10.1 step 5)", () => {
  it("given the six tension events when listing them then they follow presets §10 step 6", () => {
    expect(TENSION_EVENTS).toStrictEqual([
      "betrayed_trust",
      "lent_not_repaid",
      "secret_affair",
      "rejected_love",
      "broken_promise",
      "informed_on",
    ]);
  });

  it("given a known pair written with the higher id first when choosing the hook then the lower id comes first", () => {
    const { pairs } = valueOf(
      planCast(presets, aCastInput(["rebel", "merchant", "elder"], [aBondSpec(2, 0, "neighbors")])),
    );
    const characters = [aCharacter(0, 0), aCharacter(1, 1), aCharacter(2, 2)];

    expect(hookPair(pairs, characters, [])).toStrictEqual([0, 2]);
  });

  function forcedDrawer(author: number, event: number) {
    return createDrawer(createRngState({ castSeed: 1, sceneSeed: 1 }), {
      tick: 0,
      mode: "NORMAL",
      forced: [
        { selector: { kind: "PURPOSE", purpose: "TENSION_AUTHOR" }, outcome: author },
        { selector: { kind: "PURPOSE", purpose: "TENSION_EVENT" }, outcome: event },
      ],
    });
  }

  const presetOf = (id: Parameters<typeof presetById>[1]) => presetById(presets.historyEvents, id);
  const PAIR = [0 as CharacterId, 2 as CharacterId] as const;

  it.each([
    [1, { event: "broken_promise", author: 2, subject: 0, secret: false }],
    [0, { event: "broken_promise", author: 0, subject: 2, secret: false }],
  ])(
    "given the author outcome %i forced when drawing the hook then the hook is %j",
    (author, hook) => {
      expect(drawHook(forcedDrawer(author, 4), PAIR, presetOf, () => true)).toStrictEqual(hook);
    },
  );

  it("given only one event that would bring tension when drawing the hook then it is the only one that can come out", () => {
    const drawer = forcedDrawer(0, 4);
    const hook = drawHook(drawer, PAIR, presetOf, (placed) => placed.event === "secret_affair");
    const draw = drawer.finish().records.find((record) => record.purpose === "TENSION_EVENT");

    expect([hook.event, draw?.bound, draw?.forced]).toStrictEqual(["secret_affair", 1, undefined]);
  });

  it("given an event that brings tension only when secret when drawing the hook then it is left out", () => {
    const tenses = (placed: { readonly event: string; readonly secret: boolean }) =>
      placed.event === "informed_on" || (placed.event === "betrayed_trust" && placed.secret);

    expect(drawHook(forcedDrawer(0, 0), PAIR, presetOf, tenses).event).toBe("informed_on");
  });
});
