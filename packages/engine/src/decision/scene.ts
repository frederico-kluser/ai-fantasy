/**
 * The scene as one character's decision sees it (simulation-model §10): the
 * rules, the place, the others present, the record and the obligations, and
 * the geometry the candidates read (who hears the author, who is near).
 */
import type { ActRules } from "../acts/rules.ts";
import type { Obligation } from "../acts/obligations.ts";
import type { RequestObjectRules } from "../acts/request-answers.ts";
import type { OutcomeBand } from "../acts/label.ts";
import type { CharacterState } from "../character/state.ts";
import type { Bp } from "../domain/bp.ts";
import { compareIds, type CharacterId, type FactId } from "../domain/ids.ts";
import type { Fact } from "../memory/fact.ts";
import type { AssociationTagId } from "../presets/tags.ts";
import { cellDistance, type Grid } from "../space/grid.ts";
import { earshot, type Volume } from "../space/hearing.ts";

/** The band drawn for one request obligation (dialogue-acts §8.2), kept until it ends. */
export interface OwedBand {
  /** The fact of the request. */
  readonly fact: FactId;
  readonly debtor: CharacterId;
  readonly band: OutcomeBand;
}

/** What the decision of `author` reads. */
export interface DecisionScene {
  readonly rules: ActRules;
  readonly objects: RequestObjectRules;
  readonly grid: Grid;
  /** The noise, sight range and present tags of the tick (simulation-model §3.2). */
  readonly now: {
    readonly noise: Bp;
    readonly vision: number;
    readonly presentTags: readonly AssociationTagId[];
  };
  /** The character who decides, in `AUTO`. */
  readonly author: CharacterState;
  /** The others present (those leaving included), in any order. */
  readonly others: readonly CharacterState[];
  /** The record, in increasing id order. */
  readonly facts: readonly Fact[];
  /** The id of the first fact of this slice. */
  readonly sliceStart: number;
  /** The obligations pending in the scene. */
  readonly obligations: readonly Obligation[];
  /** The bands drawn for request obligations (see `owedBands`). */
  readonly bands: readonly OwedBand[];
}

/** The others present, sorted by increasing id. */
export function othersById(scene: DecisionScene): CharacterState[] {
  return [...scene.others].sort((a, b) => compareIds(a.id, b.id));
}

/** The ids of the others present, sorted. */
export function otherIds(scene: DecisionScene): CharacterId[] {
  return othersById(scene).map((other) => other.id);
}

/** Whether `other` hears the author as `DIRECT` at `volume`. */
export function hearsAt(scene: DecisionScene, other: CharacterState, volume: Volume): boolean {
  const voice = { volume, noise: scene.now.noise };
  return earshot(scene.grid, voice, scene.author.cell, other.cell) === "DIRECT";
}

/**
 * The volume at which `other` hears the author as `DIRECT` (simulation-model
 * §10): `NORMAL`, or `SHOUT` if only so; `null` when not even a shout reaches.
 */
export function reachVolume(scene: DecisionScene, other: CharacterState): Volume | null {
  if (hearsAt(scene, other, "NORMAL")) {
    return "NORMAL";
  }
  return hearsAt(scene, other, "SHOUT") ? "SHOUT" : null;
}

/** The listeners of an act for the `GROUP`: those who hear the author as `DIRECT` at `NORMAL`, by id. */
export function groupListeners(scene: DecisionScene): CharacterState[] {
  return othersById(scene).filter((other) => hearsAt(scene, other, "NORMAL"));
}

/** The Chebyshev distance from the author to `other`, in cells. */
export function distanceTo(scene: DecisionScene, other: CharacterState): number {
  return cellDistance(scene.grid, scene.author.cell, other.cell);
}

/** The other present with id `id`, if any. */
export function presentOther(scene: DecisionScene, id: CharacterId): CharacterState | undefined {
  return scene.others.find((other) => other.id === id);
}
