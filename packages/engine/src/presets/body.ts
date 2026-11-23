/**
 * Body needs (simulation-model §5.1): unipolar (0 = fine; 10000 = critical),
 * except the thermal need, which is bipolar (cold − ↔ heat +). The rates per
 * tick are rules of the character module, not data of this catalog.
 */
import { z } from "zod";

import { textSchema, type CatalogInput, type PresetOf } from "./primitives.ts";

/** Ids of the body needs, in the order of simulation-model §5.1. */
export const BODY_NEED_IDS = [
  "fatigue",
  "hunger",
  "thirst",
  "bladder",
  "pain",
  "thermal",
  "intoxication",
] as const;

/** Id of a body need. */
export type BodyNeedId = (typeof BODY_NEED_IDS)[number];

/** Schema of a body need: id, display name and scale. */
export const bodyNeedSchema = z.strictObject({
  id: z.enum(BODY_NEED_IDS),
  name: textSchema,
  scale: z.enum(["UNIPOLAR", "BIPOLAR"]),
});

/** A body need (simulation-model §5.1). */
export type BodyNeedEntry = PresetOf<typeof bodyNeedSchema>;

/** The body needs of simulation-model §5.1. */
export const BODY_NEEDS: CatalogInput<typeof bodyNeedSchema> = [
  { id: "fatigue", name: "cansaço", scale: "UNIPOLAR" },
  { id: "hunger", name: "fome", scale: "UNIPOLAR" },
  { id: "thirst", name: "sede", scale: "UNIPOLAR" },
  { id: "bladder", name: "necessidade fisiológica", scale: "UNIPOLAR" },
  { id: "pain", name: "dor", scale: "UNIPOLAR" },
  { id: "thermal", name: "frio (−) ↔ calor (+)", scale: "BIPOLAR" },
  { id: "intoxication", name: "alteração (álcool, febre…)", scale: "UNIPOLAR" },
];
