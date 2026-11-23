/**
 * The scene as the rules of a tick see it (simulation-model §3.2, §5.7 and §6):
 * the place and the weather as plain values, and what follows from them at a
 * given tick — phase of the day, light, sight range, noise and present tags —
 * plus the thermal target of a cell. Reading the presets is the caller's job.
 */
import { toBipolarBp, toBp, type BipolarBp, type Bp } from "../domain/bp.ts";
import { ROOFED_WEATHER_SHARE } from "../domain/constants.ts";
import { BP_SCALE, mulBp } from "../domain/math.ts";
import type { PlacePreset } from "../presets/places.ts";
import { ASSOCIATION_TAG_IDS, type AssociationTagId } from "../presets/tags.ts";
import type { WeatherId } from "../presets/weathers.ts";
import type { Grid } from "../space/grid.ts";
import { dayPhase, minuteOfDay, type DayPhase } from "../time/clock.ts";
import { lightLevel, visionRange, type LightLevel } from "../time/light.ts";

/** The place of the scene: the fields of a place preset the rules read (presets §2). */
export interface ScenePlace {
  readonly danger: number;
  readonly comfort: number;
  readonly noise: number;
  readonly baseTemperature: number;
  readonly lit: boolean;
  readonly tags: readonly AssociationTagId[];
  readonly exposure: PlacePreset["exposure"];
}

/** The weather of the scene: the fields of a weather preset the rules read (presets §3). */
export interface SceneWeather {
  readonly id: WeatherId;
  readonly temperature: number;
  readonly extraNoise: number;
}

/** What does not change during a slice: the grid, the place, the weather and the start minute. */
export interface SceneContext {
  readonly grid: Grid;
  readonly place: ScenePlace;
  readonly weather: SceneWeather;
  /** The minute of the day when the slice began (simulation-model §2). */
  readonly startMinute: number;
}

/** What the scene is at one tick (simulation-model §3.2 and §16 step 6.4). */
export interface TickContext {
  readonly phase: DayPhase;
  readonly light: LightLevel;
  /** The sight range, in cells. */
  readonly vision: number;
  /** Noise of the place plus the weather, limited to `0..10000` (simulation-model §6). */
  readonly noise: Bp;
  /** The tags present, in catalog order (see {@link presentTags}). */
  readonly presentTags: readonly AssociationTagId[];
}

/**
 * The thermal target of a cell (simulation-model §3.2):
 * `baseTemperature + mulBp(weather temperature, roofed ? 2500 : 10000)`, on the
 * bipolar scale.
 */
export function thermalTarget(
  baseTemperature: number,
  weatherTemperature: number,
  roofed: boolean,
): BipolarBp {
  return toBipolarBp(
    baseTemperature + mulBp(weatherTemperature, roofed ? ROOFED_WEATHER_SHARE : BP_SCALE),
  );
}

/**
 * The tags present in the scene (simulation-model §5.7): the place tags, plus
 * `storm` in a storm and `dark` with `DARK` light, once each, in catalog order.
 */
export function presentTags(
  placeTags: readonly AssociationTagId[],
  weather: WeatherId,
  light: LightLevel,
): AssociationTagId[] {
  const present = new Set(placeTags);
  if (weather === "storm") {
    present.add("storm");
  }
  if (light === "DARK") {
    present.add("dark");
  }
  return ASSOCIATION_TAG_IDS.filter((tag) => present.has(tag));
}

/** Noise of the place plus the weather, limited to `0..10000` (simulation-model §6). */
export function sceneNoise(placeNoise: number, weatherNoise: number): Bp {
  return toBp(placeNoise + weatherNoise);
}

/**
 * The scene at `tick` ticks after the start of the slice (simulation-model §3.2):
 * phase by the clock, light by phase, place and weather (a storm darkens an
 * exposed place), sight range (fog halves it in an exposed place), noise and
 * present tags.
 *
 * @example
 * const now = tickContext(scene, tick);
 */
export function tickContext(scene: SceneContext, tick: number): TickContext {
  const { place, weather } = scene;
  const exposed = place.exposure !== "NONE";
  const phase = dayPhase(minuteOfDay(scene.startMinute, tick));
  const light = lightLevel({
    phase,
    lit: place.lit,
    dark: place.tags.includes("dark"),
    stormOverExposed: exposed && weather.id === "storm",
  });
  return {
    phase,
    light,
    vision: visionRange(light, exposed && weather.id === "fog"),
    noise: sceneNoise(place.noise, weather.extraNoise),
    presentTags: presentTags(place.tags, weather.id, light),
  };
}
