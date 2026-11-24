import { describe, expect, it } from "vitest";

import { ids } from "../../test/support/acts.ts";
import { aCharacter, someDrives } from "../../test/support/character.ts";
import { idOf } from "../../test/support/space.ts";
import { checkSliceEnd } from "./end.ts";
import {
  afterAct,
  afterSilence,
  noteReachedGoals,
  OPENING_TURNS,
  startLeaving,
  takeTurn,
} from "./state.ts";

describe("the turn state (simulation-model §11)", () => {
  it("given a slice that opens when reading the turn state then nothing has happened yet", () => {
    expect(OPENING_TURNS).toEqual({
      silentTicks: 0,
      requested: null,
      leaving: [],
      reachedGoals: [],
    });
  });

  it("given two ticks of silence and the player taking the turn when an act happens then the counter and the request go back to none", () => {
    const quiet = takeTurn(afterSilence(afterSilence(OPENING_TURNS)), idOf(4));

    expect([quiet.silentTicks, quiet.requested, afterAct(quiet)]).toEqual([2, 4, OPENING_TURNS]);
  });

  it("given characters starting to leave out of order when updating then the list stays sorted and without repetition", () => {
    const leaving = [3, 1, 3].reduce((turns, id) => startLeaving(turns, idOf(id)), OPENING_TURNS);

    expect(leaving.leaving).toEqual([1, 3]);
  });
});

describe("noteReachedGoals (simulation-model §11 item 1)", () => {
  const wanting = (id: number, deficit: number, weight = 7000) =>
    aCharacter(id, 0, {
      drives: someDrives({ weights: { intimacy: weight }, directed: { intimacy: [[2, deficit]] } }),
    });

  it.each([
    [1000, 999, 7000, ids(1, 2), [1]],
    [999, 500, 7000, ids(1, 2), []],
    [1000, 1000, 7000, ids(1, 2), []],
    [1000, 999, 6999, ids(1, 2), []],
    [1000, 999, 7000, ids(1), []],
  ] as const)(
    "given intimacy toward 2 going from %i to %i with weight %i and present %j when noting then the goals reached are %j",
    (before, after, weight, present, expected) => {
      const turns = noteReachedGoals(
        OPENING_TURNS,
        [wanting(1, before, weight)],
        [wanting(1, after, weight)],
        present,
      );

      expect(turns.reachedGoals).toEqual(expected);
    },
  );

  it("given a goal reached before when noting again then it is kept once, in id order", () => {
    const turns = { ...OPENING_TURNS, reachedGoals: ids(1, 5) };

    expect(
      noteReachedGoals(
        turns,
        [wanting(1, 4000), wanting(3, 4000)],
        [wanting(1, 0), wanting(3, 0)],
        ids(1, 2, 3),
      ).reachedGoals,
    ).toEqual([1, 3, 5]);
  });

  it("given someone who was not there before when noting then it reaches nothing", () => {
    expect(noteReachedGoals(OPENING_TURNS, [], [wanting(1, 0)], ids(1, 2)).reachedGoals).toEqual(
      [],
    );
  });
});

describe("checkSliceEnd (simulation-model §11 item 6)", () => {
  it.each([
    [2, 60, "SILENCE"],
    [2, 59, null],
    [1, 0, "ALONE"],
    [0, 0, "ALONE"],
    [3, 61, "SILENCE"],
  ] as const)(
    "given %i present and %i silent ticks when checking the end then it is %s",
    (present, silent, expected) => {
      expect(checkSliceEnd(present, silent)).toBe(expected);
    },
  );

  it("given 60 silent ticks when checking the end then the slice ends", () => {
    expect(checkSliceEnd(4, 60)).toBe("SILENCE");
  });
});

describe("noteReachedGoals: who is compared with whom", () => {
  const wanting = (id: number, target: number, deficit: number) =>
    aCharacter(id, 0, {
      drives: someDrives({
        weights: { intimacy: 7000 },
        directed: { intimacy: [[target, deficit]] },
      }),
    });

  it("given characters out of order before the update when noting then each is compared with its own past", () => {
    const turns = noteReachedGoals(
      OPENING_TURNS,
      [wanting(3, 2, 0), wanting(1, 2, 5000)],
      [wanting(1, 2, 0), wanting(3, 2, 0)],
      ids(1, 2, 3),
    );

    expect(turns.reachedGoals).toEqual([1]);
  });

  it("given a drive toward itself that drops when noting then it is no goal", () => {
    const turns = noteReachedGoals(
      OPENING_TURNS,
      [wanting(1, 1, 5000)],
      [wanting(1, 1, 0)],
      ids(1, 2),
    );

    expect(turns.reachedGoals).toEqual([]);
  });
});
