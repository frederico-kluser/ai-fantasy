/**
 * Test support for the acts module: the rules from the default presets, act
 * labels built from a few overrides, facts and drawers for one tick.
 */
import type { ActLabel, Topic } from "../../src/acts/label.ts";
import type { ActRules } from "../../src/acts/rules.ts";
import { toBp } from "../../src/domain/bp.ts";
import type { CharacterId, FactId } from "../../src/domain/ids.ts";
import type { ActFact, HistoryFact } from "../../src/memory/fact.ts";
import type { Presets } from "../../src/presets/catalogs.ts";
import { loadPresets } from "../../src/presets/load.ts";
import { createDrawer, type Drawer, type ForcedDraw } from "../../src/rng/drawer.ts";
import { createRngState } from "../../src/rng/state.ts";

/** The acts and tones of the default presets. */
export function defaultRules(): ActRules {
  const presets = loadPresets();
  if (!presets.ok) {
    throw new Error("test rules: the default presets do not load");
  }
  return { acts: presets.value.acts, tones: presets.value.tones };
}

/** The request objects of the default presets. */
export function defaultObjects(): Presets["requestObjects"] {
  const presets = loadPresets();
  if (!presets.ok) {
    throw new Error("test objects: the default presets do not load");
  }
  return presets.value.requestObjects;
}

/** The history events of the default presets. */
export function defaultHistoryEvents(): Presets["historyEvents"] {
  const presets = loadPresets();
  if (!presets.ok) {
    throw new Error("test history: the default presets do not load");
  }
  return presets.value.historyEvents;
}

/** A label with the overrides given: a NEUTRAL CHAT about small talk to nobody, at NORMAL volume. */
export function aLabel(overrides: Partial<ActLabel> = {}): ActLabel {
  return {
    act: "CHAT",
    tone: "NEUTRAL",
    targets: [],
    topic: { type: "SMALL_TALK" },
    intensity: toBp(5000),
    volume: "NORMAL",
    isFalse: false,
    ...overrides,
  };
}

/** Character ids, already sorted as the test writes them. */
export function ids(...values: number[]): CharacterId[] {
  return values as CharacterId[];
}

/** A fact id; test ids are known to be valid. */
export function factIdOf(value: number): FactId {
  return value as FactId;
}

/** A topic about a fact. */
export function aboutFact(type: "EVENT" | "SECRET" | "RUMOR", fact: number): Topic {
  return { type, fact: factIdOf(fact) };
}

/** A history fact `id` in which `author` did something to `subject`. */
export function aHistoryFact(
  id: number,
  author: number,
  subject: number,
  overrides: Partial<Pick<HistoryFact, "offenders" | "secret">> = {},
): HistoryFact {
  return {
    kind: "HISTORY",
    id: factIdOf(id),
    event: "betrayed_trust",
    author: author as CharacterId,
    subject: subject as CharacterId,
    offenders: [],
    secret: false,
    ...overrides,
  };
}

/** An act fact `id` made at `tick` by `author` with `label`. */
export function anActFact(id: number, author: number, label: ActLabel, tick = 0): ActFact {
  return {
    kind: "ACT",
    id: factIdOf(id),
    tick,
    author: author as CharacterId,
    label,
    band: null,
    offenders: [],
    secret: false,
  };
}

/** A drawer for tick 0 of the scene seed 7, with the forced outcomes given. */
export function aDrawer(forced: readonly ForcedDraw[] = []): Drawer {
  return createDrawer(createRngState({ castSeed: 1, sceneSeed: 7 }), {
    tick: 0,
    mode: "NORMAL",
    forced,
  });
}

/** Forces the draws of `purpose` about `target` to `outcome`. */
export function forcing(purpose: string, outcome: number, target: number): ForcedDraw {
  return { selector: { kind: "PURPOSE", purpose, target: target as CharacterId }, outcome };
}

/** The error code of a result, or `"OK"` when it succeeded. */
export function codeOrOk<C extends string>(
  result: { readonly ok: true } | { readonly ok: false; readonly error: { readonly code: C } },
): C | "OK" {
  return result.ok ? "OK" : result.error.code;
}
