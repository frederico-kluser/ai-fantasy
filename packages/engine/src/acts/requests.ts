/**
 * Requests (dialogue-acts §8): `REQUEST`, `OFFER`, `APOLOGIZE` and `THREATEN`
 * create an obligation to answer. When the target in `AUTO` takes its turn with
 * it pending, the acceptance chance `p` and a draw on the `resolution` stream
 * give the outcome band, which fixes the reply; a target in `MANUAL` answers as
 * it likes and nothing is drawn. The effects of the answer (§8.3) are data:
 * {@link REQUESTER_ROWS} for the one who asked (rows of the appraisal table)
 * and {@link responderTerms} for the one who answers.
 */
import { bondToward } from "../character/bonds.ts";
import { directedDeficit, dominantDrives, isDirected } from "../character/drives.ts";
import { perceptionPreview, perceptionToward } from "../character/perception.ts";
import type { CharacterState } from "../character/state.ts";
import { effectiveTrait } from "../character/traits.ts";
import { toBp, type Bp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import { BP_SCALE, clampInt, div, mulBp } from "../domain/math.ts";
import type { Presets } from "../presets/catalogs.ts";
import type { ActId } from "../presets/acts.ts";
import type { DriveId } from "../presets/drives.ts";
import type { RequestObjectId } from "../presets/request-objects.ts";
import type { ToneId } from "../presets/tones.ts";
import type { Drawer } from "../rng/drawer.ts";
import type { RequestDrives } from "./appraisal-effects.ts";
import {
  bondTerm as bond,
  driveTerm as drive,
  emotionTerm as emotion,
  type AnswerView,
  type AppraisalRow,
  type DriveRef,
  type EffectTerm,
  type RequestDriveRef,
  type RowContext,
  REQUEST_DRIVE_REFS,
} from "./effect-terms.ts";
import type { ActLabel, OutcomeBand } from "./label.ts";

/** The request objects catalog: `presets.requestObjects`. */
export type RequestObjectRules = Presets["requestObjects"];

/** The four requests (dialogue-acts §8.1). */
export type RequestActId = "REQUEST" | "OFFER" | "APOLOGIZE" | "THREATEN";

/** The bands, from the best answer to the worst (dialogue-acts §8.2). */
export const BANDS: readonly OutcomeBand[] = [
  "ENTHUSIASTIC",
  "ACCEPT",
  "PARTIAL",
  "REFUSE",
  "HARD_REFUSE",
];

const REQUESTS: readonly ActId[] = ["REQUEST", "OFFER", "APOLOGIZE", "THREATEN"];
const ACCEPTED: readonly OutcomeBand[] = ["ENTHUSIASTIC", "ACCEPT", "PARTIAL"];
const REFUSED: readonly OutcomeBand[] = ["REFUSE", "HARD_REFUSE"];
/** The objects that touch the material security (dialogue-acts §8.1 and §8.3). */
const MATERIAL: readonly RequestObjectId[] = ["MONEY", "ITEM"];

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

function isRequestDriveRef(ref: DriveRef): ref is RequestDriveRef {
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

/** The request whose acceptance is computed: the real act, tone and object (dialogue-acts §8.1). */
export interface RequestView {
  readonly act: RequestActId;
  readonly tone: ToneId;
  readonly object: RequestObjectId | null;
}

/** What the acceptance chance reads (dialogue-acts §8.1), with the state of the moment of the draw. */
export interface AcceptanceInput {
  readonly request: RequestView;
  readonly author: CharacterState;
  readonly target: CharacterState;
  readonly objects: RequestObjectRules;
  /** Giving in humiliates the target before witnesses (see {@link humiliates}). */
  readonly humiliating: boolean;
}

/** `BASE[ato]` (dialogue-acts §8.1). */
const BASE: Readonly<Record<RequestActId, number>> = {
  REQUEST: 5000,
  OFFER: 6000,
  APOLOGIZE: 5000,
  THREATEN: 4000,
};

const SEDUCED = 5000;
/** "ajuste do tom" (dialogue-acts §8.1): by tone, reading the target's attraction and the act. */
const TONE_ADJUSTMENT: Readonly<Record<ToneId, (attraction: Bp, act: RequestActId) => number>> = {
  WARM: () => 500,
  NEUTRAL: () => 0,
  PLAYFUL: () => 0,
  SEDUCTIVE: (attraction) => (attraction >= SEDUCED ? 1000 : -1000),
  IRONIC: () => -700,
  AGGRESSIVE: (_attraction, act) => (act === "THREATEN" ? 0 : -1500),
};

/** "ajuste de vontade" (dialogue-acts §8.1): +1500 or −1500 when the drive is dominant in the target. */
const DRIVE_ADJUSTMENTS: readonly {
  readonly act: RequestActId;
  readonly drive: DriveRef;
  readonly amount: number;
  readonly objects?: readonly RequestObjectId[];
}[] = [
  { act: "REQUEST", drive: "GIVER", amount: 1500 },
  { act: "REQUEST", drive: "material_security", amount: -1500, objects: MATERIAL },
  { act: "OFFER", drive: "RECEIVER", amount: 1500 },
  { act: "APOLOGIZE", drive: "intimacy", amount: 1500 },
  { act: "APOLOGIZE", drive: "justice", amount: -1500 },
  { act: "THREATEN", drive: "physical_safety", amount: 1500 },
  { act: "THREATEN", drive: "dignity", amount: -1500 },
];

/** A directed drive counts only toward the author with a deficit of 3000 or more (dialogue-acts §8.1). */
const DIRECTED_FLOOR = 3000;
const NEUTRAL_SINCERITY = 5000;
const NEUTRAL_ELOQUENCE = 5000;
const HUMILIATION = 700;
const P_MIN = 500;
const P_MAX = 9500;

function counts(target: CharacterState, author: CharacterId, drive: DriveId): boolean {
  const dominant = dominantDrives(target.drives).includes(drive);
  return (
    dominant &&
    (!isDirected(drive) || directedDeficit(target.drives, drive, author) >= DIRECTED_FLOOR)
  );
}

function driveAdjustment(input: AcceptanceInput): number {
  const { request, target, author } = input;
  const view: AnswerView = { act: request.act, band: null, object: request.object };
  const resolve = requestDrives(view, input.objects);
  const id = (ref: DriveRef): DriveId | null => (isRequestDriveRef(ref) ? resolve(ref) : ref);
  return DRIVE_ADJUSTMENTS.filter(
    (entry) =>
      entry.act === request.act &&
      (entry.objects === undefined ||
        (request.object !== null && entry.objects.includes(request.object))),
  )
    .map((entry) => ({ entry, drive: id(entry.drive) }))
    .filter(({ drive: id }) => id !== null && counts(target, author.id, id))
    .reduce((sum, { entry }) => sum + entry.amount, 0);
}

/** `(fearOf − courage / 2) / 3`, only in `THREATEN`. */
function threatTerm(input: AcceptanceInput, fearOf: Bp): number {
  const courage = effectiveTrait(input.target.traits, input.target.tendencies, "courage");
  return input.request.act === "THREATEN" ? div(fearOf - div(courage, 2), 3) : 0;
}

/**
 * The chance, in bp, that the target accepts the request (dialogue-acts §8.1):
 *
 * ```text
 * clamp(BASE + (trust − resentment) / 5 + affection / 10 + (perceivedSincerity − 5000) / 5
 *       + (eloquence(author) − 5000) / 10 + tone + drives + (THREATEN) (fearOf − courage / 2) / 3
 *       − 700 if humiliating, 500, 9500)
 * ```
 *
 * Bond and perception are the target's toward the author (a fresh perception
 * when there is no record); traits are effective.
 */
export function acceptanceChance(input: AcceptanceInput): Bp {
  const { request, author, target } = input;
  const axes = bondToward(target.bonds, author.id).axes;
  const trust = effectiveTrait(target.traits, target.tendencies, "trustInOthers");
  const preview = perceptionPreview(bondToward(target.bonds, author.id), trust);
  const sincerity = perceptionToward(target.perceptions, author.id, preview).perceivedSincerity;
  const sum =
    BASE[request.act] +
    div(axes.trust - axes.resentment, 5) +
    div(axes.affection, 10) +
    div(sincerity - NEUTRAL_SINCERITY, 5) +
    div(author.aptitudes.eloquence - NEUTRAL_ELOQUENCE, 10) +
    TONE_ADJUSTMENT[request.tone](axes.attraction, request.act) +
    driveAdjustment(input) +
    threatTerm(input, axes.fearOf) -
    (input.humiliating ? HUMILIATION : 0);
  return toBp(clampInt(sum, P_MIN, P_MAX));
}

/** What decides whether giving in humiliates (dialogue-acts §8.1). */
export interface HumiliationInput {
  readonly act: RequestActId;
  /** Another `DIRECT` listener is there, besides the author and the target. */
  readonly witnessed: boolean;
  /** The privacy of the place. */
  readonly privacy: Bp;
  readonly target: CharacterState;
}

const PUBLIC_BELOW = 4000;
const PROUD = 5000;
/** Which requests humiliate when given in to, by the target's effective pride. */
const HUMILIATING: Readonly<Record<RequestActId, (pride: number) => boolean>> = {
  THREATEN: () => true,
  REQUEST: (pride) => pride >= PROUD,
  APOLOGIZE: (pride) => pride >= PROUD,
  OFFER: () => false,
};

/**
 * "Ceder humilha diante de testemunhas" (dialogue-acts §8.1): another `DIRECT`
 * listener, privacy below 4000, and a `THREATEN`, or a `REQUEST` or
 * `APOLOGIZE` to a target with effective `pride` ≥ 5000.
 */
export function humiliates(input: HumiliationInput): boolean {
  const pride = effectiveTrait(input.target.traits, input.target.tendencies, "pride");
  return input.witnessed && input.privacy < PUBLIC_BELOW && HUMILIATING[input.act](pride);
}

/**
 * The widths of the five bands for `p`, in the order of {@link BANDS}
 * (dialogue-acts §8.2): `mulBp(p, 2000)`, up to `mulBp(p, 8000)`, up to `p`,
 * up to `p + mulBp(10000 − p, 7000)`, and the rest; they sum to 10000.
 */
export function bandWidths(p: number): number[] {
  const enthusiastic = mulBp(p, 2000);
  const accept = mulBp(p, 8000);
  const refuse = mulBp(BP_SCALE - p, 7000);
  return [enthusiastic, accept - enthusiastic, p - accept, refuse, BP_SCALE - p - refuse];
}

/** The band of a draw `u` in `[0, 10000)` for the chance `p` (dialogue-acts §8.2, table). */
export function bandAt(u: number, p: number): OutcomeBand {
  const widths = bandWidths(p);
  const limits = widths
    .slice(0, -1)
    .map((_, i) => widths.slice(0, i + 1).reduce((a, b) => a + b, 0));
  // At most four limits are passed: the count is an index of the five bands.
  return BANDS[limits.filter((limit) => u >= limit).length] as OutcomeBand;
}

/**
 * Draws the band of a request to `target` with chance `p` (dialogue-acts §8.2):
 * a weighted draw of the widths of the five bands on the `resolution` stream,
 * as `REQUEST_BAND` with the target, so `MOST_LIKELY` gives the widest band and
 * the inspector can force any band of width above 0.
 */
export function drawBand(drawer: Drawer, p: number, target: CharacterId): OutcomeBand {
  const index = drawer.drawWeighted("resolution", bandWidths(p), "REQUEST_BAND", target);
  // drawWeighted returns an index of the widths, which match the bands one to one.
  return BANDS[index] as OutcomeBand;
}

/** The reply a band fixes for a target in `AUTO` (dialogue-acts §8.2). */
export interface FixedReply {
  readonly act: "ACCEPT" | "REFUSE";
  /** The tones it may take: with two, the decision picks the one of highest bias (SOC-04). */
  readonly tones: readonly ToneId[];
  /** A fixed intensity, or `null` for the intensity of the decision (dialogue-acts §5). */
  readonly intensity: number | null;
}

const FIXED_REPLIES: Readonly<Record<OutcomeBand, FixedReply>> = {
  ENTHUSIASTIC: { act: "ACCEPT", tones: ["WARM"], intensity: 8000 },
  ACCEPT: { act: "ACCEPT", tones: ["WARM", "NEUTRAL"], intensity: null },
  PARTIAL: { act: "ACCEPT", tones: ["NEUTRAL"], intensity: null },
  REFUSE: { act: "REFUSE", tones: ["NEUTRAL"], intensity: null },
  HARD_REFUSE: { act: "REFUSE", tones: ["AGGRESSIVE"], intensity: null },
};

/** The reply `band` fixes (dialogue-acts §8.2): the target chooses only between it and `STAY_SILENT`. */
export function fixedReply(band: OutcomeBand): FixedReply {
  return FIXED_REPLIES[band];
}

/** The band of a player's answer in `MANUAL`, in order: the first that matches (dialogue-acts §8.2). */
const ANSWER_BANDS: readonly {
  readonly act: ActId;
  readonly tone?: ToneId;
  readonly minIntensity?: number;
  readonly band: OutcomeBand;
}[] = [
  { act: "ACCEPT", tone: "WARM", minIntensity: 7000, band: "ENTHUSIASTIC" },
  { act: "ACCEPT", band: "ACCEPT" },
  { act: "REFUSE", tone: "AGGRESSIVE", band: "HARD_REFUSE" },
  { act: "REFUSE", band: "REFUSE" },
];

/**
 * The band of an answer the player chose in `MANUAL` (dialogue-acts §8.2):
 * `ACCEPT` in `WARM` with intensity ≥ 7000 → `ENTHUSIASTIC`; another `ACCEPT`
 * → `ACCEPT`; `REFUSE` in `AGGRESSIVE` → `HARD_REFUSE`; another `REFUSE` →
 * `REFUSE`; any other act → `null` (the obligation is ignored).
 */
export function bandOfAnswer(label: ActLabel): OutcomeBand | null {
  const match = ANSWER_BANDS.find(
    (entry) =>
      entry.act === label.act &&
      (entry.tone === undefined || entry.tone === label.tone) &&
      label.intensity >= (entry.minIntensity ?? 0),
  );
  return match?.band ?? null;
}

/** The turn of a target with a request pending. */
export interface RequestTurnInput extends AcceptanceInput {
  readonly control: "AUTO" | "MANUAL";
}

/** The outcome of a request turn: the player answers freely, or the band fixes the reply. */
export type RequestTurn =
  | { readonly kind: "AWAITING" }
  | {
      readonly kind: "FIXED";
      readonly chance: Bp;
      readonly band: OutcomeBand;
      readonly reply: FixedReply;
    };

/**
 * The turn of a target with a request pending (dialogue-acts §8.1 and §8.2):
 * in `MANUAL`, nothing is drawn and the interface awaits the answer; in `AUTO`,
 * the band is drawn from `p` and fixes the reply.
 */
export function resolveRequestTurn(drawer: Drawer, input: RequestTurnInput): RequestTurn {
  if (input.control === "MANUAL") {
    return { kind: "AWAITING" };
  }
  const chance = acceptanceChance(input);
  const band = drawBand(drawer, chance, input.target.id);
  return { kind: "FIXED", chance, band, reply: fixedReply(band) };
}
