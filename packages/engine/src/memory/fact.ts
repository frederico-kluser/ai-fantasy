/**
 * Facts of the record (simulation-model §12): every resolved act becomes a
 * fact, and the events of the generated history become facts before the first
 * slice. Creating facts from acts belongs to the acts rules (SOC-01, SOC-03);
 * this module only gives their shape. Facts hold ids and labels, never text, so
 * they live in the state and in the hash.
 */
import type { ActLabel, OutcomeBand } from "../acts/label.ts";
import { compareIds, type CharacterId, type FactId } from "../domain/ids.ts";
import type { HistoryEvent, HistoryEventId } from "../presets/history-events.ts";

/** What every fact has, whatever made it. */
interface FactBase {
  /** Sequential id: a higher id is a more recent fact (simulation-model §12). */
  readonly id: FactId;
  /**
   * Who did something wrong, sorted by increasing id (dialogue-acts §4): the
   * author of an act of valence ≤ −1 (by the real tone), or the side marked as
   * offender in a history event (both sides in `violent_fight`); empty if nobody.
   */
  readonly offenders: readonly CharacterId[];
  /** A secret for third parties: only who knows holds a copy (presets §7). */
  readonly secret: boolean;
}

/**
 * A fact made by an act (simulation-model §12): id, tick, author, the act label
 * (act, tone, topic, targets, volume and the lie mark `isFalse`), the outcome
 * band of a request, the offender and the secret mark.
 */
export interface ActFact extends FactBase {
  readonly kind: "ACT";
  /** The tick of the slice when the act was resolved. */
  readonly tick: number;
  readonly author: CharacterId;
  readonly label: ActLabel;
  /** The outcome band of a request once known (dialogue-acts §8.2); `null` otherwise. */
  readonly band: OutcomeBand | null;
}

/**
 * A fact of the generated history (presets §7), before the first slice: `author`
 * is the side "A" (who did it) and `subject` the side "B" (who suffered or
 * received it).
 */
export interface HistoryFact extends FactBase {
  readonly kind: "HISTORY";
  readonly event: HistoryEventId;
  readonly author: CharacterId;
  readonly subject: CharacterId;
}

/** A fact of the record. */
export type Fact = ActFact | HistoryFact;

/** Which sides of a history event are offenders (presets §7, "Ofensor" column). */
const OFFENDER_SIDES: Readonly<
  Record<HistoryEvent["offender"], (a: CharacterId, b: CharacterId) => CharacterId[]>
> = {
  NONE: () => [],
  A: (a) => [a],
  B: (_a, b) => [b],
  BOTH: (a, b) => [a, b],
};

/**
 * The offenders of a history event between `a` (who did it) and `b` (who
 * suffered it), sorted by increasing id (presets §7).
 *
 * @example
 * historyOffenders("BOTH", a, b); // [a, b] sorted by id: a violent fight
 */
export function historyOffenders(
  offender: HistoryEvent["offender"],
  a: CharacterId,
  b: CharacterId,
): CharacterId[] {
  return OFFENDER_SIDES[offender](a, b).sort(compareIds);
}
