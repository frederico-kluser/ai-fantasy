/**
 * Light and sight range (simulation-model §3.2). The light of the scene comes
 * from the phase of the day, the place and the weather; it sets how far anyone
 * sees. The rules take plain values: reading the place and weather presets is
 * the caller's job.
 */
import { VISION_DARK, VISION_DAY, VISION_DIM } from "../domain/constants.ts";
import { div } from "../domain/math.ts";
import type { DayPhase } from "./clock.ts";

/** The light levels of a scene, from the brightest to the darkest. */
export const LIGHT_LEVELS = ["DAY", "DIM", "DARK"] as const;

/** A light level of the scene. */
export type LightLevel = (typeof LIGHT_LEVELS)[number];

/** What sets the light of a scene (simulation-model §3.2). */
export interface LightInput {
  readonly phase: DayPhase;
  /** The place is lit at night (`lit`, simulation-model §3.1). */
  readonly lit: boolean;
  /** The place has the `dark` tag. */
  readonly dark: boolean;
  /** The weather is `storm` and the place is exposed to it (exposed "yes" or "partial"). */
  readonly stormOverExposed: boolean;
}

/** Step 1: the base light of each phase. */
const PHASE_LIGHT: Readonly<Record<DayPhase, LightLevel>> = {
  DAWN: "DARK",
  MORNING: "DAY",
  AFTERNOON: "DAY",
  EVENING: "DIM",
  LATE_NIGHT: "DARK",
};

/** Steps 3 and 4: one level darker, never past `DARK`. */
const DARKER: Readonly<Record<LightLevel, LightLevel>> = {
  DAY: "DIM",
  DIM: "DARK",
  DARK: "DARK",
};

/** Sight range of each light level, in cells (simulation-model §17). */
const VISION: Readonly<Record<LightLevel, number>> = {
  DAY: VISION_DAY,
  DIM: VISION_DIM,
  DARK: VISION_DARK,
};

/** Fog never leaves anyone blind: the halved range is at least 1 cell. */
const FOG_MIN_RANGE = 1;

/**
 * The light of the scene, recomputed every tick (simulation-model §3.2):
 *
 * 1. base by phase: `MORNING` and `AFTERNOON` → `DAY`; `EVENING` → `DIM`;
 *    `LATE_NIGHT` and `DAWN` → `DARK`;
 * 2. a `lit` place with a `DARK` base → `DIM`;
 * 3. the `dark` tag → one level darker;
 * 4. a storm over an exposed place → one level darker.
 *
 * @example
 * lightLevel({ phase: "LATE_NIGHT", lit: true, dark: false, stormOverExposed: false }); // "DIM"
 */
export function lightLevel(input: LightInput): LightLevel {
  const base = PHASE_LIGHT[input.phase];
  const lit = input.lit && base === "DARK" ? "DIM" : base;
  const tagged = input.dark ? DARKER[lit] : lit;
  return input.stormOverExposed ? DARKER[tagged] : tagged;
}

/**
 * A sight range halved by fog: `max(1, div(range, 2))` (simulation-model §3.2).
 */
export function fogRange(range: number): number {
  return Math.max(FOG_MIN_RANGE, div(range, 2));
}

/**
 * How far anyone sees, in cells: 20 with `DAY`, 8 with `DIM`, 3 with `DARK`,
 * halved (minimum 1) by fog in an exposed place (simulation-model §3.2).
 */
export function visionRange(light: LightLevel, fogOverExposed: boolean): number {
  const range = VISION[light];
  return fogOverExposed ? fogRange(range) : range;
}
