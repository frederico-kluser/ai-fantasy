/**
 * Test data shared by the tests of `@ai-fantasy/ai`. Not production code: it
 * lives outside `src/`, so it is out of coverage and mutation.
 */
import {
  loadPresets,
  toCharacterId,
  toFactId,
  type CharacterId,
  type FactId,
  type Presets,
  type Result,
} from "@ai-fantasy/engine";

import type { Person, PlayerLineInput } from "../src/prompts/player-line.ts";

/** The value of a result the test knows is `ok`; throws otherwise. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

/** The default presets of the engine. */
export function presets(): Presets {
  return unwrap(loadPresets());
}

/** A character id. */
export function charId(value: number): CharacterId {
  return unwrap(toCharacterId(value));
}

/** A fact id. */
export function factId(value: number): FactId {
  return unwrap(toFactId(value));
}

/** A person known to the speaker. */
export function person(id: number, name: string): Person {
  return { id: charId(id), name };
}

/**
 * A player line in a tavern: Lia speaks; Otávio (4) and Bento (1) listen;
 * Cora (7) is known but absent.
 */
export function playerLineInput(overrides: Partial<PlayerLineInput> = {}): PlayerLineInput {
  return {
    line: "Bom dia, Otávio!",
    speaker: "Lia",
    listeners: [person(4, "Otávio"), person(1, "Bento")],
    scene: "uma taverna à noite",
    knownFacts: ["Otávio deve dinheiro a Bento"],
    entities: [
      { description: "Otávio", topic: { type: "PERSON", person: charId(4) } },
      { description: "a dívida de Otávio", topic: { type: "EVENT", fact: factId(0) } },
    ],
    people: [person(7, "Cora"), person(4, "Otávio"), person(1, "Bento")],
    ...overrides,
  };
}
