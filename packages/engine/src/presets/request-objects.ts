/**
 * Objects of `REQUEST` and `OFFER` (dialogue-acts §4): what is asked for or
 * offered, with the drive it touches in who receives it and in who gives it.
 */
import { z } from "zod";

import { DRIVE_IDS } from "./drives.ts";
import { textSchema, type CatalogInput, type PresetOf } from "./primitives.ts";

/** Ids of the request objects, in the order of dialogue-acts §4. */
export const REQUEST_OBJECT_IDS = [
  "HELP",
  "INFORMATION",
  "ITEM",
  "MONEY",
  "COMPANY",
  "FAVOR",
  "PROMISE",
  "SECRECY",
  "DATE",
] as const;

/** Id of a request object. */
export type RequestObjectId = (typeof REQUEST_OBJECT_IDS)[number];

/** Schema of a request object: display name and the drives of who receives and who gives. */
export const requestObjectSchema = z.strictObject({
  id: z.enum(REQUEST_OBJECT_IDS),
  name: textSchema,
  receiverDrive: z.enum(DRIVE_IDS),
  giverDrive: z.enum(DRIVE_IDS),
});

/** A request object (dialogue-acts §4). */
export type RequestObjectEntry = PresetOf<typeof requestObjectSchema>;

/** The request objects of dialogue-acts §4. */
export const REQUEST_OBJECTS: CatalogInput<typeof requestObjectSchema> = [
  { id: "HELP", name: "ajuda", receiverDrive: "physical_safety", giverDrive: "care" },
  { id: "INFORMATION", name: "informação", receiverDrive: "curiosity", giverDrive: "influence" },
  { id: "ITEM", name: "objeto", receiverDrive: "material_security", giverDrive: "care" },
  { id: "MONEY", name: "dinheiro", receiverDrive: "material_security", giverDrive: "influence" },
  { id: "COMPANY", name: "companhia", receiverDrive: "company", giverDrive: "company" },
  { id: "FAVOR", name: "favor", receiverDrive: "purpose", giverDrive: "influence" },
  { id: "PROMISE", name: "promessa", receiverDrive: "predictability", giverDrive: "intimacy" },
  { id: "SECRECY", name: "guardar segredo", receiverDrive: "dignity", giverDrive: "intimacy" },
  { id: "DATE", name: "encontro", receiverDrive: "desire", giverDrive: "desire" },
];
