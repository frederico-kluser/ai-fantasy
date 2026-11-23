/**
 * Public API of the pure part of `@ai-fantasy/ai`: ports, prompts, validation and
 * canned lines, with no network (overview §4). The OpenRouter adapters live in
 * `@ai-fantasy/ai/openrouter` and only the server may import them.
 *
 * This file only re-exports; code lives in the modules next to it.
 */
export { AI_ROLES, type AiRole } from "./roles.ts";
export type {
  AiFailure,
  AiFailureKind,
  CallUsage,
  DecisionReply,
  RenderReply,
  RenderRequest,
  SystemOnePort,
  TextModelPort,
} from "./ports.ts";
export {
  checkDecisionCall,
  decisionCallSchema,
  MAX_CHOICE_OPTIONS,
  MAX_QUESTIONS_PER_CALL,
  QUESTION_ID_PATTERN,
  SCORE_LEVELS,
  splitIntoCalls,
  type CallError,
  type DecisionCall,
  type JsonValue,
  type Question,
  type QuestionEntry,
} from "./prompts/questions.ts";
export {
  buildPlayerLineCall,
  MAX_KNOWN_FACTS,
  PLAYER_LINE_QUESTION_IDS,
  type Person,
  type PlayerLineInput,
  type PlayerLineQuestionId,
  type SalientEntity,
} from "./prompts/player-line.ts";
export {
  AGE_BANDS,
  BOND_PAIRS_PER_CALL,
  buildBondCalls,
  buildCharacterCalls,
  buildSceneCall,
  CHARACTERS_PER_CALL,
  SPEECH_REGISTERS,
  type PremiseInput,
} from "./prompts/premise.ts";
export { PROMPT_VERSION } from "./prompts/version.ts";
export {
  NOUL_YES_BP,
  probabilityToBp,
  scoreToIntensity,
  noulIsYes,
  SCORE_MAX,
  SCORE_MIN,
} from "./convert.ts";
export {
  DISTRIBUTION_TOLERANCE_BP,
  validateAnswers,
  type AnswerError,
  type AnswerErrorCode,
  type ReadAnswer,
  type ReadAnswers,
} from "./answers.ts";
export {
  CONFIRMATION_THRESHOLD_BP,
  readPlayerAnswers,
  type PlayerReading,
  type ReadingGap,
} from "./reading.ts";
export { readPlayerLine, type PlayerLineFailure, type PlayerLineResult } from "./system-one.ts";
export {
  CAPITALIZED_EXCEPTIONS,
  MAX_FALA_LENGTH,
  MAX_GESTO_LENGTH,
  validateLine,
  type LineError,
  type LineErrorCode,
  type RenderedLine,
} from "./line.ts";
export { fallbackLine, TARGET_PLACEHOLDER } from "./fallback.ts";
export {
  createFakeSystemOne,
  createFakeTextModel,
  FAKE_USAGE,
  type FakeSystemOne,
  type FakeSystemOneOptions,
  type FakeTextModel,
  type FakeTextModelOptions,
} from "./fakes.ts";
