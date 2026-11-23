/**
 * Emission of signals (simulation-model §7): each cause strong enough may show
 * in each of its signals, less with self-control, drawn on the `signal` stream.
 * A signal shown by several causes in the same tick comes out once.
 */
import { toBp, type Bp } from "../domain/bp.ts";
import { DISCOMFORT } from "../domain/constants.ts";
import type { CharacterId } from "../domain/ids.ts";
import { BP_SCALE, clampInt, div, mulBp } from "../domain/math.ts";
import type { SignalCauseId, SignalId } from "../presets/signals.ts";
import type { Drawer } from "../rng/drawer.ts";
import type { SignalChannel, SignalRule, SignalRules } from "./rules.ts";

/** A cause emits only from this intensity on (simulation-model §7). */
export const EMISSION_THRESHOLD = DISCOMFORT;
/** The rise above the threshold counts twice. */
const EMISSION_SLOPE = 2;
/** `selfControl / 2` comes off the emission factor. */
const SELF_CONTROL_DIVISOR = 2;

/** A signal that came out this tick. */
export interface EmittedSignal {
  readonly emitter: CharacterId;
  readonly signal: SignalId;
  readonly channel: SignalChannel;
  /** The true cause: the strongest of the causes that emitted it (tie: the first of the signal's list). */
  readonly cause: SignalCauseId;
}

/** Who emits, how strong each cause is and the emitter's effective `selfControl`. */
export interface EmissionInput {
  readonly emitter: CharacterId;
  readonly intensities: Readonly<Record<SignalCauseId, number>>;
  readonly selfControl: number;
}

/**
 * The chance, in bp, that a cause of intensity `intensity` emits one of its
 * signals (simulation-model §7):
 * `clamp(mulBp(clamp((i − 5000) × 2, 0, 10000), 10000 − selfControl / 2), 0, 10000)`.
 *
 * @example
 * emissionChance(9000, 10000); // 4000: full self-control emits half
 */
export function emissionChance(intensity: number, selfControl: number): Bp {
  const rise = clampInt((intensity - EMISSION_THRESHOLD) * EMISSION_SLOPE, 0, BP_SCALE);
  return toBp(mulBp(rise, BP_SCALE - div(selfControl, SELF_CONTROL_DIVISOR)));
}

/** The causes of `signal` that emit it this tick, in the order of its list. */
function emittingCauses(drawer: Drawer, signal: SignalRule, input: EmissionInput): SignalCauseId[] {
  return signal.causes.filter((cause) => {
    const intensity = input.intensities[cause];
    return (
      intensity >= EMISSION_THRESHOLD &&
      drawer.drawChance(
        "signal",
        emissionChance(intensity, input.selfControl),
        "SIGNAL_EMIT",
        input.emitter,
      )
    );
  });
}

/** The strongest cause; on a tie, the first one. */
function strongest(causes: readonly SignalCauseId[], input: EmissionInput): SignalCauseId | null {
  return causes.reduce<SignalCauseId | null>(
    (best, cause) =>
      best === null || input.intensities[cause] > input.intensities[best] ? cause : best,
    null,
  );
}

/** A signal that came out and the preset it came from. */
export interface Emission {
  readonly emitted: EmittedSignal;
  readonly rule: SignalRule;
}

/**
 * The signals one character emits this tick (simulation-model §7), with their
 * presets. For each signal, in the order of the catalog, and each of its
 * causes with intensity ≥ 5000, in the order of the signal's list, one
 * `SIGNAL_EMIT` chance on the `signal` stream with the emitter as target. A
 * signal comes out once, with the strongest emitting cause as its true cause
 * (tie: the first of its list).
 *
 * @returns the signals that came out, in the order of the catalog.
 */
export function emissionsOf(
  drawer: Drawer,
  signals: SignalRules,
  input: EmissionInput,
): Emission[] {
  return signals.flatMap((rule) => {
    const cause = strongest(emittingCauses(drawer, rule, input), input);
    return cause === null
      ? []
      : [
          {
            emitted: { emitter: input.emitter, signal: rule.id, channel: rule.channel, cause },
            rule,
          },
        ];
  });
}

/** The signals one character emits this tick (see {@link emissionsOf}), without their presets. */
export function emitSignals(
  drawer: Drawer,
  signals: SignalRules,
  input: EmissionInput,
): EmittedSignal[] {
  return emissionsOf(drawer, signals, input).map((emission) => emission.emitted);
}
