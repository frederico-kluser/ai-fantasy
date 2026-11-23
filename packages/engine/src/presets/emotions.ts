/**
 * Emotions (simulation-model §5.2): unipolar intensities. Baselines and decay
 * are rules of the character module, not data of this catalog.
 */
import { z } from "zod";

import { textSchema, type CatalogInput, type PresetOf } from "./primitives.ts";

/** Ids of the emotions: the left column of simulation-model §5.2, then the right one. */
export const EMOTION_IDS = [
  "joy",
  "sadness",
  "fear",
  "anger",
  "disgust",
  "surprise",
  "shame",
  "guilt",
  "jealousy",
  "boredom",
] as const;

/** Id of an emotion. */
export type EmotionId = (typeof EMOTION_IDS)[number];

/** Schema of an emotion: id and display name. */
export const emotionSchema = z.strictObject({ id: z.enum(EMOTION_IDS), name: textSchema });

/** An emotion (simulation-model §5.2). */
export type EmotionEntry = PresetOf<typeof emotionSchema>;

/** The emotions of simulation-model §5.2. */
export const EMOTIONS: CatalogInput<typeof emotionSchema> = [
  { id: "joy", name: "alegria" },
  { id: "sadness", name: "tristeza" },
  { id: "fear", name: "medo" },
  { id: "anger", name: "raiva" },
  { id: "disgust", name: "nojo" },
  { id: "surprise", name: "surpresa" },
  { id: "shame", name: "vergonha" },
  { id: "guilt", name: "culpa" },
  { id: "jealousy", name: "ciúme" },
  { id: "boredom", name: "tédio" },
];
