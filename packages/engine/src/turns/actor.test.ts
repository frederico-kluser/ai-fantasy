import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { aDrawer, aLabel, anActFact, ids } from "../../test/support/acts.ts";
import {
  aCharacter,
  arbitraryCharacter,
  someDrives,
  someEmotions,
  someTraits,
} from "../../test/support/character.ts";
import { anObligation } from "../../test/support/decision.ts";
import { idOf } from "../../test/support/space.ts";
import { pickActor, urges, type TurnInput } from "./actor.ts";
import { OPENING_TURNS, startLeaving, takeTurn } from "./state.ts";

/** A character whose urge is 5000 (sociability 10000), or 3500 when `quiet`. */
const eager = (id: number) => aCharacter(id, id, { traits: someTraits({ sociability: 10000 }) });
const quiet = (id: number) => aCharacter(id, id);

const asked = anActFact(0, 2, aLabel({ act: "ASK", targets: ids(1) }));
const owed = anObligation(1, 2, 0, "ASK", asked.label.topic);

const anInput = (overrides: Partial<TurnInput> = {}): TurnInput => ({
  characters: [eager(3), eager(1), quiet(2)],
  player: null,
  turns: OPENING_TURNS,
  facts: [],
  obligations: [],
  ...overrides,
});

describe("pickActor (simulation-model §11 items 3 to 5)", () => {
  it("given nobody above the urge threshold when picking the actor then the result is a silence tick", () => {
    const drawer = aDrawer();
    const pick = pickActor(drawer, anInput({ characters: [quiet(1), quiet(2)] }));

    expect([pick, drawer.finish().records.length]).toEqual([{ kind: "SILENCE" }, 0]);
  });

  it("given characters out of order, one quiet and one leaving, when picking then the draw is among the others in id order on the turn stream", () => {
    const drawer = aDrawer([{ selector: { kind: "PURPOSE", purpose: "TURN_ACTOR" }, outcome: 1 }]);
    const input = anInput({
      characters: [eager(4), eager(3), eager(1), quiet(2)],
      turns: startLeaving(OPENING_TURNS, idOf(4)),
    });
    const pick = pickActor(drawer, input);
    const [record] = drawer.finish().records;

    expect([pick, record?.stream, record?.purpose, record?.target, record?.bound]).toEqual([
      { kind: "ACT", actor: 3, interruption: false },
      "turn",
      "TURN_ACTOR",
      undefined,
      10000,
    ]);
  });

  it("given a single character above the threshold when picking then it is drawn anyway", () => {
    const drawer = aDrawer();
    const pick = pickActor(drawer, anInput({ characters: [eager(1), quiet(2)] }));

    expect([pick, drawer.finish().records.length]).toEqual([
      { kind: "ACT", actor: 1, interruption: false },
      1,
    ]);
  });

  it.each([
    [0, 1, false],
    [1, 3, true],
  ] as const)(
    "given a pending obligation of 1 to 2 when the draw picks option %i (character %i) then the interruption mark is %s",
    (outcome, actor, interruption) => {
      const drawer = aDrawer([{ selector: { kind: "PURPOSE", purpose: "TURN_ACTOR" }, outcome }]);
      const pick = pickActor(drawer, anInput({ facts: [asked], obligations: [owed] }));

      expect(pick).toEqual({ kind: "ACT", actor, interruption });
    },
  );

  it("given a pending obligation when a third character is picked then the act is marked as an interruption", () => {
    // 1 is eager too: the last act was addressed to it and left it an obligation.
    const drawer = aDrawer([{ selector: { kind: "PURPOSE", purpose: "TURN_ACTOR" }, outcome: 1 }]);
    const characters = [eager(3), quiet(1), quiet(2)];

    expect(pickActor(drawer, anInput({ characters, facts: [asked], obligations: [owed] }))).toEqual(
      {
        kind: "ACT",
        actor: 3,
        interruption: true,
      },
    );
  });

  it("given the player in MANUAL picked when picking the actor then the result asks for player input and no act is chosen", () => {
    const drawer = aDrawer([{ selector: { kind: "PURPOSE", purpose: "TURN_ACTOR" }, outcome: 0 }]);
    const pick = pickActor(drawer, anInput({ player: { id: idOf(1), control: "MANUAL" } }));

    expect(pick).toEqual({ kind: "AWAIT_PLAYER", player: 1, interruption: false });
  });

  it("given the player in AUTO picked when picking then it acts like anyone else", () => {
    const drawer = aDrawer([{ selector: { kind: "PURPOSE", purpose: "TURN_ACTOR" }, outcome: 0 }]);
    const pick = pickActor(drawer, anInput({ player: { id: idOf(1), control: "AUTO" } }));

    expect(pick).toEqual({ kind: "ACT", actor: 1, interruption: false });
  });

  it("given the player took the turn while someone owed an answer when picking then the player is awaited, nothing is drawn and it interrupts", () => {
    const drawer = aDrawer();
    const pick = pickActor(
      drawer,
      anInput({
        characters: [quiet(1), quiet(2), quiet(5)],
        player: { id: idOf(5), control: "MANUAL" },
        turns: takeTurn(OPENING_TURNS, idOf(5)),
        facts: [asked],
        obligations: [owed],
      }),
    );

    expect([pick, drawer.finish().records.length]).toEqual([
      { kind: "AWAIT_PLAYER", player: 5, interruption: true },
      0,
    ]);
  });
});

describe("urges", () => {
  it("given characters out of order when listing the urges then they come in id order", () => {
    expect(urges(anInput())).toEqual([
      { id: 1, urge: 5000 },
      { id: 2, urge: 3500 },
      { id: 3, urge: 5000 },
    ]);
  });
});

describe("invariant 9: the player in MANUAL never gets an act chosen by the engine (simulation-model §18)", () => {
  it("given any characters, player seat, request and draw when picking the actor then a MANUAL player is never picked to ACT", () => {
    const scenario = fc.record({
      characters: fc.tuple(
        arbitraryCharacter(0, 0, [1, 2]),
        arbitraryCharacter(1, 1, [0, 2]),
        arbitraryCharacter(2, 2, [0, 1]),
      ),
      player: fc.integer({ min: 0, max: 2 }),
      control: fc.constantFrom("AUTO" as const, "MANUAL" as const),
      requested: fc.boolean(),
      outcome: fc.integer({ min: 0, max: 2 }),
      silentTicks: fc.integer({ min: 0, max: 80 }),
    });
    fc.assert(
      fc.property(scenario, ({ characters, player, control, requested, outcome, silentTicks }) => {
        const seat = { id: idOf(player), control };
        const turns = {
          ...OPENING_TURNS,
          silentTicks,
          requested: [null, seat.id][Number(requested)] ?? null,
        };
        const drawer = aDrawer([{ selector: { kind: "PURPOSE", purpose: "TURN_ACTOR" }, outcome }]);
        const pick = pickActor(drawer, {
          characters,
          player: seat,
          turns,
          facts: [],
          obligations: [],
        });
        const actedByManual = pick.kind === "ACT" && control === "MANUAL" && pick.actor === seat.id;

        expect(actedByManual).toBe(false);
      }),
    );
  });
});

describe("turns: limits and who counts", () => {
  it("given an urge of exactly 4000 when picking then the character takes part in the draw", () => {
    const edge = aCharacter(1, 0, { emotions: someEmotions({ anger: 1667 }) });
    const drawer = aDrawer();

    expect([
      urges(anInput({ characters: [edge] })),
      pickActor(drawer, anInput({ characters: [edge] })),
    ]).toEqual([[{ id: 1, urge: 4000 }], { kind: "ACT", actor: 1, interruption: false }]);
  });

  it("given a directed drive toward someone present when listing the urges then its pressure counts", () => {
    const caring = aCharacter(1, 0, {
      drives: someDrives({ weights: { care: 10000 }, directed: { care: [[2, 5000]] } }),
    });

    expect(urges(anInput({ characters: [caring, aCharacter(2, 1)] }))[0]).toEqual({
      id: 1,
      urge: 3500 + 1000,
    });
  });
});
