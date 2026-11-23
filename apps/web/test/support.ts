/**
 * Test support of the site (testing-strategy §4): plain cast inputs and scene
 * setups built from a few choices, and readers of results.
 */
import { PRESETS_VERSION, type CastInputData, type Result } from "@ai-fantasy/engine";

import type { SceneSetup } from "../src/playground/setup.ts";

/** Seeds used by the tests. */
export const SEEDS = { castSeed: 20261123, sceneSeed: 7 } as const;

/** A cast input of named characters with the archetypes given, plus the bonds given. */
export function aCastInput(
  characters: readonly (readonly [name: string, archetype: string])[],
  bonds: readonly Record<string, unknown>[] = [],
  attempt = 0,
): CastInputData {
  // Test inputs are plain data; the engine validates them like any input.
  return {
    attempt,
    characters: characters.map(([name, archetype]) => ({ archetype, identity: { name } })),
    bonds,
  } as CastInputData;
}

/** A valid setup of two characters in the social interior, plus the fields given. */
export function aSetup(fields: Partial<SceneSetup> = {}): SceneSetup {
  return {
    version: 1,
    presetsVersion: PRESETS_VERSION,
    seeds: { ...SEEDS },
    cast: aCastInput(
      [
        ["Ana", "caretaker"],
        ["Bruno", "rebel"],
      ],
      [{ a: 0, b: 1, archetype: "siblings" }],
    ),
    place: "social_interior",
    grid: "social_interior",
    naturalTag: null,
    weather: "rain",
    startMinute: 1200,
    positions: [],
    player: 0,
    ...fields,
  };
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
    throw new Error(`expected a failure, got ${JSON.stringify(result.value)}`);
  }
  return result.error;
}
