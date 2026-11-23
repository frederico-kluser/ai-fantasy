/**
 * Who acts (simulation-model §11 items 3 to 5): the player who asked for the
 * turn, or a weighted draw by urge among those at or above the threshold; a
 * tick of silence when nobody is. The player in `MANUAL` is never given an act
 * (invariant 9): picking it asks for its input instead.
 */
import type { Obligation } from "../acts/obligations.ts";
import { isInterruption } from "../acts/obligations.ts";
import type { CharacterState } from "../character/state.ts";
import { URGE_THRESHOLD } from "../domain/constants.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";
import type { Fact } from "../memory/fact.ts";
import type { Drawer } from "../rng/drawer.ts";
import type { PlayerSeat, TurnState } from "./state.ts";
import { urgeToAct } from "./urge.ts";

/** What picking the actor reads. */
export interface TurnInput {
  /** The characters present (those leaving included), in any order. */
  readonly characters: readonly CharacterState[];
  /** The player's character, or `null` when the player only watches. */
  readonly player: PlayerSeat | null;
  readonly turns: TurnState;
  readonly facts: readonly Fact[];
  readonly obligations: readonly Obligation[];
}

/** One character's urge to act. */
export interface Urge {
  readonly id: CharacterId;
  readonly urge: number;
}

/**
 * The outcome of a decision point: a character in `AUTO` acts (its act is
 * chosen by the decision), the player in `MANUAL` is awaited (no act is
 * chosen), or nobody acts and a tick of silence passes.
 */
export type ActorPick =
  | { readonly kind: "ACT"; readonly actor: CharacterId; readonly interruption: boolean }
  | { readonly kind: "AWAIT_PLAYER"; readonly player: CharacterId; readonly interruption: boolean }
  | { readonly kind: "SILENCE" };

/** The urge of each present character who is not leaving, in id order. */
export function urges(input: TurnInput): Urge[] {
  const present = input.characters.map((character) => character.id);
  const context = { ...input, present, silentTicks: input.turns.silentTicks };
  return [...input.characters]
    .filter((character) => !input.turns.leaving.includes(character.id))
    .sort((a, b) => compareIds(a.id, b.id))
    .map((character) => ({ id: character.id, urge: urgeToAct(character, context) }));
}

function drawActor(drawer: Drawer, input: TurnInput): CharacterId | null {
  const eligible = urges(input).filter(({ urge }) => urge >= URGE_THRESHOLD);
  if (eligible.length === 0) {
    return null;
  }
  const index = drawer.drawWeighted(
    "turn",
    eligible.map(({ urge }) => urge),
    "TURN_ACTOR",
  );
  return eligible[index]?.id ?? null;
}

/**
 * Picks who acts at a decision point (simulation-model §11 items 3 to 5): the
 * player who asked for the turn, with no draw; otherwise a weighted draw by
 * urge (`TURN_ACTOR`, stream `turn`) among those not leaving with urge ≥ 4000,
 * in id order; nobody, a tick of silence. The pick says whether acting now
 * interrupts an obligation of the last act.
 */
export function pickActor(drawer: Drawer, input: TurnInput): ActorPick {
  const actor = input.turns.requested ?? drawActor(drawer, input);
  if (actor === null) {
    return { kind: "SILENCE" };
  }
  const interruption = isInterruption(input.obligations, input.facts, actor);
  const { player } = input;
  if (player?.id === actor && player.control === "MANUAL") {
    return { kind: "AWAIT_PLAYER", player: actor, interruption };
  }
  return { kind: "ACT", actor, interruption };
}
