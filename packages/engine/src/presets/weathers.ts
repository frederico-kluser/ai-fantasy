/**
 * Weathers (presets §3): the temperature they bring and the extra noise. Their
 * other effects (wanting to leave in the rain, the `storm` tag, darker light,
 * fog halving the sight) are rules of the time, space and context modules.
 */
import { z } from "zod";

import {
  bipolarSchema,
  bpSchema,
  textSchema,
  type CatalogInput,
  type PresetOf,
} from "./primitives.ts";

/** Ids of the weathers, in the order of presets §3. */
export const WEATHER_IDS = [
  "clear",
  "cloudy",
  "rain",
  "storm",
  "snow",
  "heat",
  "cold",
  "fog",
] as const;

/** Id of a weather. */
export type WeatherId = (typeof WEATHER_IDS)[number];

/** Schema of a weather: id, display name, temperature (bipolar) and extra noise. */
export const weatherSchema = z.strictObject({
  id: z.enum(WEATHER_IDS),
  name: textSchema,
  temperature: bipolarSchema,
  extraNoise: bpSchema,
});

/** A weather (presets §3). */
export type WeatherPreset = PresetOf<typeof weatherSchema>;

/** The weathers of presets §3. */
export const WEATHERS: CatalogInput<typeof weatherSchema> = [
  { id: "clear", name: "limpo", temperature: 0, extraNoise: 0 },
  { id: "cloudy", name: "nublado", temperature: -500, extraNoise: 0 },
  { id: "rain", name: "chuva", temperature: -1000, extraNoise: 1500 },
  { id: "storm", name: "tempestade", temperature: -1500, extraNoise: 3000 },
  { id: "snow", name: "neve", temperature: -4000, extraNoise: 0 },
  { id: "heat", name: "calor forte", temperature: 4000, extraNoise: 0 },
  { id: "cold", name: "frio forte", temperature: -3000, extraNoise: 0 },
  { id: "fog", name: "neblina", temperature: -500, extraNoise: 0 },
];
