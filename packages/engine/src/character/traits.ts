/**
 * Traits and aptitudes of a character (simulation-model §5.6), and the
 * effective trait every rule reads (simulation-model §13 item 3): the trait
 * colored by the recent tendency.
 */
import { toBipolarBp, type BipolarBp, type Bp } from "../domain/bp.ts";
import { TENDENCY_WEIGHT } from "../domain/constants.ts";
import { mulBp } from "../domain/math.ts";
import type { AptitudeId, TraitId } from "../presets/traits.ts";

/** The ten bipolar traits of a character (simulation-model §5.6). */
export type Traits = { readonly [K in TraitId]: BipolarBp };

/** The three unipolar aptitudes of a character (simulation-model §5.6). */
export type Aptitudes = { readonly [K in AptitudeId]: Bp };

/**
 * The trait every rule uses (simulation-model §13 item 3):
 * `clamp(trait + mulBp(tendency, 3000), −10000, 10000)`.
 *
 * @example
 * effectiveTrait(traits, tendencies, "temper");
 */
export function effectiveTrait(traits: Traits, tendencies: Traits, id: TraitId): BipolarBp {
  return toBipolarBp(traits[id] + mulBp(tendencies[id], TENDENCY_WEIGHT));
}
