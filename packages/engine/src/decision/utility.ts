/**
 * The utility of a candidate (simulation-model §10 item 3):
 *
 * ```text
 * U = Σ_drives mulBp(mulBp(effectiveWeight(v), deficit(v)), satisfaction(act, tone, v))
 *   + emotions + traits + bond with the target + perception of the target + associations of the topic
 *   + Σ dominant directed drives with satisfaction ≥ 6000: mulBp(deficit(v, target), 2000)
 *   − 1500 × repetitions of the same act and topic among the author's last 6 acts
 *   + 4000 when the candidate answers an obligation
 * ```
 */
import { toldOffenders, badSubjects } from "../acts/appraisal-context.ts";
import type { ActLabel } from "../acts/label.ts";
import { answeredObligation } from "../acts/obligations.ts";
import { bondToward } from "../character/bonds.ts";
import { directedDeficit, dominantDrives, isDirected, type Drives } from "../character/drives.ts";
import { effectiveWeight } from "../character/maslow.ts";
import { perceptionPreview, perceptionToward } from "../character/perception.ts";
import type { CharacterState } from "../character/state.ts";
import { effectiveTrait } from "../character/traits.ts";
import {
  GOAL_BONUS,
  OBLIGATION_BONUS,
  REPEAT_PENALTY,
  REPEAT_WINDOW,
} from "../domain/constants.ts";
import type { CharacterId } from "../domain/ids.ts";
import { div, mulBp } from "../domain/math.ts";
import type { ActFact } from "../memory/fact.ts";
import type { ActId } from "../presets/acts.ts";
import { DRIVE_IDS, type DriveId } from "../presets/drives.ts";
import { canonicalize } from "../session/canonical.ts";
import { associationBias, bondBias, emotionBias, perceptionBias, traitBias } from "./biases.ts";
import { satisfaction, type SatisfactionContext } from "./satisfaction.ts";
import { groupListeners, otherIds, presentOther, type DecisionScene } from "./scene.ts";

/** A candidate act (simulation-model §10 item 2). */
export interface Candidate {
  readonly label: ActLabel;
  /** It answers a pending obligation: the utility takes `OBLIGATION_BONUS`. */
  readonly answers: boolean;
}

/** `justice` toward the target from which it is an offender (dialogue-acts §9.2). */
const OFFENDER_JUSTICE = 5000;
/** The satisfaction from which a dominant directed drive takes the goal bonus (simulation-model §10). */
const GOAL_SATISFACTION = 6000;

/**
 * The deficit of `drive` the candidate reads (simulation-model §10): a directed
 * drive's toward `target`, 0 without a single target; any other drive's own.
 */
export function deficitToward(drives: Drives, drive: DriveId, target: CharacterId | null): number {
  if (!isDirected(drive)) {
    return drives.deficits[drive];
  }
  return target === null ? 0 : directedDeficit(drives, drive, target);
}

/** `mulBp(effectiveWeight(v), deficit(v))` toward `target`: how much the drive presses. */
export function pressure(drives: Drives, drive: DriveId, target: CharacterId | null): number {
  return mulBp(effectiveWeight(drives, drive), deficitToward(drives, drive, target));
}

/** The single target of a label: its only listed target, `null` for the `GROUP` or nobody. */
export function singleTarget(label: ActLabel): CharacterId | null {
  const { targets } = label;
  return targets !== "GROUP" && targets.length === 1 ? (targets[0] ?? null) : null;
}

/** The drive the answered request serves in who accepts it (dialogue-acts §9.2, `ACCEPT`). */
const ANSWERED_DRIVES: Readonly<
  Partial<
    Record<ActId, (sides: { receiver: DriveId | null; giver: DriveId | null }) => DriveId | null>
  >
> = {
  REQUEST: (sides) => sides.giver,
  OFFER: (sides) => sides.receiver,
  APOLOGIZE: () => "intimacy",
  THREATEN: () => "physical_safety",
};

function objectDrives(scene: DecisionScene, object: string | undefined) {
  const entry = scene.objects.find((each) => each.id === object);
  return { receiver: entry?.receiverDrive ?? null, giver: entry?.giverDrive ?? null };
}

function answeredDrive(scene: DecisionScene, label: ActLabel): DriveId | null {
  const owed = answeredObligation(scene.obligations, scene.author.id, label);
  const request = scene.facts.find((fact) => fact.id === owed?.fact);
  if (label.act !== "ACCEPT" || owed === undefined || request?.kind !== "ACT") {
    return null;
  }
  return ANSWERED_DRIVES[owed.act]?.(objectDrives(scene, request.label.object)) ?? null;
}

function isBadFact(scene: DecisionScene, label: ActLabel): boolean {
  const { topic } = label;
  const fact = "fact" in topic ? scene.facts.find((held) => held.id === topic.fact) : undefined;
  if (fact === undefined) {
    return false;
  }
  const copy = scene.author.memories.find((held) => held.fact === fact.id);
  return badSubjects(fact, toldOffenders(label, fact, copy), topic.type).length > 0;
}

/** What the conditional cells of the satisfaction of a candidate read. */
export function satisfactionContext(scene: DecisionScene, label: ActLabel): SatisfactionContext {
  const target = singleTarget(label);
  const justice = deficitToward(scene.author.drives, "justice", target);
  return {
    ...objectDrives(scene, label.object),
    answered: answeredDrive(scene, label),
    badFact: isBadFact(scene, label),
    targetOffender: justice >= OFFENDER_JUSTICE,
  };
}

/** The bond and perception biases toward one present character. */
function towardBias(scene: DecisionScene, target: CharacterState, label: TargetedAct): number {
  const { author } = scene;
  const bond = bondToward(author.bonds, target.id);
  const trust = effectiveTrait(author.traits, author.tendencies, "trustInOthers");
  const perception = perceptionToward(
    author.perceptions,
    target.id,
    perceptionPreview(bond, trust),
  );
  return (
    bondBias(bond.axes, label.act, label.tone) + perceptionBias(perception, label.act, label.tone)
  );
}

/** An act, its tone and its targets: what the bias toward the targets reads. */
export type TargetedAct = Pick<ActLabel, "act" | "tone" | "targets">;

/**
 * The bond and perception biases (dialogue-acts §9.3): toward the target, or
 * the truncated mean toward the listeners of the `GROUP`; 0 toward nobody.
 */
export function targetBias(scene: DecisionScene, label: TargetedAct): number {
  const { targets } = label;
  const toward =
    targets === "GROUP"
      ? groupListeners(scene)
      : targets.flatMap((id) => presentOther(scene, id) ?? []);
  const total = toward.reduce((sum, target) => sum + towardBias(scene, target, label), 0);
  return toward.length === 0 ? 0 : div(total, toward.length);
}

function driveTerms(scene: DecisionScene, label: ActLabel, context: SatisfactionContext): number {
  const { drives } = scene.author;
  const target = singleTarget(label);
  const served = (drive: DriveId) => satisfaction(label.act, label.tone, drive, context);
  const drivesSum = DRIVE_IDS.reduce(
    (sum, drive) => sum + mulBp(pressure(drives, drive, target), served(drive)),
    0,
  );
  const goal = dominantDrives(drives)
    .filter((drive) => isDirected(drive) && served(drive) >= GOAL_SATISFACTION)
    .reduce((sum, drive) => sum + mulBp(deficitToward(drives, drive, target), GOAL_BONUS), 0);
  return drivesSum + goal;
}

/** How many of the author's last 6 acts had the same act and topic (simulation-model §10). */
export function repetitions(scene: DecisionScene, label: ActLabel): number {
  const topic = canonicalize(label.topic);
  return scene.facts
    .filter((fact): fact is ActFact => fact.kind === "ACT" && fact.author === scene.author.id)
    .slice(-REPEAT_WINDOW)
    .filter((fact) => fact.label.act === label.act && canonicalize(fact.label.topic) === topic)
    .length;
}

/**
 * The utility of a candidate of `scene.author` (simulation-model §10 item 3;
 * see the module comment). An integer; it is no state and is not limited.
 */
export function scoreCandidate(scene: DecisionScene, candidate: Candidate): number {
  const { label } = candidate;
  const { author } = scene;
  const context = satisfactionContext(scene, label);
  return (
    driveTerms(scene, label, context) +
    emotionBias(author.emotions, label.act, label.tone) +
    traitBias(author, label.act, label.tone, label.isFalse) +
    targetBias(scene, label) +
    associationBias(author, label.act, label.topic, otherIds(scene)) -
    REPEAT_PENALTY * repetitions(scene, label) +
    (candidate.answers ? OBLIGATION_BONUS : 0)
  );
}
