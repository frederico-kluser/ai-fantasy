/**
 * Maslow's precedence (simulation-model §5.3): unmet needs of the lower levels
 * muffle the drives above them in the decision.
 */
import { toBp, type Bp } from "../domain/bp.ts";
import { DISCOMFORT } from "../domain/constants.ts";
import { BP_SCALE, clampInt, mulBp } from "../domain/math.ts";
import { DRIVE_IDS, type DriveId } from "../presets/drives.ts";
import { DRIVE_LEVELS, highestDeficit, type Drives, type MaslowLevel } from "./drives.ts";

/** How fast a pressure grows past 5000: ×2, so it is full at 10000. */
const PRESSURE_SLOPE = 2;

/**
 * `clamp((value − 5000) × 2, 0, 10000)`: the shape of both the physical relief
 * deficit (from the greatest need) and the suppression of a level (simulation-model §5.3).
 */
export function pressureOf(value: number): Bp {
  return toBp(clampInt((value - DISCOMFORT) * PRESSURE_SLOPE, 0, BP_SCALE));
}

/** The highest deficit among the drives below `level` (the largest target for directed drives). */
export function maxLowerDeficit(drives: Drives, level: MaslowLevel): Bp {
  const lower = DRIVE_IDS.filter((drive) => DRIVE_LEVELS[drive] < level);
  return toBp(Math.max(0, ...lower.map((drive) => highestDeficit(drives, drive))));
}

/** `suppression(L) = clamp((maxLower − 5000) × 2, 0, 10000)` (simulation-model §5.3). */
export function suppression(drives: Drives, level: MaslowLevel): Bp {
  return pressureOf(maxLowerDeficit(drives, level));
}

/**
 * `effectiveWeight(v) = mulBp(weight(v), 10000 − suppression(level(v)))`
 * (simulation-model §5.3): with physical relief at 7500 the drives above weigh
 * half; at 10000 they leave the decision.
 *
 * @example
 * effectiveWeight(character.drives, "curiosity");
 */
export function effectiveWeight(drives: Drives, drive: DriveId): Bp {
  const kept = BP_SCALE - suppression(drives, DRIVE_LEVELS[drive]);
  return toBp(mulBp(drives.weights[drive], kept));
}
