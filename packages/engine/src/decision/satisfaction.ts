/**
 * How much an act serves each drive (dialogue-acts §9.2), as data: a level per
 * act and drive (3 = 9000, 2 = 6000, 1 = 3000), the sums of the tones, and the
 * conditional cells (simulation-model §10, "Detalhes da decisão"). When act and
 * tone give different levels for the same drive, the larger wins.
 */
import type { Bp } from "../domain/bp.ts";
import { toBp } from "../domain/bp.ts";
import type { ActId } from "../presets/acts.ts";
import type { DriveId } from "../presets/drives.ts";
import type { ToneId } from "../presets/tones.ts";

/** A level of service: 1 serves a little, 2 serves, 3 serves a lot. */
export type SatisfactionLevel = 1 | 2 | 3;

/**
 * A drive cell: a drive, or one resolved by the candidate: the drive of the
 * object in who receives it (`RECEIVER`) or gives it (`GIVER`), or the drive the
 * answered request serves in who accepts it (`ANSWERED`).
 */
export type SatisfiedDrive = DriveId | "RECEIVER" | "GIVER" | "ANSWERED";

/** When a conditional cell applies. */
export type SatisfactionCondition = "BAD_FACT" | "TARGET_OFFENDER";

/** One cell of the table. */
export interface SatisfactionCell {
  readonly drive: SatisfiedDrive;
  readonly level: SatisfactionLevel;
  /** Only when this holds (simulation-model §10, "Satisfação condicional"); `null` always. */
  readonly when: SatisfactionCondition | null;
}

/** What the drive cells and conditions of a candidate resolve to. */
export interface SatisfactionContext {
  /** The drives of the candidate's object, or of the request answered by an `ACCEPT`. */
  readonly receiver: DriveId | null;
  readonly giver: DriveId | null;
  readonly answered: DriveId | null;
  /** The topic is a fact bad for someone (dialogue-acts §4). */
  readonly badFact: boolean;
  /** The author's `justice` toward the target is ≥ 5000. */
  readonly targetOffender: boolean;
}

const cell = (
  drive: SatisfiedDrive,
  level: SatisfactionLevel,
  when: SatisfactionCondition | null = null,
): SatisfactionCell => ({ drive, level, when });

/** dialogue-acts §9.2, the rows of the acts. */
export const ACT_SATISFACTION: Readonly<Record<ActId, readonly SatisfactionCell[]>> = {
  GREET: [cell("company", 2), cell("predictability", 1)],
  CHAT: [cell("company", 3), cell("intimacy", 2), cell("fun", 2), cell("curiosity", 1)],
  ASK: [cell("curiosity", 3), cell("predictability", 2), cell("company", 1)],
  TELL: [
    cell("recognition", 3),
    cell("company", 2),
    cell("influence", 2),
    cell("justice", 1, "BAD_FACT"),
  ],
  PRAISE: [cell("intimacy", 2), cell("care", 2), cell("influence", 1)],
  TEASE: [cell("fun", 3), cell("influence", 2), cell("justice", 1)],
  ACCUSE: [cell("justice", 3), cell("dignity", 2), cell("influence", 1)],
  REQUEST: [cell("RECEIVER", 3), cell("company", 1)],
  OFFER: [cell("GIVER", 3), cell("influence", 2), cell("purpose", 1)],
  APOLOGIZE: [cell("intimacy", 3), cell("dignity", 2), cell("predictability", 1)],
  THREATEN: [cell("influence", 3), cell("physical_safety", 2), cell("justice", 2)],
  ACCEPT: [cell("ANSWERED", 2)],
  REFUSE: [cell("dignity", 2), cell("influence", 1)],
  FAREWELL: [],
  STAY_SILENT: [],
  MOVE: [],
  APPROACH: [cell("company", 2), cell("desire", 1)],
  WITHDRAW: [cell("physical_safety", 3), cell("dignity", 1)],
  LEAVE: [],
  TOUCH: [cell("intimacy", 2), cell("care", 1)],
};

/** dialogue-acts §9.2, "Somas de tom". */
export const TONE_SATISFACTION: Readonly<Record<ToneId, readonly SatisfactionCell[]>> = {
  WARM: [cell("intimacy", 1)],
  NEUTRAL: [],
  PLAYFUL: [cell("fun", 2)],
  SEDUCTIVE: [cell("desire", 3)],
  IRONIC: [cell("fun", 1), cell("influence", 1), cell("justice", 1)],
  AGGRESSIVE: [cell("influence", 2), cell("justice", 2, "TARGET_OFFENDER")],
};

/** The bp of each level (dialogue-acts §9.2): 3 = 9000, 2 = 6000, 1 = 3000. */
const LEVEL_BP: Readonly<Record<SatisfactionLevel, number>> = { 1: 3000, 2: 6000, 3: 9000 };

const CONDITIONS: Readonly<
  Record<SatisfactionCondition, (context: SatisfactionContext) => boolean>
> = {
  BAD_FACT: (context) => context.badFact,
  TARGET_OFFENDER: (context) => context.targetOffender,
};

function resolved(drive: SatisfiedDrive, context: SatisfactionContext): DriveId | null {
  if (drive === "RECEIVER") {
    return context.receiver;
  }
  if (drive === "GIVER") {
    return context.giver;
  }
  return drive === "ANSWERED" ? context.answered : drive;
}

/**
 * `satisfaction(ato, tom, vontade)` (dialogue-acts §9.2): the bp of the larger
 * level the act and the tone give to `drive`, 0 when neither serves it.
 *
 * @example
 * satisfaction("CHAT", "PLAYFUL", "fun", context); // 6000: CHAT 2, PLAYFUL 2
 */
export function satisfaction(
  act: ActId,
  tone: ToneId,
  drive: DriveId,
  context: SatisfactionContext,
): Bp {
  const levels = [...ACT_SATISFACTION[act], ...TONE_SATISFACTION[tone]]
    .filter((entry) => entry.when === null || CONDITIONS[entry.when](context))
    .filter((entry) => resolved(entry.drive, context) === drive)
    .map((entry) => LEVEL_BP[entry.level]);
  return toBp(Math.max(0, ...levels));
}
