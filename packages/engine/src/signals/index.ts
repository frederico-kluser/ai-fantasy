/**
 * Public part of the signals module (overview §3.1, simulation-model §7): the
 * signals of one tick (§16 step 6.5) with their events, and the formulas the
 * inspector shows: cause intensities, emission and notice chances,
 * interpretation weights and the effects on the perception of the moment.
 */
export {
  causeIntensities,
  LYING_INTENSITY,
  type CauseInput,
  type CauseIntensities,
} from "./causes.ts";
export { emissionChance, type EmittedSignal } from "./emission.ts";
export { noticeChance, type NoticeView } from "./notice.ts";
export { interpretationWeights, type InterpretationContext } from "./interpret.ts";
export { applyInterpretation, PERCEPTION_EFFECTS } from "./effects.ts";
export type { SignalPerceived } from "./perceive.ts";
export type { SignalChannel, SignalRule, SignalRules } from "./rules.ts";
export { signalsTick, type SignalTickInput, type SignalTickResult } from "./tick.ts";
