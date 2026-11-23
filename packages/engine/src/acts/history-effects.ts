/**
 * The deferred effects of history events (presets §7): when only side A knows
 * a secret event, its effects on side B ("só se B sabe") wait until B gets a
 * copy of the fact, and then apply once. The character keeps a mark per fact
 * (`historyApplied`), so losing the copy and learning the fact again never
 * applies them twice. It runs after the copies of an act are recorded.
 */
import type { CharacterState } from "../character/state.ts";
import { refreshBaselines } from "../character/state.ts";
import { effectiveTrait } from "../character/traits.ts";
import { isDirected } from "../character/drives.ts";
import { toBipolarBp } from "../domain/bp.ts";
import type { FactId } from "../domain/ids.ts";
import type { Fact, HistoryFact } from "../memory/fact.ts";
import type { Presets } from "../presets/catalogs.ts";
import type { EmotionId } from "../presets/emotions.ts";
import { applyDeltas, type StateDelta } from "./deltas.ts";

/** The history events catalog: `presets.historyEvents`. */
export type HistoryRules = Presets["historyEvents"];

type Side = HistoryRules[number]["onB"];

function entriesOf<K extends string>(record: Readonly<Partial<Record<K, number>>>): [K, number][] {
  // A partial record of numbers: every present value is a number.
  return Object.entries(record) as [K, number][];
}

/** A history fact whose effects on side B were deferred, with that side. */
interface Deferred {
  readonly fact: HistoryFact;
  readonly side: Side;
}

/** The deferred effects on `character` of `fact`: it is side B of a secret only A knew, unmarked. */
function deferredFor(character: CharacterState, fact: Fact, events: HistoryRules): Deferred[] {
  if (fact.kind !== "HISTORY" || character.historyApplied.includes(fact.id)) {
    return [];
  }
  const event = events.find((entry) => entry.id === fact.event);
  const deferred = fact.subject === character.id && fact.secret && event?.knownBy === "A";
  return deferred ? [{ fact, side: event.onB }] : [];
}

/** The bond and drive deltas of side B toward A. */
function sideDeltas(character: CharacterState, fact: HistoryFact, side: Side): StateDelta[] {
  const who = character.id;
  const toward = fact.author;
  return [
    ...entriesOf(side.bond).map(([axis, delta]): StateDelta => ({
      kind: "BOND",
      who,
      toward,
      axis,
      delta,
    })),
    ...entriesOf(side.drives).map(([drive, delta]): StateDelta => ({
      kind: "DRIVE",
      who,
      drive,
      toward: isDirected(drive) ? toward : null,
      delta,
    })),
  ];
}

/** The character with the baseline shifts of side B added and its baselines recomputed. */
function shifted(character: CharacterState, side: Side): CharacterState {
  const honest = effectiveTrait(character.traits, character.tendencies, "honesty") > 0;
  const shifts: [EmotionId, number][] = [
    ...entriesOf(side.baselines),
    ...(honest ? entriesOf(side.baselinesIfHonest) : []),
  ];
  const baselineShifts = shifts.reduce(
    (all, [emotion, delta]) => ({ ...all, [emotion]: toBipolarBp(all[emotion] + delta) }),
    character.baselineShifts,
  );
  return refreshBaselines({ ...character, baselineShifts });
}

function applyEvent(character: CharacterState, { fact, side }: Deferred): CharacterState {
  const [moved] = applyDeltas([shifted(character, side)], sideDeltas(character, fact, side));
  const historyApplied = [...character.historyApplied, fact.id].sort((a, b) => a - b);
  // applyDeltas returns one character per character given.
  return { ...(moved as CharacterState), historyApplied };
}

/**
 * The characters after the copies of an act (presets §7): each character in
 * `after` that holds a copy it did not hold in `before`, of a secret history
 * event in which it is side B and only A knew, takes that event's effects on B
 * (bonds and directed drives toward A, other drives, baseline shifts, those
 * of `baselinesIfHonest` only with effective honesty above 0) and marks the
 * fact, once. Characters missing from `before` are left as they are.
 */
export function applyDeferredHistory(
  before: readonly CharacterState[],
  after: readonly CharacterState[],
  facts: readonly Fact[],
  events: HistoryRules,
): CharacterState[] {
  return after.map((character) => {
    const old = before.find((entry) => entry.id === character.id);
    const known = new Set<FactId>(old?.memories.map((copy) => copy.fact) ?? []);
    const learned = facts.filter(
      (fact) =>
        old !== undefined &&
        !known.has(fact.id) &&
        character.memories.some((copy) => copy.fact === fact.id),
    );
    return learned
      .sort((a, b) => a.id - b.id)
      .flatMap((fact) => deferredFor(character, fact, events))
      .reduce(applyEvent, character);
  });
}
