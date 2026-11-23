/**
 * The vocabulary of the appraisal tables (dialogue-acts §7 and §8.3): an effect
 * term is one cell of a table ("`anger` +2", "`trust` −1", "`dignity` +3"), in
 * multiples of the unit; a row is a condition, a valence and its terms. The
 * tables themselves are data (`appraisal-table.ts`, `requests.ts`); the
 * pipeline that turns terms into deltas is `appraisal-effects.ts`.
 */
import type { BondAxes } from "../character/bonds.ts";
import type { Bp } from "../domain/bp.ts";
import type { ActId } from "../presets/acts.ts";
import type { BondAxisId } from "../presets/bonds.ts";
import type { DriveId } from "../presets/drives.ts";
import type { EmotionId } from "../presets/emotions.ts";
import type { RequestObjectId } from "../presets/request-objects.ts";
import type { ToneId } from "../presets/tones.ts";
import type { OutcomeBand } from "./label.ts";

/**
 * A drive of a table: a drive id, or the drive of the request object in who
 * receives it (`RECEIVER`) or in who gives it (`GIVER`; dialogue-acts §4), or
 * the drive of the request itself (`REQUESTED`; dialogue-acts §8.3).
 */
export type DriveRef = DriveId | "RECEIVER" | "GIVER" | "REQUESTED";

/**
 * One effect of a table row, `k` units (dialogue-acts §7.1): an emotion
 * (`k × u`), a bond axis toward the counterpart (`k × (u / 2)`, half units) or
 * a drive deficit (`k × u`; a directed drive is toward the counterpart). The
 * counterpart is the author of the act for whoever appraises it, and the one
 * who made the request for whoever answers it.
 */
export type EffectTerm =
  | {
      readonly kind: "EMOTION";
      readonly emotion: EmotionId;
      readonly k: number;
      /** The special factor of `THREATEN`: also `× (10000 + fearOf) / 10000`. */
      readonly byFearOf?: true;
    }
  | { readonly kind: "BOND"; readonly axis: BondAxisId; readonly k: number }
  | { readonly kind: "DRIVE"; readonly drive: DriveRef; readonly k: number };

/** The request an act answers (dialogue-acts §8): its act, the band and the object. */
export interface AnswerView {
  /** The act answered: `ASK`, `ACCUSE`, `REQUEST`, `OFFER`, `APOLOGIZE` or `THREATEN`. */
  readonly act: ActId;
  /** The outcome band of a request answered; `null` for a question or an accusation. */
  readonly band: OutcomeBand | null;
  /** The object of a `REQUEST` or `OFFER`; `null` otherwise. */
  readonly object: RequestObjectId | null;
}

/**
 * What the conditions of a row read, from the point of view of one who
 * appraises the act (the reader) about one who is addressed (the subject; the
 * same person for a target). "Afeto", "atração", `fearOf` and "sinceridade
 * percebida" are the reader's toward the author (dialogue-acts §7.1).
 */
export interface RowContext {
  /** The tone as the reader read it. */
  readonly tone: ToneId;
  /** The reader's bond toward the author. */
  readonly bond: BondAxes;
  /** How sincere the author seems to the reader (simulation-model §5.5). */
  readonly sincerity: Bp;
  /** Whether the topic interests the reader (see `topicInterests`). */
  readonly topicInterests: boolean;
  /** A `TELL` of a fact the reader had no copy of and now holds (dialogue-acts §7.1). */
  readonly newFact: boolean;
  /** A `TELL` whose topic is a `SECRET`. */
  readonly secret: boolean;
  /** The fact of the topic is bad for the subject (dialogue-acts §4). */
  readonly badFact: boolean;
  /** An `ACCUSE` whose fact has the subject as an offender (dialogue-acts §4). */
  readonly accusationTrue: boolean;
  /** The request, question or accusation this act answers, when the subject made it. */
  readonly answer: AnswerView | null;
}

/** One row of a table: when it applies, its valence and its effects. */
export interface AppraisalRow {
  readonly act: ActId;
  /** The condition of the row; absent, the row always applies to its act. */
  readonly when?: (context: RowContext) => boolean;
  readonly valence: number;
  readonly effects: readonly EffectTerm[];
}

/** `emotion` +k units. */
export function emotionTerm(emotion: EmotionId, k: number): EffectTerm {
  return { kind: "EMOTION", emotion, k };
}

/** `axis` toward the counterpart, +k half units. */
export function bondTerm(axis: BondAxisId, k: number): EffectTerm {
  return { kind: "BOND", axis, k };
}

/** The deficit of `drive`, +k units (negative: satisfies). */
export function driveTerm(drive: DriveRef, k: number): EffectTerm {
  return { kind: "DRIVE", drive, k };
}
