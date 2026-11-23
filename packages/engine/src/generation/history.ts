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

/** One change a history fact makes to a character (`holder`). */
export type Effect =
  | {
      readonly kind: "BOND";
      readonly holder: CharacterId;
      readonly target: CharacterId;
      readonly axis: BondAxisId;
      readonly delta: number;
    }
  | {
      readonly kind: "DRIVE";
      readonly holder: CharacterId;
      readonly target: CharacterId;
      readonly drive: DriveId;
      readonly delta: number;
    }
  | {
      readonly kind: "SHIFT";
      readonly holder: CharacterId;
      readonly emotion: EmotionId;
      readonly delta: number;
    }
  | { readonly kind: "COPY"; readonly holder: CharacterId; readonly copy: FactCopy };

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
): Effect[] {
  const bond = entriesOf(side.bond);
  const shifts = shiftsOf(side, honesty);
  const importance = factImportance({
    emotionDeltas: shifts.map(([, delta]) => delta),
    bondDeltas: bond.map(([, delta]) => delta),
    involved: true,
  });
  return [
    ...bond.map(([axis, delta]): Effect => ({ kind: "BOND", holder, target: other, axis, delta })),
    ...entriesOf(side.drives).map(([drive, delta]): Effect => ({
      kind: "DRIVE",
      holder,
      target: other,
      drive,
      delta,
    })),
    ...shifts.map(([emotion, delta]): Effect => ({ kind: "SHIFT", holder, emotion, delta })),
    { kind: "COPY", holder, copy: historyCopy(fact, importance) },
  ];
}

/** A history event as a fact and its effects. */
export interface EventOutcome {
  readonly fact: HistoryFact;
  readonly effects: readonly Effect[];
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
  const onB = subjectKnows ? sideEffects(preset.onB, subject, author, id, honesty(subject)) : [];
  return { fact, effects: [...onA, ...onB] };
}
