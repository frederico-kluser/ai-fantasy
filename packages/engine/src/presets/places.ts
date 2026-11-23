/**
 * Places (presets §2): generic settings (a "social interior" serves a tavern,
 * a bar or a starship canteen) with their properties in bp, whether they are
 * lit at night, default tags, exposure to the weather and default grid.
 */
import { z } from "zod";

import { gridTemplateSchema } from "./grid.ts";
import {
  DANGEROUS_PLACE_GRID,
  HOME_GRID,
  MAKESHIFT_SHELTER_GRID,
  MARKET_GRID,
  PUBLIC_SQUARE_GRID,
  SOCIAL_INTERIOR_GRID,
  SOLEMN_PLACE_GRID,
  VEHICLE_GRID,
  WILDERNESS_GRID,
  WORKPLACE_GRID,
} from "./grids.ts";
import {
  bipolarSchema,
  bpSchema,
  reportIssues,
  textListSchema,
  textSchema,
  uniqueList,
  type CatalogInput,
  type PresetOf,
} from "./primitives.ts";
import { ASSOCIATION_TAG_IDS } from "./tags.ts";

/** Ids of the places, in the order of presets §2. */
export const PLACE_IDS = [
  "home",
  "social_interior",
  "workplace",
  "market",
  "public_square",
  "wilderness",
  "dangerous_place",
  "solemn_place",
  "vehicle",
  "makeshift_shelter",
] as const;

/** Id of a place. */
export type PlaceId = (typeof PLACE_IDS)[number];

type Roofed = string | readonly string[];

function isPartialMask(roofed: Roofed): boolean {
  if (typeof roofed === "string") {
    return false;
  }
  return roofed.some((row) => row.includes("r")) && roofed.some((row) => row.includes("."));
}

/** Exposure to the weather → the roofing it requires (presets §2 and §2.1). */
const EXPOSURE_ROOFING: Readonly<
  Record<"NONE" | "PARTIAL" | "FULL", { fits: (roofed: Roofed) => boolean; message: string }>
> = {
  NONE: {
    fits: (roofed) => roofed === "ALL",
    message: 'a place not exposed to the weather has roofed "ALL"',
  },
  PARTIAL: {
    fits: isPartialMask,
    message: "a partly exposed place has a mask with roofed and open cells",
  },
  FULL: {
    fits: (roofed) => roofed === "NONE",
    message: 'a place exposed to the weather has roofed "NONE"',
  },
};

/**
 * Schema of a place: properties in bp (`danger`, `comfort`, `privacy`,
 * `noise`), `baseTemperature` (bipolar; "clima" in the table is 0), `lit`,
 * default `tags`, `exposure` to the weather and the default `grid`.
 */
export const placeSchema = z
  .strictObject({
    id: z.enum(PLACE_IDS),
    name: textSchema,
    examples: textListSchema,
    danger: bpSchema,
    comfort: bpSchema,
    privacy: bpSchema,
    noise: bpSchema,
    baseTemperature: bipolarSchema,
    lit: z.boolean(),
    tags: uniqueList(z.enum(ASSOCIATION_TAG_IDS)),
    exposure: z.enum(["NONE", "PARTIAL", "FULL"]),
    grid: gridTemplateSchema,
  })
  .superRefine((place, context) => {
    const roofing = EXPOSURE_ROOFING[place.exposure];
    const issue = { path: ["grid", "roofed"], message: roofing.message };
    reportIssues(context, roofing.fits(place.grid.roofed) ? [] : [issue]);
  });

/** A place (presets §2). */
export type PlacePreset = PresetOf<typeof placeSchema>;

/** The places of presets §2. */
export const PLACES: CatalogInput<typeof placeSchema> = [
  {
    id: "home",
    name: "lar",
    examples: ["casa", "quarto", "cabana", "apartamento"],
    danger: 500,
    comfort: 8000,
    privacy: 8000,
    noise: 1000,
    baseTemperature: 1000,
    lit: true,
    tags: ["enclosed"],
    exposure: "NONE",
    grid: HOME_GRID,
  },
  {
    id: "social_interior",
    name: "interior social",
    examples: ["taverna", "bar", "café", "salão"],
    danger: 2000,
    comfort: 6000,
    privacy: 2000,
    noise: 5000,
    baseTemperature: 1500,
    lit: true,
    tags: ["crowd", "enclosed"],
    exposure: "NONE",
    grid: SOCIAL_INTERIOR_GRID,
  },
  {
    id: "workplace",
    name: "local de trabalho",
    examples: ["oficina", "ferraria", "escritório", "laboratório"],
    danger: 1500,
    comfort: 4000,
    privacy: 4000,
    noise: 4000,
    baseTemperature: 0,
    lit: true,
    tags: [],
    exposure: "NONE",
    grid: WORKPLACE_GRID,
  },
  {
    id: "market",
    name: "comércio",
    examples: ["mercado", "feira", "loja"],
    danger: 2000,
    comfort: 4000,
    privacy: 1000,
    noise: 6000,
    baseTemperature: 0,
    lit: false,
    tags: ["crowd"],
    exposure: "PARTIAL",
    grid: MARKET_GRID,
  },
  {
    id: "public_square",
    name: "espaço público",
    examples: ["praça", "rua", "estação"],
    danger: 2500,
    comfort: 3000,
    privacy: 500,
    noise: 5000,
    baseTemperature: 0,
    lit: false,
    tags: ["crowd"],
    exposure: "FULL",
    grid: PUBLIC_SQUARE_GRID,
  },
  {
    id: "wilderness",
    name: "ermo natural",
    examples: ["floresta", "campo", "montanha", "praia"],
    danger: 4000,
    comfort: 3000,
    privacy: 7000,
    noise: 1000,
    baseTemperature: 0,
    lit: false,
    tags: [],
    exposure: "FULL",
    grid: WILDERNESS_GRID,
  },
  {
    id: "dangerous_place",
    name: "lugar perigoso",
    examples: ["beco", "ruína", "esconderijo", "zona de guerra"],
    danger: 7000,
    comfort: 1000,
    privacy: 6000,
    noise: 2000,
    baseTemperature: 0,
    lit: false,
    tags: ["dark"],
    exposure: "PARTIAL",
    grid: DANGEROUS_PLACE_GRID,
  },
  {
    id: "solemn_place",
    name: "lugar solene",
    examples: ["templo", "tribunal", "hospital", "velório"],
    danger: 1000,
    comfort: 4000,
    privacy: 3000,
    noise: 1000,
    baseTemperature: 0,
    lit: true,
    tags: ["enclosed", "sacred"],
    exposure: "NONE",
    grid: SOLEMN_PLACE_GRID,
  },
  {
    id: "vehicle",
    name: "transporte",
    examples: ["carroça", "carro", "trem", "barco", "nave"],
    danger: 3000,
    comfort: 4000,
    privacy: 5000,
    noise: 4000,
    baseTemperature: 0,
    lit: true,
    tags: ["enclosed"],
    exposure: "PARTIAL",
    grid: VEHICLE_GRID,
  },
  {
    id: "makeshift_shelter",
    name: "abrigo precário",
    examples: ["acampamento", "cela", "trincheira", "barraca"],
    danger: 5000,
    comfort: 2000,
    privacy: 4000,
    noise: 2000,
    baseTemperature: 0,
    lit: false,
    tags: [],
    exposure: "FULL",
    grid: MAKESHIFT_SHELTER_GRID,
  },
];
