/**
 * One tick of the status layers for everyone present (simulation-model §16
 * step 6, items 2 to 4): body, then emotions, then light, present tags, threat
 * and drives. Movement (item 1, `moveTick`) runs before it and signals (item 5,
 * SOC-02) after it; the engine step (SOC-05) chains them. Pure: the states
 * given are not changed.
 */
import { toBp, type Bp } from "../domain/bp.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";
import { itemAt } from "../domain/lookup.ts";
import {
  awareness,
  characterThreat,
  presenceView,
  proximityOf,
  type Awareness,
} from "../context/presence.ts";
import {
  thermalTarget,
  tickContext,
  type SceneContext,
  type TickContext,
} from "../context/scene.ts";
import { bodyTick, greatestNeed, type Body } from "./body.ts";
import { bondToward } from "./bonds.ts";
import { drivesTick, type TowardValue } from "./drive-tick.ts";
import { emotionsTick, isAroused, type BoredomSource, type Emotions } from "./emotions.ts";
import { apparentDistress } from "./perception.ts";
import { tagValences, type CharacterState } from "./state.ts";
import { effectiveTrait } from "./traits.ts";

/**
 * What fills the tick: silence, or an act going on and who it interests
 * (simulation-model §5.2; deciding who is interested is the acts rules' job).
 */
export type TickPace =
  | { readonly kind: "SILENCE" }
  | { readonly kind: "ACT"; readonly interested: readonly CharacterId[] };

/** Everything a status tick needs besides the characters. */
export interface StatusTickInput {
  readonly scene: SceneContext;
  /** The tick being simulated, counted from the start of the slice (sets the clock). */
  readonly tick: number;
  readonly pace: TickPace;
  /** Who entered a new cell during this tick's movement (fatigue +5 each). */
  readonly walked: readonly CharacterId[];
}

/** Another character as one observer perceives it this tick. */
interface Seen {
  readonly other: CharacterState;
  readonly aware: Awareness;
}

function boredomSource(pace: TickPace, id: CharacterId): BoredomSource {
  if (pace.kind === "SILENCE") {
    return "SILENCE";
  }
  return pace.interested.includes(id) ? "INTERESTING_ACT" : "UNINTERESTING_ACT";
}

function nextBody(character: CharacterState, input: StatusTickInput, now: TickContext): Body {
  const { scene } = input;
  return bodyTick(character.body, {
    phase: now.phase,
    cellsWalked: input.walked.includes(character.id) ? 1 : 0,
    aroused: isAroused(character.emotions),
    thermalTarget: thermalTarget(
      scene.place.baseTemperature,
      scene.weather.temperature,
      itemAt(scene.grid.roofed, character.cell),
    ),
  });
}

function nextEmotions(
  character: CharacterState,
  body: Body,
  input: StatusTickInput,
  now: TickContext,
): Emotions {
  return emotionsTick(character.emotions, character.baselines, {
    body,
    tagValences: tagValences(character.associations, now.presentTags),
    boredom: boredomSource(input.pace, character.id),
  });
}

function seenBy(
  character: CharacterState,
  others: readonly CharacterState[],
  input: StatusTickInput,
  now: TickContext,
): Seen[] {
  return others
    .filter((other) => other.id !== character.id)
    .map((other) => ({
      other,
      aware: awareness(input.scene.grid, now, character.cell, other.cell),
    }));
}

function threatOf(
  character: CharacterState,
  seen: readonly Seen[],
  input: StatusTickInput,
  now: TickContext,
): Bp {
  const presences = seen.map(({ other, aware }) =>
    presenceView(character, other.id, proximityOf(aware)),
  );
  return characterThreat(character, input.scene.place, now, presences);
}

function visibleAttractions(character: CharacterState, seen: readonly Seen[]): TowardValue[] {
  return seen
    .filter(({ aware }) => aware.sees)
    .map(({ other }) => ({
      target: other.id,
      value: bondToward(character.bonds, other.id).axes.attraction,
    }));
}

/** The apparent distress of each present Y; 0 when no signal or act was read from Y. */
function distresses(character: CharacterState, seen: readonly Seen[]): TowardValue[] {
  return seen.map(({ other }) => {
    const perception = character.perceptions.find((entry) => entry.target === other.id);
    return {
      target: other.id,
      value: perception === undefined ? toBp(0) : apparentDistress(perception),
    };
  });
}

function tickOne(
  character: CharacterState,
  everyone: readonly CharacterState[],
  input: StatusTickInput,
  now: TickContext,
): CharacterState {
  const body = nextBody(character, input, now);
  const emotions = nextEmotions(character, body, input, now);
  const seen = seenBy(character, everyone, input, now);
  const threat = threatOf(character, seen, input, now);
  const drives = drivesTick(character.drives, {
    greatestNeed: greatestNeed(body),
    threat,
    silence: input.pace.kind === "SILENCE",
    sociability: effectiveTrait(character.traits, character.tendencies, "sociability"),
    boredom: toBp(emotions.boredom),
    visibleAttractions: visibleAttractions(character, seen),
    distresses: distresses(character, seen),
  });
  return { ...character, body, emotions, drives, threat };
}

/**
 * Advances the status of everyone present by one tick (simulation-model §16
 * step 6, items 2 to 4), in increasing id order: body (§5.1, with the thermal
 * target of the character's cell), emotions (§5.2: decay, then the gains of
 * associations, boredom and body), then the light and present tags of the tick
 * (§3.2, §5.7), the threat (§6) and the drives (§5.3). Everyone reads the
 * positions, bonds and perceptions as they were at the start of the tick.
 * Returns the characters sorted by id.
 *
 * @example
 * const moved = moveTick(grid, occupants);           // item 1 (CORE-02)
 * const status = statusTick(characters, { scene, tick, pace, walked });
 * @throws RangeError if a character stands outside the grid.
 */
export function statusTick(
  characters: readonly CharacterState[],
  input: StatusTickInput,
): CharacterState[] {
  const now = tickContext(input.scene, input.tick);
  return [...characters]
    .sort((a, b) => compareIds(a.id, b.id))
    .map((character) => tickOne(character, characters, input, now));
}
