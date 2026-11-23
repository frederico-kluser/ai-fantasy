/**
 * Association tags (presets §8): marks of places and scenes that fears and
 * attachments refer to (simulation-model §5.7). Their order matters: the cast
 * generation draws a tag uniformly by its index.
 */
import { z } from "zod";

import { textSchema, type CatalogInput, type PresetOf } from "./primitives.ts";

/** Ids of the association tags, in the order of presets §8. */
export const ASSOCIATION_TAG_IDS = [
  "forest",
  "water",
  "dark",
  "heights",
  "crowd",
  "enclosed",
  "storm",
  "fire",
  "animals",
  "sacred",
] as const;

/** Id of an association tag. */
export type AssociationTagId = (typeof ASSOCIATION_TAG_IDS)[number];

/** Schema of an association tag: id and display name. */
export const associationTagSchema = z.strictObject({
  id: z.enum(ASSOCIATION_TAG_IDS),
  name: textSchema,
});

/** An association tag (presets §8). */
export type AssociationTag = PresetOf<typeof associationTagSchema>;

/** The association tags of presets §8. */
export const ASSOCIATION_TAGS: CatalogInput<typeof associationTagSchema> = [
  { id: "forest", name: "floresta" },
  { id: "water", name: "água" },
  { id: "dark", name: "escuro" },
  { id: "heights", name: "altura" },
  { id: "crowd", name: "multidão" },
  { id: "enclosed", name: "lugar fechado" },
  { id: "storm", name: "tempestade" },
  { id: "fire", name: "fogo" },
  { id: "animals", name: "animais" },
  { id: "sacred", name: "sagrado" },
];
