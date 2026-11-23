/**
 * Bonds (simulation-model §5.4): what A feels for B, directed, with eight
 * unipolar axes and removable labels. A character keeps its bonds in a list
 * sorted by target id; a missing bond reads as a stranger's, every axis at 0.
 */
import { toBp, type Bp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import { BOND_AXIS_IDS, type BondAxisId, type BondLabelId } from "../presets/bonds.ts";

/** The eight axes of a bond (simulation-model §5.4). */
export type BondAxes = { readonly [K in BondAxisId]: Bp };

/**
 * The bond of a character toward `target`. The axes `fearOf` and `closeness`
 * are not the emotion `fear` nor the drive `intimacy`.
 */
export interface Bond {
  readonly target: CharacterId;
  readonly axes: BondAxes;
  /** Labels in the order of the label catalog (reciprocity is kept by the cast generation). */
  readonly labels: readonly BondLabelId[];
}

/** Every axis at 0: how a stranger starts (simulation-model §5.4). */
export const NO_BOND_AXES: BondAxes = Object.fromEntries(
  BOND_AXIS_IDS.map((id): [BondAxisId, Bp] => [id, toBp(0)]),
  // Every axis id has just been given a value.
) as BondAxes;

/** The bond toward `target`, or a stranger's (every axis 0, no labels) when there is none. */
export function bondToward(bonds: readonly Bond[], target: CharacterId): Bond {
  return bonds.find((bond) => bond.target === target) ?? { target, axes: NO_BOND_AXES, labels: [] };
}
