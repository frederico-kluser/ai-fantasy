/**
 * The answers of requests, questions and accusations (dialogue-acts §8.3), as
 * data: {@link REQUESTER_ROWS}, the rows of `ACCEPT` and `REFUSE` in the
 * appraisal table for the one who asked, and {@link responderTerms}, the
 * effects in the one who answers; and the drives a request touches
 * ({@link requestDrives}, dialogue-acts §4).
 */
import type { Presets } from "../presets/catalogs.ts";
import type { ActId } from "../presets/acts.ts";
import type { DriveId } from "../presets/drives.ts";
import type { RequestObjectId } from "../presets/request-objects.ts";
import type { RequestDrives } from "./appraisal-effects.ts";
import {
  bondTerm as bond,
  driveTerm as drive,
  emotionTerm as emotion,
  REQUEST_DRIVE_REFS,
  type AnswerView,
  type AppraisalRow,
  type DriveRef,
  type EffectTerm,
  type RequestDriveRef,
  type RowContext,
} from "./effect-terms.ts";
import type { OutcomeBand } from "./label.ts";

/** The request objects catalog: `presets.requestObjects`. */
export type RequestObjectRules = Presets["requestObjects"];

/** The four requests (dialogue-acts §8.1). */
export type RequestActId = "REQUEST" | "OFFER" | "APOLOGIZE" | "THREATEN";

const REQUESTS: readonly ActId[] = ["REQUEST", "OFFER", "APOLOGIZE", "THREATEN"];
const ACCEPTED: readonly OutcomeBand[] = ["ENTHUSIASTIC", "ACCEPT", "PARTIAL"];
const REFUSED: readonly OutcomeBand[] = ["REFUSE", "HARD_REFUSE"];
/** The objects that touch the material security (dialogue-acts §8.1 and §8.3). */
export const MATERIAL: readonly RequestObjectId[] = ["MONEY", "ITEM"];

/** Whether an answer is to one of `acts`, with a band in `bands` (any band when `null`). */
function answers(acts: readonly ActId[], bands: readonly OutcomeBand[] | null = null) {
  return (answer: AnswerView | null): answer is AnswerView =>
    answer !== null &&
    acts.includes(answer.act) &&
    (bands === null || (answer.band !== null && bands.includes(answer.band)));
}

function material(answer: AnswerView | null): boolean {
  return (
    answer?.object !== null && answer?.object !== undefined && MATERIAL.includes(answer.object)
  );
}

const on =
  (test: (answer: AnswerView | null) => boolean) =>
  (context: RowContext): boolean =>
    test(context.answer);

/**
 * The answers as the one who made the request, the question or the
 * accusation feels them: rows of `ACCEPT` and `REFUSE` (dialogue-acts §7.1 and
 * §8.3, "No autor do pedido"). "A vontade do pedido" is `REQUESTED`.
 */
export const REQUESTER_ROWS: readonly AppraisalRow[] = [
  { act: "ACCEPT", when: on(answers(REQUESTS, ["ENTHUSIASTIC"])), valence: 3, effects: [] },
  { act: "ACCEPT", when: on(answers(REQUESTS, ["ACCEPT"])), valence: 2, effects: [] },
  { act: "ACCEPT", when: on(answers(REQUESTS, ["PARTIAL"])), valence: 1, effects: [] },
  {
    act: "ACCEPT",
    when: on(answers(["REQUEST"], ACCEPTED)),
    valence: 0,
    effects: [
      drive("RECEIVER", -3),
      drive("influence", -2),
      emotion("joy", 2),
      bond("affection", 1),
      bond("dependence", 1),
    ],
  },
  {
    act: "ACCEPT",
    when: on(answers(["REQUEST"], ["ENTHUSIASTIC"])),
    valence: 0,
    effects: [emotion("joy", 1)],
  },
  {
    act: "ACCEPT",
    when: on(answers(["OFFER"], ACCEPTED)),
    valence: 0,
    effects: [drive("GIVER", -3), drive("purpose", -2), emotion("joy", 2)],
  },
  {
    act: "ACCEPT",
    when: on((answer) => answers(["OFFER"], ACCEPTED)(answer) && material(answer)),
    valence: 0,
    effects: [drive("material_security", 1)],
  },
  {
    act: "ACCEPT",
    when: on(answers(["APOLOGIZE"], ACCEPTED)),
    valence: 0,
    effects: [emotion("guilt", -2), drive("intimacy", -1)],
  },
  {
    act: "ACCEPT",
    when: on(answers(["THREATEN"], ACCEPTED)),
    valence: 0,
    effects: [drive("influence", -3)],
  },
  {
    act: "REFUSE",
    when: on(answers(REQUESTS, REFUSED)),
    valence: -1,
    effects: [
      drive("influence", 2),
      drive("REQUESTED", 1),
      emotion("anger", 1),
      emotion("sadness", 1),
    ],
  },
  {
    act: "REFUSE",
    when: on(answers(["OFFER"], REFUSED)),
    valence: 0,
    effects: [drive("purpose", 1)],
  },
  {
    act: "REFUSE",
    when: on(answers(REQUESTS, ["HARD_REFUSE"])),
    valence: 0,
    effects: [bond("resentment", 2), drive("dignity", 1)],
  },
  {
    act: "REFUSE",
    when: on(answers(["ASK"])),
    valence: -1,
    effects: [emotion("anger", 1), bond("trust", -1), drive("curiosity", 1)],
  },
  {
    act: "REFUSE",
    when: on(answers(["ACCUSE"])),
    valence: -1,
    effects: [emotion("anger", 1), bond("trust", -1), drive("justice", 1)],
  },
];

/** dialogue-acts §8.3, "No alvo": the effects in the one who answers a request. */
const RESPONDER_ROWS: readonly {
  readonly when: (answer: AnswerView) => boolean;
  readonly effects: readonly EffectTerm[];
}[] = [
  { when: answers(["REQUEST"], ACCEPTED), effects: [drive("GIVER", -1)] },
  {
    when: (answer) => answers(["REQUEST"], ACCEPTED)(answer) && material(answer),
    effects: [drive("material_security", 1)],
  },
  { when: answers(["OFFER"], ACCEPTED), effects: [drive("RECEIVER", -3)] },
  {
    when: answers(["APOLOGIZE"], ACCEPTED),
    effects: [drive("justice", -2), bond("resentment", -2)],
  },
  {
    when: answers(["THREATEN"], ACCEPTED),
    effects: [emotion("fear", 1), bond("resentment", 2), drive("dignity", 2)],
  },
  { when: answers(["THREATEN"], REFUSED), effects: [drive("dignity", -1)] },
];

/** The effect terms in the one who answers `answer` (dialogue-acts §8.3), toward who asked. */
export function responderTerms(answer: AnswerView): EffectTerm[] {
  return RESPONDER_ROWS.filter((row) => row.when(answer)).flatMap((row) => row.effects);
}

/** "A vontade do pedido" (dialogue-acts §8.3): what the one who asked wanted from it. */
const REQUESTED_DRIVE: Readonly<Record<RequestActId, DriveRef>> = {
  REQUEST: "RECEIVER",
  OFFER: "GIVER",
  APOLOGIZE: "intimacy",
  THREATEN: "influence",
};

export function isRequestDriveRef(ref: DriveRef): ref is RequestDriveRef {
  return (REQUEST_DRIVE_REFS as readonly string[]).includes(ref);
}

function isRequestAct(act: ActId): act is RequestActId {
  return REQUESTS.includes(act);
}

/**
 * Resolves the drives of a request answered (dialogue-acts §4 and §8.3):
 * `RECEIVER` and `GIVER` are the drives of its object in who receives and who
 * gives; `REQUESTED`, the drive of the request itself. Without an answer, or
 * without an object, they resolve to `null` (the term is dropped).
 */
export function requestDrives(
  answer: AnswerView | null,
  objects: RequestObjectRules,
): RequestDrives {
  const entry = objects.find((object) => object.id === answer?.object);
  const sides = new Map<DriveRef, DriveId | null>([
    ["RECEIVER", entry?.receiverDrive ?? null],
    ["GIVER", entry?.giverDrive ?? null],
  ]);
  const act = answer?.act ?? "CHAT";
  const requested: DriveRef | null = isRequestAct(act) ? REQUESTED_DRIVE[act] : null;
  sides.set("REQUESTED", resolveRef(requested, sides));
  return (ref) => sides.get(ref) ?? null;
}

/** A drive id as it is, a request drive by `sides`, or `null`. */
function resolveRef(
  ref: DriveRef | null,
  sides: ReadonlyMap<DriveRef, DriveId | null>,
): DriveId | null {
  // A ref that is not a request drive is a drive id.
  return ref === null ? null : (sides.get(ref) ?? (sides.has(ref) ? null : (ref as DriveId)));
}
