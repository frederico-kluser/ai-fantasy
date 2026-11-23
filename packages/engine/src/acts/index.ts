/**
 * Public part of the acts module (overview §3.1, dialogue-acts §1 to §4,
 * simulation-model §8 and §10): the types of an act label, shared with the AI
 * package (AI-01), and the rules that validate and resolve an act: cost, who
 * perceives it, tone reading, obligations and movement destinations.
 */
export type {
  ActLabel,
  ActTargets,
  Feeling,
  OutcomeBand,
  PlaceRef,
  Topic,
  TopicType,
} from "./label.ts";
export {
  actEntry,
  actTicks,
  toneEntry,
  type ActRule,
  type ActRules,
  type ToneRule,
} from "./rules.ts";
export {
  ACT_ERROR_CODES,
  describeActError,
  validateAct,
  type ActContext,
  type ActError,
  type ActErrorCode,
} from "./validate.ts";
export {
  perceiveAct,
  type ActPerspective,
  type Perceived,
  type PerspectiveInput,
} from "./perspectives.ts";
export {
  confusionWeights,
  distanceBands,
  misreadChance,
  readerView,
  readTone,
  type ConfusionWeights,
  type ReaderView,
  type ToneReading,
  type ToneReadingInput,
} from "./tone.ts";
export {
  answeredObligation,
  createObligations,
  expireObligations,
  isInterruption,
  settleObligations,
  type EndedObligation,
  type Obligation,
  type ObligationEnding,
  type ObligationSource,
  type ObligationUpdate,
} from "./obligations.ts";
export { movementOf, type MovementInput, type MovementOutcome } from "./movement.ts";
export {
  resolveAct,
  type ActResolution,
  type ListenerView,
  type OwnDraws,
  type ResolveInput,
  type ResolveScene,
  type SharedDrawer,
} from "./resolve.ts";
