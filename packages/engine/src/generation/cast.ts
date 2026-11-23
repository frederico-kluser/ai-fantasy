/**
 * The cast generator (presets §10.1): characters, bonds and history from the
 * presets, drawn only in the `generation` stream of the cast seed, with the
 * locked parts kept as given and the tension hook when the cast lacks tension.
 */
import type { CharacterIdentity, CharacterState } from "../character/state.ts";
import type { CharacterId, FactId } from "../domain/ids.ts";
import { itemAt } from "../domain/lookup.ts";
import { ok, type Result } from "../domain/result.ts";
import type { HistoryFact } from "../memory/fact.ts";
import type { Presets } from "../presets/catalogs.ts";
import type { DayStateId } from "../presets/day-states.ts";
import { createDrawer, type DrawRecord, type Drawer } from "../rng/drawer.ts";
import { createRngState, type RngSeeds, type RngState } from "../rng/state.ts";
import { assembleCharacter, type DrawnPair } from "./assemble.ts";
import { drawBond } from "./bond-draft.ts";
import { drawCharacter } from "./character-draft.ts";
import type { CastError } from "./errors.ts";
import type { PairPlan } from "./graph.ts";
import { eventOutcome, joinEffects, type Effects, type PlacedEvent } from "./history.ts";
import type { BondDraft, CastInput, CharacterDraft } from "./input.ts";
import { presetById } from "./lookup.ts";
import { drawHook, hookPair } from "./tension.ts";
import { planCast } from "./validate.ts";

/** A generated cast (presets §10.1, "Saída"). */
export interface Cast {
  /** Presentation of each character, by id: out of the hash. */
  readonly identities: readonly CharacterIdentity[];
  /** The state of each character, by id, before the scene opens (see `openScene`). */
  readonly characters: readonly CharacterState[];
  /** The history facts, by id. */
  readonly facts: readonly HistoryFact[];
  /** The day state chosen for each character, by id, for `openScene`. */
  readonly dayStates: readonly DayStateId[];
  /** The drawn values, in the order of the input, to lock them in a new attempt. */
  readonly drafts: {
    readonly characters: readonly CharacterDraft[];
    readonly bonds: readonly BondDraft[];
  };
  /** The tension event the generator added (also the last fact), or `null`. */
  readonly hook: PlacedEvent | null;
}

/** A cast with the rng state after its draws and their records. */
export interface CastGeneration {
  readonly cast: Cast;
  readonly rng: RngState;
  readonly records: readonly DrawRecord[];
}

function identityOf(input: CastInput, id: number): CharacterIdentity {
  const spec = itemAt(input.characters, id);
  return { id: id as CharacterId, archetype: spec.archetype, ...spec.identity };
}

function drawPairs(drawer: Drawer, presets: Presets, pairs: readonly PairPlan[]): DrawnPair[] {
  return pairs.map((plan) => {
    const archetype = presetById(presets.bondArchetypes, plan.archetype);
    const events = plan.events.map(({ event, author }) => ({
      preset: presetById(presets.historyEvents, event),
      author: author as CharacterId,
    }));
    const draft = plan.locked ?? drawBond(drawer, { a: plan.a, b: plan.b, archetype, events });
    const directed = { aToB: archetype.aToB.directedDrives, bToA: archetype.bToA.directedDrives };
    return { plan, draft, directed };
  });
}

/** The events of the pairs, in pair order and list order, with their secrets. */
function placedEvents(pairs: readonly DrawnPair[]): PlacedEvent[] {
  return pairs.flatMap(({ plan, draft }) =>
    plan.events.map(({ event, author }, index): PlacedEvent => ({
      event,
      author: author as CharacterId,
      subject: author === plan.a ? plan.b : plan.a,
      secret: draft.secrets[index] === true,
    })),
  );
}

interface History {
  readonly facts: readonly HistoryFact[];
  readonly effects: Effects;
}

function historyOf(
  presets: Presets,
  events: readonly PlacedEvent[],
  drafts: readonly CharacterDraft[],
): History {
  const honesty = (id: CharacterId) => itemAt(drafts, id).traits.honesty;
  const outcomes = events.map((placed, index) =>
    eventOutcome(presetById(presets.historyEvents, placed.event), placed, index as FactId, honesty),
  );
  return {
    facts: outcomes.map((outcome) => outcome.fact),
    effects: joinEffects(outcomes.map((outcome) => outcome.effects)),
  };
}

function assembleAll(
  drafts: readonly CharacterDraft[],
  pairs: readonly DrawnPair[],
  effects: Effects,
): CharacterState[] {
  return drafts.map((draft, id) => assembleCharacter(id as CharacterId, draft, pairs, effects));
}

/** The drawn values of every character, by id; a locked one keeps its own (presets §10.1 step 1). */
function drawCharacters(drawer: Drawer, presets: Presets, input: CastInput): CharacterDraft[] {
  return input.characters.map((spec, id) => {
    const archetype = presetById(presets.characterArchetypes, spec.archetype);
    return spec.locked ?? drawCharacter(drawer, archetype, spec, id as CharacterId);
  });
}

/** The drafts of the chosen bonds, in the order of the input. */
function inputBondDrafts(pairs: readonly DrawnPair[]): BondDraft[] {
  return pairs
    .flatMap(({ plan, draft }) => (plan.input === null ? [] : [{ index: plan.input, draft }]))
    .sort((x, y) => x.index - y.index)
    .map((entry) => entry.draft);
}

/**
 * Generates a cast (presets §10.1): validates the input like `validateCast`,
 * then draws characters, bonds, the transitive family, the history and the
 * tension hook, in this order, in the `generation` stream of `seeds.castSeed`
 * for the input's attempt. The scene seed is not read.
 *
 * @returns the cast, the rng state after the draws and the draw records, or
 * every problem of the input (nothing is drawn then).
 * @example
 * const generated = generateCast(presets, input, { castSeed: 7, sceneSeed: 9 });
 * if (generated.ok) openScene(presets, generated.value.cast, opening, generated.value.rng);
 */
export function generateCast(
  presets: Presets,
  input: unknown,
  seeds: RngSeeds,
): Result<CastGeneration, readonly CastError[]> {
  const plan = planCast(presets, input);
  if (!plan.ok) {
    return plan;
  }
  const { input: data, pairs } = plan.value;
  const drawer = createDrawer(createRngState(seeds, data.attempt), {
    tick: 0,
    mode: "NORMAL",
    forced: [],
  });
  const drafts = drawCharacters(drawer, presets, data);
  const drawn = drawPairs(drawer, presets, pairs);
  const events = placedEvents(drawn);
  const before = historyOf(presets, events, drafts);
  const pair = hookPair(pairs, assembleAll(drafts, drawn, before.effects), before.facts);
  const hook =
    pair === null ? null : drawHook(drawer, pair, (id) => presetById(presets.historyEvents, id));
  const history = hook === null ? before : historyOf(presets, [...events, hook], drafts);
  const { rng, records } = drawer.finish();
  const cast: Cast = {
    identities: data.characters.map((_, id) => identityOf(data, id)),
    characters: assembleAll(drafts, drawn, history.effects),
    facts: history.facts,
    dayStates: data.characters.map((spec) => spec.dayState),
    drafts: { characters: drafts, bonds: inputBondDrafts(drawn) },
    hook,
  };
  return ok({ cast, rng, records });
}
