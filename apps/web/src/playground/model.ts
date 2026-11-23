/**
 * The manual playground as data (overview §6, presets §10.1): the form the
 * user fills — seeds, place, time, weather, characters by archetype, bonds,
 * positions and the player's character — and how it becomes the engine's cast
 * input and the scene setup. Pure: the components only render it.
 */
import {
  PRESETS_VERSION,
  type AgeBand,
  type AssociationTagId,
  type BondArchetypeId,
  type CastInputData,
  type CellPos,
  type CharacterArchetypeId,
  type DayStateId,
  type DriveId,
  type HistoryEventId,
  type PlaceId,
  type RngSeeds,
  type SpeechRegister,
  type WeatherId,
} from "@ai-fantasy/engine";

import type { BondDraftData, CastView, CharacterDraftData, Problem } from "../engine/protocol.ts";
import { SETUP_VERSION, type SceneSetup } from "./setup.ts";

/** A fear of or an attachment to a tag (presets §8). */
export interface AssociationChoice {
  readonly tag: AssociationTagId;
  readonly kind: "FEAR" | "ATTACHMENT";
}

/** A character of the form: the archetype, the identity, the choices and the lock. */
export interface CharacterForm {
  readonly archetype: CharacterArchetypeId;
  readonly name: string;
  readonly pronouns: string;
  readonly role: string;
  readonly description: string;
  readonly ageBand: AgeBand;
  readonly speechRegister: SpeechRegister;
  readonly dayState: DayStateId;
  /** The two picks for the dominant drives (presets §5); `null` leaves it to the archetype. */
  readonly drives: readonly [DriveId | null, DriveId | null];
  readonly association: AssociationChoice | null;
  /** The drawn values kept as they are, or `null` to draw them (presets §10.1). */
  readonly locked: CharacterDraftData | null;
}

/** An event of a bond: what happened and who did it (a character id). */
export interface EventForm {
  readonly event: HistoryEventId;
  readonly author: number;
}

/** A bond of the form: the pair (`a` is side A of the archetype), the archetype, events and lock. */
export interface BondForm {
  readonly a: number;
  readonly b: number;
  readonly archetype: BondArchetypeId;
  readonly events: readonly EventForm[];
  readonly locked: BondDraftData | null;
}

/** A pair the transitive family added, locked to its drawn values (presets §10.1, `derived`). */
export interface DerivedForm {
  readonly a: number;
  readonly b: number;
  readonly locked: BondDraftData;
}

/** The manual playground form. */
export interface PlaygroundState {
  readonly seeds: RngSeeds;
  /** The attempt of the cast generation (presets §10.1, "Tentativas e travados"). */
  readonly attempt: number;
  readonly place: PlaceId;
  readonly grid: PlaceId;
  readonly naturalTag: AssociationTagId | null;
  readonly weather: WeatherId;
  readonly startMinute: number;
  readonly characters: readonly CharacterForm[];
  readonly bonds: readonly BondForm[];
  /** The locked pairs the family added; any change to the bonds drops them. */
  readonly derived: readonly DerivedForm[];
  /** A cell chosen by hand for each character, by id, or `null` to draw it. */
  readonly positions: readonly (CellPos | null)[];
  readonly player: number | null;
  /** Counts the changes to the cast, so a late generation of an older cast is dropped. */
  readonly revision: number;
  /** Whether a drawn axis was edited since the last generation: the generated view is out of date. */
  readonly axesEdited: boolean;
  /** The last generated cast of this revision, or `null`. */
  readonly generated: CastView | null;
}

/** Minute of the day the form starts at: 20:00, an evening (presets §10, step 2). */
export const DEFAULT_START_MINUTE = 1200;

/** A new form with the seeds given: a social interior on a clear evening, no one yet. */
export function initialPlayground(seeds: RngSeeds): PlaygroundState {
  return {
    seeds,
    attempt: 0,
    place: "social_interior",
    grid: "social_interior",
    naturalTag: null,
    weather: "clear",
    startMinute: DEFAULT_START_MINUTE,
    characters: [],
    bonds: [],
    derived: [],
    positions: [],
    player: null,
    revision: 0,
    generated: null,
    axesEdited: false,
  };
}

/** A new character of the archetype, with no name yet and every choice at its default. */
export function newCharacter(archetype: CharacterArchetypeId): CharacterForm {
  return {
    archetype,
    name: "",
    pronouns: "",
    role: "",
    description: "",
    ageBand: "ADULT",
    speechRegister: "COLLOQUIAL",
    dayState: "rested",
    drives: [null, null],
    association: null,
    locked: null,
  };
}

function characterInput(character: CharacterForm) {
  const { name, pronouns, role, description, ageBand, speechRegister } = character;
  const picks = character.drives.filter((drive) => drive !== null);
  return {
    archetype: character.archetype,
    identity: { name: name.trim(), pronouns, role, description, ageBand, speechRegister },
    dominantDrives: [...new Set(picks)],
    dayState: character.dayState,
    association: character.association === null ? null : { ...character.association },
    locked: character.locked,
  };
}

/** The engine's cast input of the form (presets §10.1), with its attempt and locks. */
export function castInputOf(state: PlaygroundState): CastInputData {
  return {
    attempt: state.attempt,
    characters: state.characters.map(characterInput),
    bonds: state.bonds.map((bond) => ({
      a: bond.a,
      b: bond.b,
      archetype: bond.archetype,
      events: bond.events.map((event) => ({ ...event })),
      locked: bond.locked,
    })),
    derived: state.derived.map((pair) => ({ ...pair })),
  };
}

/** The scene setup of the form: what the review sheet checks and confirms. */
export function sceneSetupOf(state: PlaygroundState): SceneSetup {
  return {
    version: SETUP_VERSION,
    presetsVersion: PRESETS_VERSION,
    seeds: { ...state.seeds },
    cast: castInputOf(state),
    place: state.place,
    grid: state.grid,
    naturalTag: state.naturalTag,
    weather: state.weather,
    startMinute: state.startMinute,
    positions: state.positions.slice(0, state.characters.length),
    player: state.player,
  };
}

/**
 * What the form still lacks before the engine can check it: a character, and
 * a name for each. The engine checks the rest (presets §10.1, "Validação").
 */
export function formProblems(state: PlaygroundState): Problem[] {
  if (state.characters.length === 0) {
    return [{ path: "cast.characters", message: "Adicione pelo menos um personagem ao elenco." }];
  }
  return state.characters.flatMap((character, index) =>
    character.name.trim() === ""
      ? [
          {
            path: `cast.characters.${String(index)}.identity.name`,
            message: `Dê um nome ao personagem ${String(index + 1)}.`,
          },
        ]
      : [],
  );
}
