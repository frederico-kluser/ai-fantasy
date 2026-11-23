/**
 * Traits and aptitudes (simulation-model §5.6). Traits are bipolar and stable,
 * changed only by crystallization; aptitudes are unipolar.
 */
import { z } from "zod";

import { textSchema, type CatalogInput, type PresetOf } from "./primitives.ts";

/** Ids of the traits: the left column of simulation-model §5.6, then the right one. */
export const TRAIT_IDS = [
  "courage",
  "trustInOthers",
  "temper",
  "sociability",
  "selfControl",
  "empathy",
  "pride",
  "honesty",
  "humor",
  "romanticBoldness",
] as const;

/** Id of a trait. */
export type TraitId = (typeof TRAIT_IDS)[number];

/** Schema of a trait: id and the display names of its negative and positive poles. */
export const traitSchema = z.strictObject({
  id: z.enum(TRAIT_IDS),
  negativePole: textSchema,
  positivePole: textSchema,
});

/** A trait (simulation-model §5.6). */
export type TraitEntry = PresetOf<typeof traitSchema>;

/** The traits of simulation-model §5.6. */
export const TRAITS: CatalogInput<typeof traitSchema> = [
  { id: "courage", negativePole: "medroso", positivePole: "corajoso" },
  { id: "trustInOthers", negativePole: "desconfiado", positivePole: "crédulo" },
  { id: "temper", negativePole: "calmo", positivePole: "explosivo" },
  { id: "sociability", negativePole: "reservado", positivePole: "expansivo" },
  { id: "selfControl", negativePole: "impulsivo", positivePole: "contido" },
  { id: "empathy", negativePole: "frio", positivePole: "empático" },
  { id: "pride", negativePole: "humilde", positivePole: "orgulhoso" },
  { id: "honesty", negativePole: "mentiroso", positivePole: "honesto" },
  { id: "humor", negativePole: "sério", positivePole: "brincalhão" },
  { id: "romanticBoldness", negativePole: "recatado", positivePole: "galanteador" },
];

/** Ids of the aptitudes, in the order of simulation-model §5.6. */
export const APTITUDE_IDS = ["perceptiveness", "eloquence", "memory"] as const;

/** Id of an aptitude. */
export type AptitudeId = (typeof APTITUDE_IDS)[number];

/** Schema of an aptitude: id and display name. */
export const aptitudeSchema = z.strictObject({ id: z.enum(APTITUDE_IDS), name: textSchema });

/** An aptitude (simulation-model §5.6). */
export type AptitudeEntry = PresetOf<typeof aptitudeSchema>;

/** The aptitudes of simulation-model §5.6. */
export const APTITUDES: CatalogInput<typeof aptitudeSchema> = [
  { id: "perceptiveness", name: "perspicácia" },
  { id: "eloquence", name: "eloquência" },
  { id: "memory", name: "memória" },
];
