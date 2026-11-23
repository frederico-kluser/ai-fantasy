import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { aDrawer, aLabel, anActFact, forcing, ids } from "../../test/support/acts.ts";
import {
  aBody,
  aBond,
  aCharacter,
  arbitraryCharacter,
  someDrives,
  someEmotions,
} from "../../test/support/character.ts";
import { openGrid } from "../../test/support/context.ts";
import { anObligation } from "../../test/support/decision.ts";
import { idOf } from "../../test/support/space.ts";
import { toBp } from "../domain/bp.ts";
import type { ActFact } from "../memory/fact.ts";
import { decideDepartures, departureAct, leaveScores, type DepartureInput } from "./departures.ts";
import { OPENING_TURNS, startLeaving } from "./state.ts";

const anInput = (overrides: Partial<DepartureInput> = {}): DepartureInput => ({
  grid: openGrid(25),
  now: { phase: "AFTERNOON", noise: toBp(0) },
  weather: "clear",
  tick: 20,
  characters: [],
  player: null,
  turns: OPENING_TURNS,
  facts: [],
  sliceStart: 0,
  obligations: [],
  ...overrides,
});

const critical = (id: number, cell = id) =>
  aCharacter(id, cell, { body: aBody({ bladder: 9500 }) });
/** A character whose will to leave beats the will to stay by `lead` (boredom, then threat; no need). */
const restless = (id: number, lead: number) =>
  aCharacter(id, id, {
    emotions: someEmotions({ boredom: 6000 + Math.min(lead, 4000) }),
    threat: toBp(6000 + Math.max(0, lead - 4000)),
  });

describe("decideDepartures (simulation-model §11 item 1)", () => {
  it("given an NPC with bladder 9500 when deciding departures then the NPC leaves without a draw", () => {
    const drawer = aDrawer();
    const departure = decideDepartures(
      drawer,
      anInput({ characters: [critical(2), aCharacter(1, 1)] }),
    );

    expect([
      departure.kind,
      "forced" in departure && departure.forced,
      drawer.finish().records,
    ]).toEqual(["LEAVE", true, []]);
  });

  it("given two NPCs that would both leave when deciding departures then only the one with the lowest id starts leaving", () => {
    const departure = decideDepartures(
      aDrawer(),
      anInput({ characters: [critical(3), critical(2)] }),
    );

    expect("character" in departure && departure.character).toBe(2);
  });

  it("given a lead of 2999 when deciding then nothing is drawn and nobody leaves", () => {
    const drawer = aDrawer();

    expect([
      decideDepartures(drawer, anInput({ characters: [restless(1, 2999), aCharacter(2, 2)] })),
      drawer.finish().records,
    ]).toEqual([{ kind: "NONE" }, []]);
  });

  it.each([
    [3000, 6000],
    [3999, 7998],
    [4750, 9500],
    [4999, 9500],
  ] as const)(
    "given a lead of %i when deciding then the leave draw has chance %i on the leave stream",
    (lead, p) => {
      const drawer = aDrawer([forcing("LEAVE_DECISION", 0, 1)]);
      decideDepartures(drawer, anInput({ characters: [restless(1, lead), aCharacter(2, 2)] }));
      const [record] = drawer.finish().records;

      expect([record?.stream, record?.purpose, record?.target, record?.p]).toEqual([
        "leave",
        "LEAVE_DECISION",
        1,
        p,
      ]);
    },
  );

  it("given the first character's draw succeeds when deciding then the later ones are not weighed", () => {
    const drawer = aDrawer([forcing("LEAVE_DECISION", 1, 1)]);
    const departure = decideDepartures(
      drawer,
      anInput({ characters: [critical(2), restless(1, 4000)] }),
    );

    expect([
      "character" in departure && departure.character,
      drawer.finish().records.length,
    ]).toEqual([1, 1]);
  });

  it("given the first character's draw fails when deciding then the next one is weighed", () => {
    const drawer = aDrawer([forcing("LEAVE_DECISION", 0, 1)]);
    const departure = decideDepartures(
      drawer,
      anInput({ characters: [critical(2), restless(1, 4000)] }),
    );

    expect("character" in departure && departure.character).toBe(2);
  });

  it("given the player in AUTO with a critical need when deciding then it is not forced but drawn", () => {
    const drawer = aDrawer([forcing("LEAVE_DECISION", 0, 1)]);
    const departure = decideDepartures(
      drawer,
      anInput({
        characters: [critical(1), aCharacter(2, 2)],
        player: { id: idOf(1), control: "AUTO" },
      }),
    );

    expect([departure, drawer.finish().records.length]).toEqual([{ kind: "NONE" }, 1]);
  });

  it("given the player in MANUAL with a critical need when deciding then it never leaves by itself", () => {
    const departure = decideDepartures(
      aDrawer(),
      anInput({
        characters: [critical(1), aCharacter(2, 2)],
        player: { id: idOf(1), control: "MANUAL" },
      }),
    );

    expect(departure).toEqual({ kind: "NONE" });
  });

  it("given a critical NPC already leaving when deciding then it is not weighed again", () => {
    const departure = decideDepartures(
      aDrawer(),
      anInput({
        characters: [critical(1), aCharacter(2, 2)],
        turns: startLeaving(OPENING_TURNS, idOf(1)),
      }),
    );

    expect(departure).toEqual({ kind: "NONE" });
  });

  it("given any characters and a MANUAL player when deciding then the player is never the one who leaves (invariant 9)", () => {
    const scenario = fc.record({
      characters: fc.tuple(arbitraryCharacter(0, 0, [1]), arbitraryCharacter(1, 30, [0])),
      player: fc.integer({ min: 0, max: 1 }),
      outcome: fc.integer({ min: 0, max: 1 }),
    });
    fc.assert(
      fc.property(scenario, ({ characters, player, outcome }) => {
        const drawer = aDrawer([
          { selector: { kind: "PURPOSE", purpose: "LEAVE_DECISION" }, outcome },
        ]);
        const seat = { id: idOf(player), control: "MANUAL" as const };
        const departure = decideDepartures(drawer, anInput({ characters, player: seat }));

        expect("character" in departure && departure.character === seat.id).toBe(false);
      }),
    );
  });
});

describe("leaveScores (simulation-model §11 item 1)", () => {
  it("given known inputs for every term when weighing then leave and stay follow the formula term by term", () => {
    const who = aCharacter(1, 0, {
      body: aBody({ bladder: 8000 }),
      threat: toBp(7000),
      emotions: someEmotions({ boredom: 6500 }),
      drives: someDrives({
        deficits: { company: 5000, curiosity: 4000 },
        directed: {
          desire: [
            [2, 2000],
            [9, 9000],
          ],
        },
      }),
    });
    const input = anInput({
      now: { phase: "LATE_NIGHT", noise: toBp(0) },
      weather: "rain",
      characters: [who, aCharacter(2, 1)],
      turns: { ...OPENING_TURNS, reachedGoals: ids(1) },
      obligations: [anObligation(1, 2, 0, "ASK", { type: "SMALL_TALK" })],
    });

    expect(leaveScores(input, who)).toEqual({
      leave: 3000 + 1000 + 500 + 1500 + 1000 + 3000,
      stay: 1500 + 800 + 800 + 3000,
    });
  });

  it.each([
    ["DAWN", "storm", [], 1500 + 1000],
    ["MORNING", "storm", [0], 0],
    ["EVENING", "snow", [], 0],
  ] as const)(
    "given %s, %s and roofed cells %j when weighing then the time and the weather add %i",
    (phase, weather, roofed, expected) => {
      const who = aCharacter(1, 0);
      const input = anInput({
        now: { phase, noise: toBp(0) },
        weather,
        grid: openGrid(25, roofed),
        characters: [who],
      });

      expect(leaveScores(input, who).leave).toBe(expected);
    },
  );

  it.each([
    [{ intimacy: 7000 }, "HARD_REFUSE", 2, 3000],
    [{ intimacy: 6999 }, "HARD_REFUSE", 2, 0],
    [{ intimacy: 7000 }, "REFUSE", 2, 0],
    [{ intimacy: 7000 }, "HARD_REFUSE", 5, 0],
    [{ company: 7000 }, "HARD_REFUSE", 2, 0],
  ] as const)(
    "given dominant weights %j and a %s from %i in this slice when weighing then the lost goal adds %i",
    (weights, band, from, expected) => {
      const who = aCharacter(1, 0, { drives: someDrives({ weights }) });
      const refusal: ActFact = {
        ...anActFact(1, from, aLabel({ act: "REFUSE", targets: ids(1) })),
        band,
      };
      const input = anInput({
        characters: [who, aCharacter(2, 1)],
        facts: [refusal],
        sliceStart: 1,
      });

      expect(leaveScores(input, who).leave).toBe(expected);
    },
  );

  it("given a hard refusal from a previous slice when weighing then the goal is not lost", () => {
    const who = aCharacter(1, 0, { drives: someDrives({ weights: { intimacy: 7000 } }) });
    const refusal: ActFact = {
      ...anActFact(1, 2, aLabel({ act: "REFUSE", targets: ids(1) })),
      band: "HARD_REFUSE",
    };
    const input = anInput({ characters: [who, aCharacter(2, 1)], facts: [refusal], sliceStart: 2 });

    expect(leaveScores(input, who).leave).toBe(0);
  });
});

describe("departureAct (simulation-model §11 item 1)", () => {
  const leaver = (affection: number) =>
    aCharacter(1, 0, { bonds: [aBond(2, { affection }), aBond(3, { affection: 9000 })] });
  const near = aCharacter(2, 1);
  const far = aCharacter(3, 24);

  it.each([
    [6000, 9, "FAREWELL", "WARM"],
    [5999, 9, "FAREWELL", "NEUTRAL"],
    [6000, 8, "LEAVE", "NEUTRAL"],
  ] as const)(
    "given affection %i for the near listener and an act at tick %i when leaving at tick 20 then the act is %s in %s",
    (affection, tick, act, tone) => {
      const who = leaver(affection);
      const input = anInput({
        characters: [who, near, far],
        facts: [anActFact(0, 1, aLabel(), tick)],
      });

      expect([departureAct(input, who).act, departureAct(input, who).tone]).toEqual([act, tone]);
    },
  );

  it("given an act addressed to the leaver recently when leaving then the farewell goes to the group about small talk, at 3000 and NORMAL", () => {
    const who = leaver(0);
    const input = anInput({
      characters: [who, near],
      facts: [anActFact(0, 2, aLabel({ targets: ids(1) }), 15)],
    });

    expect(departureAct(input, who)).toEqual({
      act: "FAREWELL",
      tone: "NEUTRAL",
      targets: "GROUP",
      topic: { type: "SMALL_TALK" },
      intensity: 3000,
      volume: "NORMAL",
      isFalse: false,
    });
  });

  it("given no recent act when leaving then the act is LEAVE to nobody about nothing", () => {
    const who = leaver(0);
    const input = anInput({
      characters: [who, near],
      facts: [anActFact(0, 2, aLabel({ targets: ids(3) }), 19)],
    });

    expect(departureAct(input, who)).toEqual({
      act: "LEAVE",
      tone: "NEUTRAL",
      targets: [],
      topic: { type: "NONE" },
      intensity: 3000,
      volume: "NORMAL",
      isFalse: false,
    });
  });
});
