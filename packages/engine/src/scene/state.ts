/**
 * The state of a scene (overview §3.2, simulation-model §15 and §16): the
 * world, which does not change during the slice, and the dynamic state, which
 * only `step` changes. Immutable plain data: every step returns a new state.
 *
 * The hash of a step covers only the dynamic state (characters, facts,
 * obligations, bands, turns, control, movement, the awaited player, tick, rng,
 * draw mode, forced draws, end). The world (presets, grid, place, weather,
 * clock, who the player is) goes once into the session header with its own
 * hash. No free text is held anywhere in the state (invariant 3): names and
 * the premise live in the presentation record.
 */
import type { Obligation } from "../acts/obligations.ts";
import type { CharacterState } from "../character/state.ts";
import type { SceneContext } from "../context/scene.ts";
import type { OwedBand } from "../decision/scene.ts";
import type { Bp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import type { Fact } from "../memory/fact.ts";
import type { Presets } from "../presets/catalogs.ts";
import type { DrawMode, ForcedDraw } from "../rng/drawer.ts";
import type { RngState } from "../rng/state.ts";
import { hashState } from "../session/hash.ts";
import type { MoveGoal } from "../space/movement.ts";
import type { SliceEnd } from "../turns/end.ts";
import type { TurnState } from "../turns/state.ts";

/** What does not change during a slice. */
export interface SceneWorld {
  /** The loaded presets the rules read. */
  readonly presets: Presets;
  /** The grid, the place, the weather and the start minute. */
  readonly scene: SceneContext;
  /** The privacy of the place (presets §2), read by the humiliation of a request. */
  readonly privacy: Bp;
  /** The player's character, or `null` when the player only watches. */
  readonly player: CharacterId | null;
  /** The id of the first fact of this slice: facts below it come from the history. */
  readonly sliceStart: number;
}

/** A character walking toward a goal (simulation-model §8.1), with the effort spent. */
export interface Walker {
  readonly id: CharacterId;
  readonly goal: MoveGoal;
  /** Ticks of effort already spent toward the next cell (see `moveTick`). */
  readonly progress: number;
}

/** The player in `MANUAL` whose act the engine waits for (simulation-model §16 step 4). */
export interface Awaiting {
  readonly player: CharacterId;
  /** Whether its act will interrupt an obligation of the last act (simulation-model §11 item 4). */
  readonly interruption: boolean;
}

/** The state of a scene. */
export interface SceneState {
  /** Out of the step hash: it goes into the session header (see {@link worldHash}). */
  readonly world: SceneWorld;
  /** The tick of the next decision point, counted from the start of the slice. */
  readonly tick: number;
  /** The characters present, sorted by id (those who left are gone). */
  readonly characters: readonly CharacterState[];
  /** The record, in increasing id order: the history first, then the acts of the slice. */
  readonly facts: readonly Fact[];
  readonly obligations: readonly Obligation[];
  /** The bands drawn for the requests owed (dialogue-acts §8.2), kept until each obligation ends. */
  readonly bands: readonly OwedBand[];
  readonly turns: TurnState;
  /** Who controls the player's character; NPCs are always `AUTO`. */
  readonly control: "AUTO" | "MANUAL";
  /** The characters with a movement goal, sorted by id. */
  readonly walkers: readonly Walker[];
  /** The player awaited, or `null`. */
  readonly awaiting: Awaiting | null;
  readonly rng: RngState;
  readonly drawMode: DrawMode;
  /** The forced draws, the most recent first (simulation-model §15). */
  readonly forced: readonly ForcedDraw[];
  /** Why the slice ended, or `null` while it goes on. */
  readonly ended: SliceEnd | null;
}

/** The dynamic state: everything but the world. */
export type SceneDynamic = Omit<SceneState, "world">;

/** The dynamic part of a scene state, the part the step hash covers. */
export function dynamicOf(state: SceneState): SceneDynamic {
  const { world: _world, ...dynamic } = state;
  return dynamic;
}

/**
 * The hash of a scene after a step (simulation-model §15): FNV-1a 64 of the
 * canonical dynamic state. Equal dynamic states give equal hashes.
 *
 * @example
 * const before = sceneHash(state);
 */
export function sceneHash(state: SceneState): string {
  return hashState(dynamicOf(state));
}

/** The hash of the world of a scene, for the session header. */
export function worldHash(world: SceneWorld): string {
  return hashState(world);
}
