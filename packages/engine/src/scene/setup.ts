/**
 * The setup of a scene (overview §3.2, presets §10.1): the two seeds, the cast
 * input, the place and the grid template, the weather, the start minute, the
 * positions chosen by hand and the player's character. Plain data from outside
 * (the site, the SOM, a recorded session), so it is checked by this schema
 * before anything is drawn.
 */
import { z } from "zod";

import { CAST_MAX } from "../generation/input.ts";
import { PLACE_IDS } from "../presets/places.ts";
import { ASSOCIATION_TAG_IDS } from "../presets/tags.ts";
import { WEATHER_IDS } from "../presets/weathers.ts";
import { MINUTES_PER_DAY } from "../time/clock.ts";

/** 2^32: seeds are below it (simulation-model §15). */
const SEED_LIMIT = 4294967296;

const seedSchema = z.int().min(0).max(SEED_LIMIT - 1);

const cellPosSchema = z.strictObject({ x: z.int(), y: z.int() });

/** Schema of a scene setup; the cast input is checked by `generateCast`. */
export const sceneSetupSchema = z.strictObject({
  seeds: z.strictObject({ castSeed: seedSchema, sceneSeed: seedSchema }),
  /** The input of the cast generator (presets §10.1), checked by the generator. */
  cast: z.unknown(),
  place: z.enum(PLACE_IDS),
  /** The place whose grid template the scene uses; absent, the place's own (presets §2). */
  grid: z.enum(PLACE_IDS).optional(),
  /** The natural tag of the place (presets §2: the `wilderness` tag comes from the premise). */
  naturalTag: z.enum(ASSOCIATION_TAG_IDS).nullable().default(null),
  weather: z.enum(WEATHER_IDS),
  startMinute: z
    .int()
    .min(0)
    .max(MINUTES_PER_DAY - 1),
  /** A cell chosen by hand for each character, by id, or `null` to draw it. */
  positions: z.array(cellPosSchema.nullable()).max(CAST_MAX).default(() => []),
  /** The player's character, or `null` when the player only watches. */
  player: z.int().min(0).nullable().default(null),
  /** Who controls the player's character when the scene opens (simulation-model §11). */
  control: z.enum(["AUTO", "MANUAL"]).default("MANUAL"),
});

/** A scene setup as the caller writes it (defaults may be left out). */
export type SceneSetupData = z.input<typeof sceneSetupSchema>;

/** A scene setup, checked and with every default filled in. */
export type SceneSetup = z.output<typeof sceneSetupSchema>;
