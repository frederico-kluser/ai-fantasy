/**
 * Building candidate labels (simulation-model §10 item 2): the tones of an
 * act toward a target, ranked by bias, and the label with the values of
 * dialogue-acts §5, followed by its lie variant when the author lies.
 */
import type { ActLabel, ActTargets, Topic } from "../acts/label.ts";
import type { CharacterState } from "../character/state.ts";
import { toBp } from "../domain/bp.ts";
import { TONES_PER_ACT } from "../domain/constants.ts";
import type { ActId } from "../presets/acts.ts";
import type { RequestObjectId } from "../presets/request-objects.ts";
import { TONE_IDS, type ToneId } from "../presets/tones.ts";
import { emotionBias, npcIntensity, traitRows } from "./biases.ts";
import type { DecisionScene } from "./scene.ts";
import { targetBias, type Candidate } from "./utility.ts";
import { lieVariant, npcVolume } from "./values.ts";

/** Who a candidate is addressed to, and how loud it must be to reach. */
export interface TargetOption {
  readonly targets: ActTargets;
  /** The target only hears a shout. */
  readonly shouted: boolean;
  /** The single target, `null` for the `GROUP` or nobody. */
  readonly target: CharacterState | null;
  /** The target, or the listeners of the `GROUP` (empty for nobody). */
  readonly listeners: readonly CharacterState[];
}

/** The option of an act addressed to nobody (`targets = []`). */
export const NOBODY: TargetOption = { targets: [], shouted: false, target: null, listeners: [] };

/** The option of an act addressed to one present character. */
export function toOne(target: CharacterState, shouted: boolean): TargetOption {
  return { targets: [target.id], shouted, target, listeners: [target] };
}

/**
 * The bias of a tone for an act and its targets (simulation-model §10,
 * "Detalhes da decisão"): the bias of the candidate without the associations.
 */
export function toneBias(
  scene: DecisionScene,
  act: ActId,
  tone: ToneId,
  option: TargetOption,
): number {
  const { author } = scene;
  const label = { act, tone, targets: option.targets } as const;
  return (
    emotionBias(author.emotions, act, tone) +
    traitRows(author, act, tone) +
    targetBias(scene, label)
  );
}

/**
 * The `count` tones of highest bias among `tones` (simulation-model §10: 3 per
 * act and target), ties in the order of the catalog.
 */
export function rankTones(
  scene: DecisionScene,
  act: ActId,
  option: TargetOption,
  count: number = TONES_PER_ACT,
  tones: readonly ToneId[] = TONE_IDS,
): ToneId[] {
  const biases = new Map(tones.map((tone) => [tone, toneBias(scene, act, tone, option)]));
  const ordered = TONE_IDS.filter((tone) => biases.has(tone));
  return ordered.sort((a, b) => (biases.get(b) ?? 0) - (biases.get(a) ?? 0)).slice(0, count);
}

/** What makes one label besides the act and its target option. */
export interface LabelParts {
  readonly tone: ToneId;
  readonly topic: Topic;
  readonly object?: RequestObjectId | undefined;
  /** A fixed intensity (a fixed reply), or `null` for the intensity of dialogue-acts §5. */
  readonly intensity?: number | null;
  readonly isFalse?: boolean;
}

/** The label of a NPC candidate, with the values of dialogue-acts §5. */
export function makeLabel(
  scene: DecisionScene,
  act: ActId,
  option: TargetOption,
  parts: LabelParts,
): ActLabel {
  const { tone, topic } = parts;
  const intensity = parts.intensity ?? npcIntensity(scene.author.emotions, act, tone);
  const label: ActLabel = {
    act,
    tone,
    targets: option.targets,
    topic,
    intensity: toBp(intensity),
    volume: npcVolume(scene, { act, tone, topic }, option.shouted),
    isFalse: parts.isFalse ?? false,
  };
  return parts.object === undefined ? label : { ...label, object: parts.object };
}

/** A label and, when the author lies, its lie variant, as candidates. */
export function withLie(scene: DecisionScene, label: ActLabel, answers = false): Candidate[] {
  const lie = lieVariant(scene, label);
  return [label, ...(lie === null ? [] : [lie])].map((each) => ({ label: each, answers }));
}
