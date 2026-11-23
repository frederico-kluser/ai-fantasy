/**
 * Interpreting a noticed signal (simulation-model §7): the observer draws one
 * of the signal's possible causes, weighted by the true cause and the
 * observer's perceptiveness, by the context (cold, the small hours) and by the
 * observer's distrust and wariness of the emitter. The cause drawn may be
 * wrong: that is where misunderstandings come from.
 */
import type { ReaderView } from "../acts/tone.ts";
import type { BipolarBp } from "../domain/bp.ts";
import { DISCOMFORT } from "../domain/constants.ts";
import { BP_SCALE, div, mulBp } from "../domain/math.ts";
import type { SignalCauseId } from "../presets/signals.ts";
import type { DayPhase } from "../time/clock.ts";
import type { SignalRule } from "./rules.ts";

/** What the context says about the emitter and the hour. */
export interface InterpretationContext {
  /** The emitter's thermal target at its cell (simulation-model §3.2). */
  readonly thermalTarget: BipolarBp;
  readonly phase: DayPhase;
}

/** Every possible cause starts with this weight. */
const BASE_WEIGHT = 10000;
/** A context that explains a cause doubles its weight. */
const CONTEXT_FACTOR = 20000;
/** `cold` is explained by a thermal target at or below this. */
const COLD_TARGET = -2000;
/** `fatigue` is explained in these phases. */
const TIRED_PHASES: readonly DayPhase[] = ["DAWN", "LATE_NIGHT"];
/** The causes a distrustful observer reads more often. */
const THREATENING_CAUSES: readonly SignalCauseId[] = ["anger", "disgust", "jealousy", "lying"];
/** `trustInOthers / 2` comes off the factor of a threatening cause. */
const TRUST_DIVISOR = 2;
/** A `resentment` or `fearOf` toward the emitter at or above this makes the observer wary. */
const WARY_BOND = DISCOMFORT;
/** A wary observer weighs the threatening causes 1.5 times. */
const WARY_FACTOR = 15000;

/** The causes a context explains (simulation-model §7): `cold` in the cold, `fatigue` at dawn or late at night. */
const EXPLAINED_BY: Partial<Record<SignalCauseId, (context: InterpretationContext) => boolean>> = {
  cold: (context) => context.thermalTarget <= COLD_TARGET,
  fatigue: (context) => TIRED_PHASES.includes(context.phase),
};

/** Whether the context explains `cause`. */
function explainedByContext(cause: SignalCauseId, context: InterpretationContext): boolean {
  return EXPLAINED_BY[cause]?.(context) ?? false;
}

/** The weight of a threatening cause after the observer's distrust and wariness. */
function threatenedWeight(weight: number, reader: ReaderView): number {
  const distrusted = mulBp(weight, BP_SCALE - div(reader.trustInOthers, TRUST_DIVISOR));
  const wary = reader.bond.resentment >= WARY_BOND || reader.bond.fearOf >= WARY_BOND;
  return wary ? mulBp(distrusted, WARY_FACTOR) : distrusted;
}

/** The weight of one possible cause, applying the rows of the table in order. */
function causeWeight(
  cause: SignalCauseId,
  trueCause: SignalCauseId,
  reader: ReaderView,
  context: InterpretationContext,
): number {
  const base = BASE_WEIGHT + (cause === trueCause ? reader.perceptiveness : 0);
  const explained = explainedByContext(cause, context) ? mulBp(base, CONTEXT_FACTOR) : base;
  return THREATENING_CAUSES.includes(cause) ? threatenedWeight(explained, reader) : explained;
}

/**
 * The weights of the possible causes of `signal`, in the order of its list
 * (simulation-model §7), applying the rows of the table in order: base 10000;
 * `+ perceptiveness` for the true cause; `mulBp(w, 20000)` for `cold` when the
 * emitter's thermal target is ≤ −2000 and for `fatigue` at `DAWN` or
 * `LATE_NIGHT`; for `anger`, `disgust`, `jealousy` and `lying`,
 * `mulBp(w, 10000 − trustInOthers / 2)` and then `mulBp(w, 15000)` if the
 * observer's `resentment` or `fearOf` toward the emitter is ≥ 5000. Every
 * weight is at least 5000.
 *
 * @param reader the observer's perceptiveness, effective `trustInOthers` and bond toward the emitter.
 */
export function interpretationWeights(
  signal: SignalRule,
  trueCause: SignalCauseId,
  reader: ReaderView,
  context: InterpretationContext,
): number[] {
  return signal.causes.map((cause) => causeWeight(cause, trueCause, reader, context));
}
