/**
 * What an interpreted signal does to the observer's perception of the emitter
 * (simulation-model §7, last table): the interpreted cause, right or wrong,
 * moves the perceived values, becomes the apparent emotion when it is an
 * emotion, and marks the apparent state when it is the cold or a body need.
 */
import type {
  ApparentMark,
  ApparentMarkId,
  Perception,
  PerceptionValues,
} from "../character/perception.ts";
import { toBp } from "../domain/bp.ts";
import { APPARENT_EMOTION_INTENSITY } from "../domain/constants.ts";
import { EMOTION_IDS, type EmotionId } from "../presets/emotions.ts";
import type { SignalCauseId } from "../presets/signals.ts";

/** The change of each perceived value by interpreted cause (simulation-model §7). */
export const PERCEPTION_EFFECTS: Readonly<
  Partial<Record<SignalCauseId, Readonly<Partial<Record<keyof PerceptionValues, number>>>>>
> = {
  anger: { perceivedHostility: 1500, perceivedThreat: 1000 },
  disgust: { perceivedHostility: 1000 },
  jealousy: { perceivedHostility: 500 },
  lying: { perceivedSincerity: -1500 },
  attraction: { perceivedInterest: 1500 },
  joy: { perceivedInterest: 500 },
  boredom: { perceivedInterest: -1000 },
};

/** The causes that mark the apparent state, each with the mark of the same id (simulation-model §5.5). */
const MARK_CAUSES: readonly ApparentMarkId[] = ["cold", "fatigue", "pain", "intoxication"];

function isEmotion(cause: SignalCauseId): cause is SignalCauseId & EmotionId {
  return (EMOTION_IDS as readonly string[]).includes(cause);
}

function isMark(cause: SignalCauseId): cause is SignalCauseId & ApparentMarkId {
  return (MARK_CAUSES as readonly string[]).includes(cause);
}

function shifted(perception: Perception, cause: SignalCauseId): PerceptionValues {
  const effect = PERCEPTION_EFFECTS[cause] ?? {};
  const value = (key: keyof PerceptionValues) => toBp(perception[key] + (effect[key] ?? 0));
  return {
    perceivedThreat: value("perceivedThreat"),
    perceivedHostility: value("perceivedHostility"),
    perceivedInterest: value("perceivedInterest"),
    perceivedSincerity: value("perceivedSincerity"),
  };
}

/** The marks with `mark` confirmed: kept in place with 0 ticks, or added at the end. */
function confirmed(marks: readonly ApparentMark[], mark: ApparentMarkId): ApparentMark[] {
  const fresh: ApparentMark = { mark, ticksUnconfirmed: 0 };
  const known = marks.some((entry) => entry.mark === mark);
  return known ? marks.map((entry) => (entry.mark === mark ? fresh : entry)) : [...marks, fresh];
}

/**
 * The perception of the emitter after the observer interprets one of its
 * signals as `cause` (simulation-model §7): each value moves by the table
 * {@link PERCEPTION_EFFECTS} and is limited to `0..10000`; an emotion becomes the
 * apparent emotion at 6000, replacing the one before; `cold`, `fatigue`, `pain`
 * and `intoxication` confirm their mark (a known mark goes back to 0 ticks in
 * place; a new one enters at the end).
 */
export function applyInterpretation(perception: Perception, cause: SignalCauseId): Perception {
  return {
    ...perception,
    ...shifted(perception, cause),
    apparentEmotion: isEmotion(cause)
      ? { emotion: cause, intensity: toBp(APPARENT_EMOTION_INTENSITY) }
      : perception.apparentEmotion,
    apparentState: isMark(cause)
      ? confirmed(perception.apparentState, cause)
      : perception.apparentState,
  };
}
