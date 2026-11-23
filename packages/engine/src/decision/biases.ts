/**
 * The biases of the decision (dialogue-acts §9.3), as data: each row adds
 * `mulBp(source, act weight + tone weight)`. The sources are the author's
 * emotions, its effective traits (bipolar: a negative trait turns the bias
 * around), its bond with the target and its perception of the target; and the
 * associations of the topic. Absent weights are 0.
 */
import type { BondAxes } from "../character/bonds.ts";
import type { Emotions } from "../character/emotions.ts";
import type { PerceptionValues } from "../character/perception.ts";
import type { CharacterState } from "../character/state.ts";
import { effectiveTrait } from "../character/traits.ts";
import type { CharacterId } from "../domain/ids.ts";
import { mulBp } from "../domain/math.ts";
import type { Topic } from "../acts/label.ts";
import type { ActId } from "../presets/acts.ts";
import { BOND_AXIS_IDS, type BondAxisId } from "../presets/bonds.ts";
import { EMOTION_IDS, type EmotionId } from "../presets/emotions.ts";
import type { ToneId } from "../presets/tones.ts";
import { TRAIT_IDS, type TraitId } from "../presets/traits.ts";
import { canonicalize } from "../session/canonical.ts";

/** The weights of one row: by act and by tone. */
export interface BiasWeights {
  readonly acts: Readonly<Partial<Record<ActId, number>>>;
  readonly tones: Readonly<Partial<Record<ToneId, number>>>;
}

const row = (
  acts: BiasWeights["acts"],
  tones: BiasWeights["tones"] = {},
): BiasWeights => ({ acts, tones });

/** dialogue-acts §9.3, "Emoções do autor". */
export const EMOTION_BIASES: Readonly<Partial<Record<EmotionId, BiasWeights>>> = {
  joy: row(
    { CHAT: 1500, PRAISE: 1500, GREET: 1000, TEASE: 1000 },
    { WARM: 1500, PLAYFUL: 1500, AGGRESSIVE: -1500 },
  ),
  sadness: row({ STAY_SILENT: 1500, TELL: 1000, WITHDRAW: 1000 }, { PLAYFUL: -1500 }),
  fear: row(
    { WITHDRAW: 3000, STAY_SILENT: 1500, APOLOGIZE: 1000, THREATEN: -3000, ACCUSE: -2000 },
    { AGGRESSIVE: -2000 },
  ),
  anger: row(
    { ACCUSE: 3000, THREATEN: 2000, TEASE: 1000, PRAISE: -2000, APOLOGIZE: -2000 },
    { AGGRESSIVE: 2000, IRONIC: 1000, WARM: -1500 },
  ),
  disgust: row({ WITHDRAW: 2000, TOUCH: -3000 }, { IRONIC: 1000 }),
  surprise: row({ ASK: 2000 }),
  shame: row({ STAY_SILENT: 2000, WITHDRAW: 2000, APOLOGIZE: 1000 }),
  guilt: row({ APOLOGIZE: 3000, OFFER: 1500, ACCUSE: -2000 }, { WARM: 1000 }),
  jealousy: row({ ACCUSE: 2000, TEASE: 1000 }, { IRONIC: 1500 }),
  boredom: row({ TEASE: 1500, CHAT: 1000, STAY_SILENT: -1000 }, { PLAYFUL: 1000 }),
};

/** dialogue-acts §9.3, "Traços efetivos do autor" (the lie weight of `honesty` is {@link LIE_WEIGHT}). */
export const TRAIT_BIASES: Readonly<Partial<Record<TraitId, BiasWeights>>> = {
  humor: row({ TEASE: 1000 }, { PLAYFUL: 2000 }),
  romanticBoldness: row({}, { SEDUCTIVE: 2500 }),
  temper: row({ ACCUSE: 1000, THREATEN: 1000 }, { AGGRESSIVE: 2000 }),
  empathy: row({ OFFER: 1000, PRAISE: 500 }, { WARM: 1500, AGGRESSIVE: -1500 }),
  sociability: row({ CHAT: 1000, GREET: 1000, STAY_SILENT: -1500 }),
  courage: row({ THREATEN: 1000, ACCUSE: 1000, WITHDRAW: -1500 }),
  pride: row({ REFUSE: 1000, APOLOGIZE: -2000 }),
  selfControl: row({}, { AGGRESSIVE: -1000 }),
  trustInOthers: row({ TELL: 500, ASK: 500 }, { IRONIC: -500 }),
  honesty: row({}),
};

/** dialogue-acts §9.3: the weight of `honesty` in a lie variant. */
export const LIE_WEIGHT = -3000;

/** dialogue-acts §9.3, "Laço do autor com o alvo". */
export const BOND_BIASES: Readonly<Partial<Record<BondAxisId, BiasWeights>>> = {
  affection: row(
    { PRAISE: 1000, OFFER: 1000, TOUCH: 500, THREATEN: -2000, ACCUSE: -1000 },
    { WARM: 2000, AGGRESSIVE: -2000 },
  ),
  trust: row({ TELL: 1000, ASK: 500, REQUEST: 1000 }),
  respect: row({ ACCUSE: -1000, TEASE: -500 }, { IRONIC: -1000 }),
  attraction: row({ APPROACH: 1000, PRAISE: 1000, TOUCH: 500 }, { SEDUCTIVE: 2500 }),
  fearOf: row({ WITHDRAW: 2000, ACCUSE: -2000, THREATEN: -2000 }, { AGGRESSIVE: -2500 }),
  resentment: row(
    { ACCUSE: 1500, PRAISE: -1500 },
    { IRONIC: 1500, AGGRESSIVE: 1500, WARM: -1500 },
  ),
  dependence: row({ REQUEST: 1500, REFUSE: -1000 }),
  closeness: row({ CHAT: 500, TELL: 500, TOUCH: 1000 }),
};

/** dialogue-acts §9.3, "Percepção do autor sobre o alvo". */
export const PERCEPTION_BIASES: Readonly<Record<keyof PerceptionValues, BiasWeights>> = {
  perceivedHostility: row(
    { WITHDRAW: 1500, ACCUSE: 1000 },
    { AGGRESSIVE: 1000, IRONIC: 1000, WARM: -1000 },
  ),
  perceivedInterest: row({ CHAT: 1000, PRAISE: 500 }, { SEDUCTIVE: 1500, WARM: 1000 }),
  perceivedThreat: row({ WITHDRAW: 2000, APOLOGIZE: 500 }, { AGGRESSIVE: -1500 }),
  perceivedSincerity: row({ TELL: 500, REQUEST: 500 }),
};

const PERCEPTION_KEYS = [
  "perceivedHostility",
  "perceivedInterest",
  "perceivedThreat",
  "perceivedSincerity",
] as const;

/** dialogue-acts §9.3, "Associações": the acts that feel them and the factor. */
const ASSOCIATION_ACTS: readonly ActId[] = ["CHAT", "TELL", "ASK"];
const ASSOCIATION_FACTOR = 2000;

/** The intensity of a NPC act with no emotion behind it, and the share the strongest emotion adds (dialogue-acts §5). */
const INTENSITY_BASE = 3000;
const INTENSITY_SPAN = 7000;

/** `act weight + tone weight` of a row (absent weights are 0). */
export function rowWeight(weights: BiasWeights | undefined, act: ActId, tone: ToneId): number {
  return (weights?.acts[act] ?? 0) + (weights?.tones[tone] ?? 0);
}

/** Each emotion's part of the bias, in catalog order: `mulBp(emotion, weight)`. */
export function emotionParts(emotions: Emotions, act: ActId, tone: ToneId): number[] {
  return EMOTION_IDS.map((id) => mulBp(emotions[id], rowWeight(EMOTION_BIASES[id], act, tone)));
}

/** The bias of the author's emotions (dialogue-acts §9.3). */
export function emotionBias(emotions: Emotions, act: ActId, tone: ToneId): number {
  return emotionParts(emotions, act, tone).reduce((sum, part) => sum + part, 0);
}

/**
 * The bias of the author's effective traits (dialogue-acts §9.3), with the
 * `honesty` weight of a lie variant when `isFalse`.
 */
export function traitBias(author: CharacterState, act: ActId, tone: ToneId, isFalse: boolean): number {
  const trait = (id: TraitId) => effectiveTrait(author.traits, author.tendencies, id);
  const rows = TRAIT_IDS.reduce(
    (sum, id) => sum + mulBp(trait(id), rowWeight(TRAIT_BIASES[id], act, tone)),
    0,
  );
  return rows + (isFalse ? mulBp(trait("honesty"), LIE_WEIGHT) : 0);
}

/** The bias of the author's bond with one target (dialogue-acts §9.3). */
export function bondBias(axes: BondAxes, act: ActId, tone: ToneId): number {
  return BOND_AXIS_IDS.reduce(
    (sum, id) => sum + mulBp(axes[id], rowWeight(BOND_BIASES[id], act, tone)),
    0,
  );
}

/** The bias of the author's perception of one target (dialogue-acts §9.3). */
export function perceptionBias(values: PerceptionValues, act: ActId, tone: ToneId): number {
  return PERCEPTION_KEYS.reduce(
    (sum, key) => sum + mulBp(values[key], rowWeight(PERCEPTION_BIASES[key], act, tone)),
    0,
  );
}

/** The association subject a topic refers to: a thing, a tag or a person. */
function subjectOf(topic: Topic): unknown {
  if (topic.type === "THING") {
    return { kind: "THING", thing: topic.thing };
  }
  if (topic.type === "PLACE") {
    return { kind: "TAG", tag: topic.place };
  }
  return topic.type === "PERSON" ? { kind: "PERSON", person: topic.person } : null;
}

/**
 * The bias of the associations of the topic (dialogue-acts §9.3): a topic about
 * a thing, a tag or an absent person with an association of valence `a` adds
 * `mulBp(a, 2000)` to `CHAT`, `TELL` and `ASK`. A present person adds nothing.
 */
export function associationBias(
  author: CharacterState,
  act: ActId,
  topic: Topic,
  present: readonly CharacterId[],
): number {
  const subject = subjectOf(topic);
  const absent = topic.type !== "PERSON" || !present.includes(topic.person);
  if (subject === null || !absent || !ASSOCIATION_ACTS.includes(act)) {
    return 0;
  }
  const wanted = canonicalize(subject);
  const match = author.associations.find((entry) => canonicalize(entry.subject) === wanted);
  return mulBp(match?.valence ?? 0, ASSOCIATION_FACTOR);
}

/**
 * The intensity of a NPC act (dialogue-acts §5): `3000 + mulBp(e, 7000)`, where
 * `e` is the intensity of the emotion whose part of the bias is the largest
 * positive one (ties: catalog order), 0 when no part is positive.
 */
export function npcIntensity(emotions: Emotions, act: ActId, tone: ToneId): number {
  const parts = emotionParts(emotions, act, tone);
  const best = parts.reduce((top, part, index) => (part > (parts[top] ?? 0) ? index : top), -1);
  const strongest = EMOTION_IDS[best];
  return INTENSITY_BASE + mulBp(strongest === undefined ? 0 : emotions[strongest], INTENSITY_SPAN);
}
