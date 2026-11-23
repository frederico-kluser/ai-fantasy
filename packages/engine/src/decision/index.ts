/**
 * Public part of the decision module (overview §3.1, simulation-model §10,
 * dialogue-acts §9): the candidates of a character in `AUTO`, their utility,
 * the choice among the best, and the bands of the requests it owes. The scene
 * step (SOC-05) calls `owedBands`, `generateCandidates` and `chooseAct` when a
 * character in `AUTO` has the turn.
 */
export { owedBands, requestTurnInput, type OwedBandsInput } from "./bands.ts";
export {
  associationBias,
  BOND_BIASES,
  bondBias,
  EMOTION_BIASES,
  emotionBias,
  LIE_WEIGHT,
  npcIntensity,
  PERCEPTION_BIASES,
  perceptionBias,
  TRAIT_BIASES,
  traitBias,
  type BiasWeights,
} from "./biases.ts";
export { generateCandidates } from "./candidates.ts";
export { bestCandidates, chooseAct, choiceWeights, type Choice, type Scored } from "./choice.ts";
export {
  ACT_SATISFACTION,
  satisfaction,
  TONE_SATISFACTION,
  type SatisfactionCell,
  type SatisfactionContext,
  type SatisfactionLevel,
  type SatisfiedDrive,
} from "./satisfaction.ts";
export type { DecisionScene, OwedBand } from "./scene.ts";
export { salientTopics } from "./topics.ts";
export {
  deficitToward,
  pressure,
  repetitions,
  satisfactionContext,
  scoreCandidate,
  type Candidate,
} from "./utility.ts";
