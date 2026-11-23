/**
 * Perception of the moment (simulation-model §5.5): what observer X reads of
 * each present Y. Signals and acts update it (SOC-02, SOC-03); without updates
 * it relaxes toward a preview made from the bond and from X's trust in others.
 * It does not last between slices.
 */
import { toBp, type BipolarBp, type Bp } from "../domain/bp.ts";
import {
  APPARENT_EMOTION_FLOOR,
  APPARENT_MARK_TTL_TICKS,
  PERCEPTION_RELAX,
} from "../domain/constants.ts";
import type { CharacterId } from "../domain/ids.ts";
import { div, relax } from "../domain/math.ts";
import type { EmotionId } from "../presets/emotions.ts";
import type { Bond } from "./bonds.ts";

/** The marks of the apparent state: tired, cold, hurt, altered (simulation-model §5.5 and §7). */
export type ApparentMarkId = "fatigue" | "cold" | "pain" | "intoxication";

/** A visible mark and the ticks since it was last confirmed. */
export interface ApparentMark {
  readonly mark: ApparentMarkId;
  readonly ticksUnconfirmed: number;
}

/** The emotion Y seems to feel, maybe wrongly (simulation-model §5.5). */
export interface ApparentEmotion {
  readonly emotion: EmotionId;
  readonly intensity: Bp;
}

/** The four values of a perception, all on `0..10000`. */
export interface PerceptionValues {
  /** How dangerous Y seems now. */
  readonly perceivedThreat: Bp;
  /** How hostile to X Y seems. */
  readonly perceivedHostility: Bp;
  /** How interested in X Y seems. */
  readonly perceivedInterest: Bp;
  /** How sincere Y seems. */
  readonly perceivedSincerity: Bp;
}

/** What X perceives of Y now (simulation-model §5.5). */
export interface Perception extends PerceptionValues {
  readonly target: CharacterId;
  /** `null` when no emotion is read. */
  readonly apparentEmotion: ApparentEmotion | null;
  /** Visible marks, in the order they were read. */
  readonly apparentState: readonly ApparentMark[];
}

/** The midpoint of sincerity before the bond and trust in others pull it. */
const NEUTRAL_SINCERITY = 5000;
/** Distress a visible mark adds (simulation-model §5.3, "aflição aparente"). */
const MARK_DISTRESS = 3000;
/** Apparent emotions that show distress (simulation-model §5.3). */
const DISTRESS_EMOTIONS: readonly EmotionId[] = ["fear", "sadness"];

/**
 * The values without signals (simulation-model §5.5), each clamped to
 * `0..10000`: threat `fearOf`; hostility
 * `resentment / 2 + max(0, −trustInOthers) / 4`; interest
 * `(affection + attraction) / 4`; sincerity
 * `5000 + (trust − resentment) / 2 + trustInOthers / 4`.
 *
 * @param trustInOthers the observer's effective trait.
 */
export function perceptionPreview(bond: Bond, trustInOthers: BipolarBp): PerceptionValues {
  const { axes } = bond;
  return {
    perceivedThreat: axes.fearOf,
    perceivedHostility: toBp(div(axes.resentment, 2) + div(Math.max(0, 0 - trustInOthers), 4)),
    perceivedInterest: toBp(div(axes.affection + axes.attraction, 4)),
    perceivedSincerity: toBp(
      NEUTRAL_SINCERITY + div(axes.trust - axes.resentment, 2) + div(trustInOthers, 4),
    ),
  };
}

/** A perception of `target` that no signal or act has touched: the preview, nothing apparent. */
export function freshPerception(target: CharacterId, preview: PerceptionValues): Perception {
  return { target, ...preview, apparentEmotion: null, apparentState: [] };
}

/** X's perception of `target`, or a fresh one from the preview when there is no record. */
export function perceptionToward(
  perceptions: readonly Perception[],
  target: CharacterId,
  preview: PerceptionValues,
): Perception {
  return (
    perceptions.find((perception) => perception.target === target) ??
    freshPerception(target, preview)
  );
}

function relaxedEmotion(apparent: ApparentEmotion | null): ApparentEmotion | null {
  if (apparent === null) {
    return null;
  }
  const intensity = relax(apparent.intensity, 0, PERCEPTION_RELAX);
  return intensity < APPARENT_EMOTION_FLOOR ? null : { ...apparent, intensity: toBp(intensity) };
}

function agedMarks(marks: readonly ApparentMark[]): ApparentMark[] {
  return marks
    .map((mark) => ({ ...mark, ticksUnconfirmed: mark.ticksUnconfirmed + 1 }))
    .filter((mark) => mark.ticksUnconfirmed < APPARENT_MARK_TTL_TICKS);
}

/**
 * A perception after a tick without updates from Y (simulation-model §5.5):
 * each value `relax(v, preview, 9800)`; the apparent emotion relaxes toward 0
 * the same way and fades below 1000; a mark fades after 60 ticks without
 * confirmation.
 */
export function relaxPerception(perception: Perception, preview: PerceptionValues): Perception {
  const toward = (key: keyof PerceptionValues): Bp =>
    toBp(relax(perception[key], preview[key], PERCEPTION_RELAX));
  return {
    target: perception.target,
    perceivedThreat: toward("perceivedThreat"),
    perceivedHostility: toward("perceivedHostility"),
    perceivedInterest: toward("perceivedInterest"),
    perceivedSincerity: toward("perceivedSincerity"),
    apparentEmotion: relaxedEmotion(perception.apparentEmotion),
    apparentState: agedMarks(perception.apparentState),
  };
}

/**
 * The apparent distress of Y for X (simulation-model §5.3): the intensity of
 * the apparent emotion when it is `fear` or `sadness` (else 0), plus 3000 with
 * any mark of the apparent state, limited to 10000.
 */
export function apparentDistress(perception: Perception): Bp {
  const { apparentEmotion, apparentState } = perception;
  const shown =
    apparentEmotion !== null && DISTRESS_EMOTIONS.includes(apparentEmotion.emotion)
      ? apparentEmotion.intensity
      : 0;
  return toBp(shown + (apparentState.length > 0 ? MARK_DISTRESS : 0));
}
