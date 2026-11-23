/**
 * Test support for the generation module: plain cast inputs built from a few
 * choices (testing-strategy §4), the default presets and readers of the
 * generated cast. Inputs are plain data, as the site or the SOM would send them.
 */
import type { CharacterState } from "../../src/character/state.ts";
import type { CharacterId } from "../../src/domain/ids.ts";
import type { Result } from "../../src/domain/result.ts";
import type { Presets } from "../../src/presets/catalogs.ts";
import { loadPresets } from "../../src/presets/load.ts";
import type { BondLabelId } from "../../src/presets/bonds.ts";

/** The engine presets, loaded once. */
export function defaultPresets(): Presets {
  const loaded = loadPresets();
  if (!loaded.ok) {
    throw new Error(`the default presets do not load: ${JSON.stringify(loaded.error)}`);
  }
  return loaded.value;
}

/** A character input with only an archetype and a name, plus the fields given. */
export function aCastCharacter(
  archetype: string,
  fields: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  return { archetype, identity: { name: `${archetype} person` }, ...fields };
}

/** An event input: what happened and who did it. */
export function anEvent(event: string, author: number): Record<string, unknown> {
  return { event, author };
}

/** A bond input between `a` (side A of the archetype) and `b`, plus the fields given. */
export function aBondSpec(
  a: number,
  b: number,
  archetype: string,
  fields: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  return { a, b, archetype, ...fields };
}

/** A cast input of characters with the given archetypes and the bonds given. */
export function aCastInput(
  archetypes: readonly string[],
  bonds: readonly Record<string, unknown>[] = [],
  fields: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  return { characters: archetypes.map((archetype) => aCastCharacter(archetype)), bonds, ...fields };
}

/** The value of a result that must have succeeded. */
export function valueOf<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new Error(`expected success, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

/** The error of a result that must have failed. */
export function errorOf<T, E>(result: Result<T, E>): E {
  if (result.ok) {
    throw new Error("expected a failure, got a success");
  }
  return result.error;
}

/** The character with `id` of a generated cast. */
export function characterOf(characters: readonly CharacterState[], id: number): CharacterState {
  const found = characters.find((character) => character.id === id);
  if (found === undefined) {
    throw new Error(`no character ${id}`);
  }
  return found;
}

/** The labels `holder` has for `target` (empty without a bond). */
export function labelsOf(
  characters: readonly CharacterState[],
  holder: number,
  target: number,
): readonly BondLabelId[] {
  return characterOf(characters, holder).bonds.find((bond) => bond.target === target)?.labels ?? [];
}

/** The ids of the characters holding a copy of fact `fact`. */
export function holdersOf(characters: readonly CharacterState[], fact: number): CharacterId[] {
  return characters
    .filter((character) => character.memories.some((copy) => copy.fact === fact))
    .map((character) => character.id);
}
