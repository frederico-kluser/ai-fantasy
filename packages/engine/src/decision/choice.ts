/**
 * The choice of the act (simulation-model §10 item 4): the 5 best candidates
 * (`TOP_K`; ties by generation order) enter a weighted draw on the `choice`
 * stream, with weights that grow with the lead over the fifth and that self
 * control sharpens or impulsiveness flattens.
 */
import { effectiveTrait } from "../character/traits.ts";
import { BP_MAX } from "../domain/bp.ts";
import { TOP_K } from "../domain/constants.ts";
import { itemAt } from "../domain/lookup.ts";
import type { Drawer } from "../rng/drawer.ts";
import type { DecisionScene } from "./scene.ts";
import { scoreCandidate, type Candidate } from "./utility.ts";

/** A candidate with its utility. */
export interface Scored {
  readonly candidate: Candidate;
  readonly utility: number;
}

/** The chosen act, with the candidates that entered the draw and their weights. */
export interface Choice {
  readonly chosen: Scored;
  /** The 5 best, best first, in the order of the draw. */
  readonly top: readonly Scored[];
  readonly weights: readonly number[];
}

/** Self control from which the choice is more predictable, and below whose negative it is impulsive. */
const CONTROLLED = 3000;
/** What impulsiveness adds to each weight. */
const IMPULSE = 2000;

/**
 * The weights of the best candidates (simulation-model §10 item 4):
 * `w = min(U − U_min5 + 1, 10000)`; with effective `selfControl` ≥ 3000,
 * `w × w`; with `selfControl` ≤ −3000, `w + 2000`. At most 5 × 10000², below 2^31.
 */
export function choiceWeights(utilities: readonly number[], selfControl: number): number[] {
  const floor = Math.min(...utilities);
  return utilities.map((utility) => {
    const lead = Math.min(utility - floor + 1, BP_MAX);
    if (selfControl >= CONTROLLED) {
      return lead * lead;
    }
    return selfControl <= -CONTROLLED ? lead + IMPULSE : lead;
  });
}

/** The 5 best candidates, best first; ties keep the generation order. */
export function bestCandidates(scene: DecisionScene, candidates: readonly Candidate[]): Scored[] {
  return candidates
    .map((candidate) => ({ candidate, utility: scoreCandidate(scene, candidate) }))
    .sort((a, b) => b.utility - a.utility)
    .slice(0, TOP_K);
}

/**
 * Chooses the act of `scene.author` among `candidates` (simulation-model §10
 * item 4): a weighted draw of the 5 best on the `choice` stream, as
 * `ACT_CHOICE` with the author, even with a single candidate.
 *
 * @throws RangeError if there is no candidate (there is always `STAY_SILENT`).
 */
export function chooseAct(
  drawer: Drawer,
  scene: DecisionScene,
  candidates: readonly Candidate[],
): Choice {
  const top = bestCandidates(scene, candidates);
  const { author } = scene;
  const selfControl = effectiveTrait(author.traits, author.tendencies, "selfControl");
  const weights = choiceWeights(
    top.map((scored) => scored.utility),
    selfControl,
  );
  const index = drawer.drawWeighted("choice", weights, "ACT_CHOICE", author.id);
  return { chosen: itemAt(top, index), top, weights };
}
