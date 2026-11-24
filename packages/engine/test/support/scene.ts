/**
 * Test support for the scene module: setups built from a few choices, scenes
 * created from them, and states with a few fields replaced. Setups are plain
 * data, as the site or a recorded session would send them.
 */
import type { CharacterState } from "../../src/character/state.ts";
import type { CharacterId } from "../../src/domain/ids.ts";
import type { Presets } from "../../src/presets/catalogs.ts";
import { createScene, type SceneCreation } from "../../src/scene/create.ts";
import type { SceneState } from "../../src/scene/state.ts";
import { aBondSpec, aCastInput, defaultPresets, valueOf } from "./cast.ts";

/** The engine presets, loaded once for every scene test. */
export const PRESETS: Presets = defaultPresets();

/** A tavern scene of three: an old pair of friends and a merchant stranger, at 20:00. */
export function aSceneSetup(fields: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    seeds: { castSeed: 11, sceneSeed: 23 },
    cast: aCastInput(
      ["protector", "bohemian", "merchant"],
      [aBondSpec(0, 1, "old_friends"), aBondSpec(1, 2, "acquaintances")],
    ),
    place: "social_interior",
    weather: "clear",
    startMinute: 1200,
    ...fields,
  };
}

/** A scene created from {@link aSceneSetup} with the fields given. */
export function aCreatedScene(fields: Readonly<Record<string, unknown>> = {}): SceneCreation {
  return valueOf(createScene(PRESETS, aSceneSetup(fields)));
}

/** The state of tick 0 of {@link aCreatedScene}. */
export function aSceneState(fields: Readonly<Record<string, unknown>> = {}): SceneState {
  return aCreatedScene(fields).state;
}

/** The character `id` of a state. */
export function characterIn(state: SceneState, id: number): CharacterState {
  const found = state.characters.find((character) => character.id === id);
  if (found === undefined) {
    throw new Error(`no character ${id} in the scene`);
  }
  return found;
}

/** The state with character `id` changed by `change`. */
export function withCharacter(
  state: SceneState,
  id: number,
  change: (character: CharacterState) => CharacterState,
): SceneState {
  return {
    ...state,
    characters: state.characters.map((character) =>
      character.id === id ? change(character) : character,
    ),
  };
}

/** A character id from a number, for tests. */
export function idOf(value: number): CharacterId {
  // Test ids are small integers ≥ 0.
  return value as CharacterId;
}
