/**
 * Public part of the character module (overview §3.1, simulation-model §4 and
 * §5): the character state and identity, the status layers (body, emotions,
 * drives, bonds, perception of the moment, traits) with their rules, Maslow's
 * precedence and the per-tick status update of everyone present.
 */
export {
  bodyTick,
  greatestNeed,
  NEED_RATES,
  needBand,
  type Body,
  type BodyTickInput,
  type NeedBand,
  type UnipolarNeedId,
} from "./body.ts";
export { bondToward, NO_BOND_AXES, type Bond, type BondAxes } from "./bonds.ts";
export {
  decayEmotions,
  emotionBaselines,
  emotionGains,
  emotionsTick,
  isAroused,
  type BoredomSource,
  type EmotionDeltas,
  type EmotionTickInput,
  type Emotions,
} from "./emotions.ts";
export {
  DIRECTED_DRIVE_IDS,
  directedDeficit,
  directedTarget,
  dominantDrives,
  DRIVE_LEVELS,
  highestDeficit,
  isDirected,
  withDirectedDeficit,
  type DirectedDeficit,
  type DirectedDriveId,
  type Drives,
  type MaslowLevel,
  type UndirectedDriveId,
} from "./drives.ts";
export { drivesTick, type DriveTickInput, type TowardValue } from "./drive-tick.ts";
export { effectiveWeight, maxLowerDeficit, pressureOf, suppression } from "./maslow.ts";
export {
  apparentDistress,
  freshPerception,
  perceptionPreview,
  perceptionToward,
  relaxPerception,
  type ApparentEmotion,
  type ApparentMark,
  type ApparentMarkId,
  type Perception,
  type PerceptionValues,
} from "./perception.ts";
export {
  tagValences,
  type AgeBand,
  type Association,
  type AssociationSubject,
  type CharacterIdentity,
  type CharacterState,
  type SpeechRegister,
} from "./state.ts";
export { effectiveTrait, type Aptitudes, type Traits } from "./traits.ts";
export { statusTick, type StatusTickInput, type TickPace } from "./tick.ts";
