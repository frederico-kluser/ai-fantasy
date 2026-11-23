/**
 * Presence from the character state (simulation-model §6): who X perceives,
 * how near, and the threat X feels with the others where they stand. A present
 * Y counts only if X sees Y or hears Y's normal voice.
 */
import { effectiveTrait } from "../character/traits.ts";
import { bondToward } from "../character/bonds.ts";
import { perceptionPreview, perceptionToward } from "../character/perception.ts";
import { tagValences, type CharacterState } from "../character/state.ts";
import { toBp, type Bp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import { cellDistance, type Grid } from "../space/grid.ts";
import { earshot } from "../space/hearing.ts";
import { canSee } from "../space/sight.ts";
import type { ScenePlace, TickContext } from "./scene.ts";
import { proximity, threatLevel, type PresenceView } from "./threat.ts";

/** What X perceives of someone at a cell. */
export interface Awareness {
  /** Chebyshev distance, in cells. */
  readonly distance: number;
  /** X sees the cell: in sight range and with a line of sight (simulation-model §3.2). */
  readonly sees: boolean;
  /** X is in reach of a normal voice from that cell (simulation-model §8.2). */
  readonly hears: boolean;
}

/**
 * What an observer at `from` perceives of someone at `to` this tick: distance,
 * sight and hearing of a normal voice coming from `to`.
 *
 * @throws RangeError if a cell is not a cell of the grid.
 */
export function awareness(grid: Grid, now: TickContext, from: number, to: number): Awareness {
  return {
    distance: cellDistance(grid, from, to),
    sees: canSee(grid, from, to, now.vision),
    hears: earshot(grid, { volume: "NORMAL", noise: now.noise }, to, from) === "DIRECT",
  };
}

/** The proximity of someone perceived as `aware` (simulation-model §6). */
export function proximityOf(aware: Awareness): Bp {
  return proximity(aware.distance, aware.sees || aware.hears);
}

/**
 * How `observer` sees `target` at `closeness` (simulation-model §6): the bond
 * axes and the perceived threat (the preview when no signal or act touched it).
 */
export function presenceView(
  observer: CharacterState,
  target: CharacterId,
  closeness: Bp,
): PresenceView {
  const bond = bondToward(observer.bonds, target);
  const trustInOthers = effectiveTrait(observer.traits, observer.tendencies, "trustInOthers");
  const preview = perceptionPreview(bond, trustInOthers);
  const perception = perceptionToward(observer.perceptions, target, preview);
  return {
    fearOf: bond.axes.fearOf,
    resentment: bond.axes.resentment,
    perceivedThreat: perception.perceivedThreat,
    trust: bond.axes.trust,
    affection: bond.axes.affection,
    proximity: closeness,
  };
}

/** The threat of `observer` with the presences given (simulation-model §6). */
export function characterThreat(
  observer: CharacterState,
  place: ScenePlace,
  now: TickContext,
  presences: readonly PresenceView[],
): Bp {
  return threatLevel({
    danger: toBp(place.danger),
    comfort: toBp(place.comfort),
    light: now.light,
    tagValences: tagValences(observer.associations, now.presentTags),
    presences,
  });
}

/**
 * The threat of `observer` among `others` where they stand this tick
 * (simulation-model §6). Pass the others present, not the observer.
 *
 * @example
 * threatAmong(son, [father], grid, place, now);
 */
export function threatAmong(
  observer: CharacterState,
  others: readonly CharacterState[],
  grid: Grid,
  place: ScenePlace,
  now: TickContext,
): Bp {
  const presences = others.map((other) =>
    presenceView(observer, other.id, proximityOf(awareness(grid, now, observer.cell, other.cell))),
  );
  return characterThreat(observer, place, now, presences);
}
