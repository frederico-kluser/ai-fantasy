/**
 * Copies of facts (simulation-model §12): what each character keeps of a fact
 * it perceived, with the perspective, the fidelity and the importance. Which
 * copies an act creates belongs to the acts rules (SOC-01, SOC-03); the loss of
 * fidelity between slices, to the continuity rules (SOC-06).
 */
import { toBp, type Bp } from "../domain/bp.ts";
import { HISTORY_FIDELITY, MEMORY_IMPORTANCE, TOLD_FIDELITY } from "../domain/constants.ts";
import type { CharacterId, FactId } from "../domain/ids.ts";
import { BP_SCALE, mulBp } from "../domain/math.ts";

/** How a character came to know a fact (simulation-model §8.2 and §12). */
export type Perspective = "DIRECT" | "FRAGMENT" | "SEEN" | "TOLD";

/**
 * How a copy is born: perceived (`DIRECT`, `FRAGMENT`, `SEEN`) or told by
 * someone whose own copy had `tellerFidelity`.
 */
export type CopySource =
  | { readonly perspective: Exclude<Perspective, "TOLD"> }
  | { readonly perspective: "TOLD"; readonly tellerFidelity: Bp };

/** A character's copy of a fact (simulation-model §12). */
export interface FactCopy {
  readonly fact: FactId;
  readonly perspective: Perspective;
  /** How faithful the copy is now. */
  readonly fidelity: Bp;
  /** The highest fidelity the copy ever had: retelling the fact brings it back. */
  readonly peakFidelity: Bp;
  /** How much the fact matters to the character (see {@link factImportance}). */
  readonly importance: Bp;
  /**
   * The false version of a believed lie: the same fact with other offenders,
   * sorted by id (`[]` for a denial, the blamed person otherwise). `null` for
   * the true version. Kept in the state, invisible to the character.
   */
  readonly falseOffenders: readonly CharacterId[] | null;
}

/** Initial fidelity of a perceived copy (simulation-model §12, table). */
const PERCEIVED_FIDELITY: Readonly<Record<Exclude<Perspective, "TOLD">, number>> = {
  DIRECT: BP_SCALE,
  FRAGMENT: 5000,
  SEEN: 3000,
};

/** Added to the importance of a fact for its author, a target or its topic (simulation-model §12). */
export const INVOLVED_IMPORTANCE = 3000;

/** Bond deltas count twice in the importance (simulation-model §12). */
const BOND_IMPORTANCE_WEIGHT = 2;

/**
 * The initial fidelity of a copy (simulation-model §12): `DIRECT` 10000,
 * `FRAGMENT` 5000, `SEEN` 3000, `TOLD` `mulBp(teller's fidelity, 8000)`.
 */
export function initialFidelity(source: CopySource): Bp {
  if (source.perspective === "TOLD") {
    return toBp(mulBp(source.tellerFidelity, TOLD_FIDELITY));
  }
  return toBp(PERCEIVED_FIDELITY[source.perspective]);
}

/**
 * A new copy of `fact`, with the initial fidelity of its source as the peak.
 * Pass `falseOffenders` only for the false version of a believed lie.
 */
export function createCopy(
  fact: FactId,
  source: CopySource,
  importance: Bp,
  falseOffenders: readonly CharacterId[] | null = null,
): FactCopy {
  const fidelity = initialFidelity(source);
  return {
    fact,
    perspective: source.perspective,
    fidelity,
    peakFidelity: fidelity,
    importance,
    falseOffenders,
  };
}

/**
 * The copy of a history fact held by who knows it: `DIRECT` with fidelity 8000
 * (simulation-model §12, `HISTORY_FIDELITY`).
 */
export function historyCopy(fact: FactId, importance: Bp): FactCopy {
  const fidelity = toBp(HISTORY_FIDELITY);
  return {
    fact,
    perspective: "DIRECT",
    fidelity,
    peakFidelity: fidelity,
    importance,
    falseOffenders: null,
  };
}

/** The teller's copy after telling the fact again: back to its highest fidelity (simulation-model §12). */
export function retell(copy: FactCopy): FactCopy {
  return { ...copy, fidelity: copy.peakFidelity };
}

/** What a fact did to a character, for its importance. */
export interface ImportanceInput {
  /** The emotion deltas the fact caused (baseline shifts, for history events). */
  readonly emotionDeltas: readonly number[];
  /** The bond deltas the fact caused. */
  readonly bondDeltas: readonly number[];
  /** Whether the character is the author, a target or the topic. */
  readonly involved: boolean;
}

function sumOfMagnitudes(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + Math.abs(value), 0);
}

/**
 * The importance of a fact for a character (simulation-model §12):
 * `clamp(Σ|emotion deltas| + 2 × Σ|bond deltas| + 3000 if involved, 0, 10000)`.
 */
export function factImportance(input: ImportanceInput): Bp {
  const involvement = input.involved ? INVOLVED_IMPORTANCE : 0;
  return toBp(
    sumOfMagnitudes(input.emotionDeltas) +
      BOND_IMPORTANCE_WEIGHT * sumOfMagnitudes(input.bondDeltas) +
      involvement,
  );
}

/** Whether the copy is a lasting memory: importance ≥ 6000 (simulation-model §12, `MEMORY_IMPORTANCE`). */
export function isLasting(copy: FactCopy): boolean {
  return copy.importance >= MEMORY_IMPORTANCE;
}
