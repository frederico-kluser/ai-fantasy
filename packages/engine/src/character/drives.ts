/**
 * Drives, the needs of Maslow's pyramid (simulation-model §5.3): a weight per
 * drive (how much it matters to the character) and a deficit (0 = satisfied;
 * 10000 = desperate). Directed drives (`intimacy`, `desire`, `care`, `justice`)
 * have one deficit per known person, kept in a list sorted by id.
 */
import { DOMINANT_DRIVE_WEIGHT } from "../domain/constants.ts";
import { toBp, type Bp } from "../domain/bp.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";
import { DRIVE_IDS, type DriveId } from "../presets/drives.ts";

/** The directed drives, in the order of simulation-model §5.3 (the `directed` drives of the catalog). */
export const DIRECTED_DRIVE_IDS = ["intimacy", "desire", "care", "justice"] as const;

/** A directed drive: one deficit per known person. */
export type DirectedDriveId = (typeof DIRECTED_DRIVE_IDS)[number];

/** A drive with a single deficit. */
export type UndirectedDriveId = Exclude<DriveId, DirectedDriveId>;

/** A level of Maslow's pyramid: 1 physiological … 5 self-actualization. */
export type MaslowLevel = 1 | 2 | 3 | 4 | 5;

/** The level of each drive (simulation-model §5.3, the `level` of the drive catalog). */
export const DRIVE_LEVELS: Readonly<Record<DriveId, MaslowLevel>> = {
  physical_relief: 1,
  physical_safety: 2,
  material_security: 2,
  predictability: 2,
  company: 3,
  intimacy: 3,
  desire: 3,
  care: 3,
  recognition: 4,
  dignity: 4,
  influence: 4,
  curiosity: 5,
  purpose: 5,
  fun: 5,
  justice: 5,
};

/** The deficit of a directed drive toward one person. */
export interface DirectedDeficit {
  readonly target: CharacterId;
  readonly deficit: Bp;
}

/**
 * The drives of a character. Every directed list is sorted by increasing
 * target id; the cast generation gives an entry to every known person, and a
 * missing entry reads as 0 (simulation-model §5.3).
 */
export interface Drives {
  readonly weights: { readonly [K in DriveId]: Bp };
  readonly deficits: { readonly [K in UndirectedDriveId]: Bp };
  readonly directed: { readonly [K in DirectedDriveId]: readonly DirectedDeficit[] };
}

/** Whether a drive is directed. */
export function isDirected(drive: DriveId): drive is DirectedDriveId {
  return DIRECTED_DRIVE_IDS.some((id) => id === drive);
}

/** The deficit of a directed drive toward `target`; 0 without an entry. */
export function directedDeficit(drives: Drives, drive: DirectedDriveId, target: CharacterId): Bp {
  return drives.directed[drive].find((entry) => entry.target === target)?.deficit ?? toBp(0);
}

/**
 * The list with the deficit toward `target` set (clamped to `0..10000`),
 * added in id order when there was no entry. The list given is not changed.
 */
export function withDirectedDeficit(
  list: readonly DirectedDeficit[],
  target: CharacterId,
  deficit: number,
): DirectedDeficit[] {
  const others = list.filter((entry) => entry.target !== target);
  return [...others, { target, deficit: toBp(deficit) }].sort((a, b) =>
    compareIds(a.target, b.target),
  );
}

/**
 * The highest deficit of a drive: its deficit, or for a directed drive the
 * largest among its targets (0 without entries). Maslow's precedence reads it.
 */
export function highestDeficit(drives: Drives, drive: DriveId): Bp {
  if (isDirected(drive)) {
    return toBp(Math.max(0, ...drives.directed[drive].map((entry) => entry.deficit)));
  }
  return drives.deficits[drive];
}

/**
 * "The target" of a directed drive when a rule names none (simulation-model
 * §5.3): the present person with the highest deficit, ties to the lowest id;
 * `null` when nobody is present.
 */
export function directedTarget(
  drives: Drives,
  drive: DirectedDriveId,
  present: readonly CharacterId[],
): CharacterId | null {
  const ordered = [...present].sort(compareIds);
  let best: CharacterId | null = null;
  let bestDeficit = -1;
  for (const target of ordered) {
    const deficit = directedDeficit(drives, drive, target);
    if (deficit > bestDeficit) {
      best = target;
      bestDeficit = deficit;
    }
  }
  return best;
}

/** The dominant drives, weight ≥ 7000 (simulation-model §5.3), in catalog order. */
export function dominantDrives(drives: Drives): DriveId[] {
  return DRIVE_IDS.filter((drive) => drives.weights[drive] >= DOMINANT_DRIVE_WEIGHT);
}
