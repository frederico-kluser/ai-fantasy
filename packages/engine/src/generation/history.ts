/**
 * History events as facts before the first slice (presets §7, simulation-model
 * §12): each event becomes a fact, and what it does to each side becomes a list
 * of effects (bond deltas, drive deltas, baseline shifts and the copy of who
 * knows it). When only A knows, B gets nothing now: the engine applies B's
 * effects when B first gets a copy (presets §10.1).
 */
import type { CharacterId, FactId } from "../domain/ids.ts";
import { historyCopy, factImportance, type FactCopy } from "../memory/copy.ts";
import { historyOffenders, type HistoryFact } from "../memory/fact.ts";
import type { BondAxisId } from "../presets/bonds.ts";
import type { DriveId } from "../presets/drives.ts";
import type { EmotionId } from "../presets/emotions.ts";
import type { HistoryEvent, HistoryEventId } from "../presets/history-events.ts";

/** An event between two characters, with its secret mark settled. */
export interface PlacedEvent {
  readonly event: HistoryEventId;
  /** Side A: who did it. */
  readonly author: CharacterId;
  /** Side B: who suffered or received it. */
  readonly subject: CharacterId;
  readonly secret: boolean;
}

/** A delta on a bond axis of `holder` toward `target`. */
export interface BondEffect {
  readonly holder: CharacterId;
  readonly target: CharacterId;
  readonly axis: BondAxisId;
  readonly delta: number;
}

/** A delta on a drive deficit of `holder` (aimed at `target` when the drive is directed). */
export interface DriveEffect {
  readonly holder: CharacterId;
  readonly target: CharacterId;
  readonly drive: DriveId;
  readonly delta: number;
}

/** A shift of a baseline of `holder`. */
export interface ShiftEffect {
  readonly holder: CharacterId;
  readonly emotion: EmotionId;
  readonly delta: number;
}

/** The copy of a fact `holder` keeps. */
export interface CopyEffect {
  readonly holder: CharacterId;
  readonly copy: FactCopy;
}

/** What the history facts do to the characters, by kind. */
export interface Effects {
  readonly bonds: readonly BondEffect[];
  readonly drives: readonly DriveEffect[];
  readonly shifts: readonly ShiftEffect[];
  readonly copies: readonly CopyEffect[];
}

/** All the effects of `list`, in order. */
export function joinEffects(list: readonly Effects[]): Effects {
  return {
    bonds: list.flatMap((effects) => effects.bonds),
    drives: list.flatMap((effects) => effects.drives),
    shifts: list.flatMap((effects) => effects.shifts),
    copies: list.flatMap((effects) => effects.copies),
  };
}

type Side = HistoryEvent["onA"];

function entriesOf<K extends string>(record: Readonly<Partial<Record<K, number>>>): [K, number][] {
  // A partial record of numbers: every present value is a number.
  return Object.entries(record) as [K, number][];
}

/** The baseline shifts of a side: always, plus those that need `honesty` above 0. */
function shiftsOf(side: Side, honesty: number): [EmotionId, number][] {
  const ifHonest = honesty > 0 ? entriesOf(side.baselinesIfHonest) : [];
  return [...entriesOf(side.baselines), ...ifHonest];
}

/** What one side of an event does to `holder`, who knows it, toward `other`. */
function sideEffects(
  side: Side,
  holder: CharacterId,
  other: CharacterId,
  fact: FactId,
  honesty: number,
): Effects {
  const bond = entriesOf(side.bond);
  const shifts = shiftsOf(side, honesty);
  const importance = factImportance({
    emotionDeltas: shifts.map(([, delta]) => delta),
    bondDeltas: bond.map(([, delta]) => delta),
    involved: true,
  });
  return {
    bonds: bond.map(([axis, delta]) => ({ holder, target: other, axis, delta })),
    drives: entriesOf(side.drives).map(([drive, delta]) => ({
      holder,
      target: other,
      drive,
      delta,
    })),
    shifts: shifts.map(([emotion, delta]) => ({ holder, emotion, delta })),
    copies: [{ holder, copy: historyCopy(fact, importance) }],
  };
}

/** A history event as a fact and its effects. */
export interface EventOutcome {
  readonly fact: HistoryFact;
  readonly effects: Effects;
}

/**
 * The fact of an event and its effects (presets §7): side A always knows; side
 * B knows unless the event is a secret only A knows. Who knows gets a `DIRECT`
 * copy with fidelity 8000.
 *
 * @param honesty the `honesty` trait of a character, for the shifts that need it.
 */
export function eventOutcome(
  preset: HistoryEvent,
  placed: PlacedEvent,
  id: FactId,
  honesty: (character: CharacterId) => number,
): EventOutcome {
  const { author, subject, secret, event } = placed;
  const offenders = historyOffenders(preset.offender, author, subject);
  const fact: HistoryFact = { id, kind: "HISTORY", event, author, subject, offenders, secret };
  const subjectKnows = !(secret && preset.knownBy === "A");
  const onA = sideEffects(preset.onA, author, subject, id, honesty(author));
  const onB = subjectKnows ? [sideEffects(preset.onB, subject, author, id, honesty(subject))] : [];
  return { fact, effects: joinEffects([onA, ...onB]) };
}
