/**
 * The turn state of a slice (simulation-model §11, "Detalhes dos turnos"):
 * the silence counter, who asked for the turn (`TAKE_TURN`), who is leaving
 * and who reached its goal. Plain data in id order, so the scene state (SOC-05)
 * can hold and hash it; every change returns a new state.
 */
import { dominantDrives, directedDeficit, isDirected } from "../character/drives.ts";
import type { CharacterState } from "../character/state.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";

/** The player's character and who controls it. */
export interface PlayerSeat {
  readonly id: CharacterId;
  readonly control: "AUTO" | "MANUAL";
}

/** The turn state of a slice. */
export interface TurnState {
  /** Ticks of silence in a row; any act sets it back to 0. */
  readonly silentTicks: number;
  /** The player who asked for the turn (`TAKE_TURN`), until it acts. */
  readonly requested: CharacterId | null;
  /** Who is leaving, sorted by id: they walk to an exit and no longer take turns. */
  readonly leaving: readonly CharacterId[];
  /** Who reached the goal of the scene (simulation-model §11 item 1), sorted by id. */
  readonly reachedGoals: readonly CharacterId[];
}

/** The turn state when a slice opens. */
export const OPENING_TURNS: TurnState = {
  silentTicks: 0,
  requested: null,
  leaving: [],
  reachedGoals: [],
};

/** A deficit below which a dominant directed drive is fulfilled (simulation-model §11 item 1). */
const GOAL_DEFICIT = 1000;

function withId(list: readonly CharacterId[], id: CharacterId): CharacterId[] {
  return [...new Set([...list, id])].sort(compareIds);
}

/** `TAKE_TURN` (simulation-model §16 step 1): the player acts next. */
export function takeTurn(turns: TurnState, player: CharacterId): TurnState {
  return { ...turns, requested: player };
}

/** A tick of silence (simulation-model §11 item 3): the counter grows. */
export function afterSilence(turns: TurnState): TurnState {
  return { ...turns, silentTicks: turns.silentTicks + 1 };
}

/** An act (simulation-model §11 item 3): the counter and the turn asked for go back to none. */
export function afterAct(turns: TurnState): TurnState {
  return { ...turns, silentTicks: 0, requested: null };
}

/** `who` starts leaving (simulation-model §11 item 1). */
export function startLeaving(turns: TurnState, who: CharacterId): TurnState {
  return { ...turns, leaving: withId(turns.leaving, who) };
}

/** Whether, for `character`, a dominant directed drive toward one of `present` went from ≥ 1000 to < 1000. */
function reached(before: CharacterState, after: CharacterState, present: readonly CharacterId[]) {
  return dominantDrives(after.drives)
    .filter(isDirected)
    .some((drive) =>
      present.some(
        (target) =>
          directedDeficit(before.drives, drive, target) >= GOAL_DEFICIT &&
          directedDeficit(after.drives, drive, target) < GOAL_DEFICIT,
      ),
    );
}

/**
 * Notes who reached the goal of the scene in an update (simulation-model §11,
 * "Detalhes dos turnos"): a dominant directed drive toward a present went from
 * ≥ 1000 before to < 1000 after. Pass the characters before and after the
 * update and the ids of everyone present.
 */
export function noteReachedGoals(
  turns: TurnState,
  before: readonly CharacterState[],
  after: readonly CharacterState[],
  present: readonly CharacterId[],
): TurnState {
  const reachedNow = after.filter((now) => {
    const then = before.find((character) => character.id === now.id);
    return (
      then !== undefined &&
      reached(
        then,
        now,
        present.filter((id) => id !== now.id),
      )
    );
  });
  return {
    ...turns,
    reachedGoals: reachedNow.reduce((list, { id }) => withId(list, id), [...turns.reachedGoals]),
  };
}
