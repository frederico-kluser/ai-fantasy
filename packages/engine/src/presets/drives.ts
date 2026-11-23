/**
 * Drives, the needs of Maslow's pyramid (simulation-model §5.3): each one has
 * a level (1 physiological … 5 self-actualization) and is either undirected
 * (one deficit) or directed (one deficit per known person).
 */
import { z } from "zod";

import { textSchema, type CatalogInput, type PresetOf } from "./primitives.ts";

/** Ids of the drives, in the order of simulation-model §5.3. */
export const DRIVE_IDS = [
  "physical_relief",
  "physical_safety",
  "material_security",
  "predictability",
  "company",
  "intimacy",
  "desire",
  "care",
  "recognition",
  "dignity",
  "influence",
  "curiosity",
  "purpose",
  "fun",
  "justice",
] as const;

/** Id of a drive. */
export type DriveId = (typeof DRIVE_IDS)[number];

/** Schema of a drive: id, display name, Maslow level and whether it is directed. */
export const driveSchema = z.strictObject({
  id: z.enum(DRIVE_IDS),
  name: textSchema,
  level: z.literal([1, 2, 3, 4, 5]),
  directed: z.boolean(),
});

/** A drive (simulation-model §5.3). */
export type DriveEntry = PresetOf<typeof driveSchema>;

/** The drives of simulation-model §5.3. */
export const DRIVES: CatalogInput<typeof driveSchema> = [
  { id: "physical_relief", name: "alívio físico", level: 1, directed: false },
  { id: "physical_safety", name: "segurança física", level: 2, directed: false },
  { id: "material_security", name: "segurança material", level: 2, directed: false },
  { id: "predictability", name: "previsibilidade", level: 2, directed: false },
  { id: "company", name: "companhia", level: 3, directed: false },
  { id: "intimacy", name: "intimidade", level: 3, directed: true },
  { id: "desire", name: "desejo", level: 3, directed: true },
  { id: "care", name: "cuidado", level: 3, directed: true },
  { id: "recognition", name: "reconhecimento", level: 4, directed: false },
  { id: "dignity", name: "dignidade", level: 4, directed: false },
  { id: "influence", name: "influência", level: 4, directed: false },
  { id: "curiosity", name: "curiosidade", level: 5, directed: false },
  { id: "purpose", name: "propósito", level: 5, directed: false },
  { id: "fun", name: "diversão", level: 5, directed: false },
  { id: "justice", name: "justiça, inclui vingança", level: 5, directed: true },
];
