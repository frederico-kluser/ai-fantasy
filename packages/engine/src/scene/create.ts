/**
 * Creating a scene (overview §3.2, presets §10.1): the setup is checked, the
 * cast generated from the cast seed and the scene opened from the scene seed;
 * the result is the state of tick 0, ready for the first `step`.
 */
import type { z } from "zod";

import type { CharacterIdentity } from "../character/state.ts";
import type { ScenePlace } from "../context/scene.ts";
import { toBp } from "../domain/bp.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";
import { err, ok, type Result } from "../domain/result.ts";
import { generateCast } from "../generation/cast.ts";
import type { CastError } from "../generation/errors.ts";
import { openScene, type OpeningError } from "../generation/opening.ts";
import { nextFactId } from "../memory/record.ts";
import type { Presets } from "../presets/catalogs.ts";
import type { PlacePreset } from "../presets/places.ts";
import type { AssociationTagId } from "../presets/tags.ts";
import { ASSOCIATION_TAG_IDS } from "../presets/tags.ts";
import type { DrawRecord } from "../rng/drawer.ts";
import { OPENING_TURNS } from "../turns/state.ts";
import { sceneSetupSchema, type SceneSetup } from "./setup.ts";
import { sceneHash, type SceneState, type SceneWorld } from "./state.ts";

/** One problem of a setup that did not pass its schema. */
export interface SetupIssue {
  /** Where, as a dotted path (`seeds.castSeed`, `positions.2.x`). */
  readonly path: string;
  readonly message: string;
}

/** Why a scene could not be created. */
export type SceneError =
  | { readonly code: "INVALID_SETUP"; readonly issues: readonly SetupIssue[] }
  | { readonly code: "INVALID_CAST"; readonly errors: readonly CastError[] }
  | { readonly code: "INVALID_OPENING"; readonly error: OpeningError }
  | { readonly code: "INVALID_PLAYER"; readonly player: number };

/** A created scene. */
export interface SceneCreation {
  readonly state: SceneState;
  /** The setup with every default filled in: it goes into the session header. */
  readonly setup: SceneSetup;
  /** How each character is presented, by id: free text, out of the state and the hash. */
  readonly identities: readonly CharacterIdentity[];
  /** The draws of the cast and of the opening, in order. */
  readonly draws: readonly DrawRecord[];
  /** The hash of the state of tick 0 (see `sceneHash`). */
  readonly hash: string;
}

function issuesOf(error: z.ZodError): SetupIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

function presetOf<T extends { readonly id: string }>(list: readonly T[], id: string): T {
  const found = list.find((entry) => entry.id === id);
  if (found === undefined) {
    throw new RangeError(`the presets have no ${id}`);
  }
  return found;
}

/** The tags of the place plus its natural tag, once each, in catalog order (presets §2). */
function placeTags(place: PlacePreset, natural: AssociationTagId | null): AssociationTagId[] {
  const tags = new Set<AssociationTagId>([...place.tags, ...(natural === null ? [] : [natural])]);
  return ASSOCIATION_TAG_IDS.filter((tag) => tags.has(tag));
}

function scenePlace(place: PlacePreset, natural: AssociationTagId | null): ScenePlace {
  return {
    danger: place.danger,
    comfort: place.comfort,
    noise: place.noise,
    baseTemperature: place.baseTemperature,
    lit: place.lit,
    tags: placeTags(place, natural),
    exposure: place.exposure,
  };
}

/** The world and the state of tick 0 from an opened scene. */
function initialState(
  presets: Presets,
  setup: SceneSetup,
  opened: { readonly world: Omit<SceneWorld, "presets" | "privacy">; readonly rest: Rest },
): SceneState {
  const place = presetOf(presets.places, setup.place);
  return {
    world: { presets, privacy: toBp(place.privacy), ...opened.world },
    tick: 0,
    characters: [...opened.rest.characters].sort((a, b) => compareIds(a.id, b.id)),
    facts: opened.rest.facts,
    obligations: [],
    bands: [],
    turns: OPENING_TURNS,
    control: setup.control,
    walkers: [],
    awaiting: null,
    rng: opened.rest.rng,
    drawMode: "NORMAL",
    forced: [],
    ended: null,
  };
}

type Rest = Pick<SceneState, "characters" | "facts" | "rng">;

/**
 * Creates a scene (overview §3.2): checks the setup, generates the cast
 * (`generateCast`, cast seed) and opens the scene (`openScene`, scene seed)
 * on the grid template of `setup.grid` (the place's own by default), with the
 * natural tag added to the tags of the place.
 *
 * @returns the state of tick 0 with the setup, the identities, the draws and the
 * hash, or why the setup cannot open a scene.
 * @example
 * const created = createScene(presets, { seeds, cast, place: "home", weather: "clear", startMinute: 600 });
 */
export function createScene(presets: Presets, raw: unknown): Result<SceneCreation, SceneError> {
  const parsed = sceneSetupSchema.safeParse(raw);
  if (!parsed.success) {
    return err({ code: "INVALID_SETUP", issues: issuesOf(parsed.error) });
  }
  const setup = parsed.data;
  const generated = generateCast(presets, setup.cast, setup.seeds);
  if (!generated.ok) {
    return err({ code: "INVALID_CAST", errors: generated.error });
  }
  const { cast } = generated.value;
  if (setup.player !== null && setup.player >= cast.characters.length) {
    return err({ code: "INVALID_PLAYER", player: setup.player });
  }
  const place = presetOf(presets.places, setup.place);
  const template = presetOf(presets.places, setup.grid ?? setup.place);
  const opening = { grid: template.grid, dayStates: cast.dayStates, positions: setup.positions };
  const opened = openScene(presets, cast.characters, opening, generated.value.rng);
  if (!opened.ok) {
    return err({ code: "INVALID_OPENING", error: opened.error });
  }
  const weather = presetOf(presets.weathers, setup.weather);
  const world = {
    scene: {
      grid: opened.value.grid,
      place: scenePlace(place, setup.naturalTag),
      weather: { id: weather.id, temperature: weather.temperature, extraNoise: weather.extraNoise },
      startMinute: setup.startMinute,
    },
    // A player id below the cast size is a character id.
    player: setup.player as CharacterId | null,
    sliceStart: nextFactId(cast.facts),
  };
  const rest = { characters: opened.value.characters, facts: cast.facts, rng: opened.value.rng };
  const state = initialState(presets, setup, { world, rest });
  const draws = [...generated.value.records, ...opened.value.records];
  return ok({ state, setup, identities: cast.identities, draws, hash: sceneHash(state) });
}
