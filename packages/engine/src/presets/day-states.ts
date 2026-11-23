/**
 * Day states (presets §9): how a character arrives at the scene. Opening values
 * of the body and of the emotions, drawn in the `setup` stream; they do not
 * change the baselines. Needs a state does not name follow `rested`, the
 * default state.
 */
import { z } from "zod";

import { BODY_NEED_IDS } from "./body.ts";
import { EMOTION_IDS } from "./emotions.ts";
import {
  bipolarRangeSchema,
  bpRangeSchema,
  textSchema,
  type CatalogInput,
  type PresetOf,
} from "./primitives.ts";

/** Ids of the day states, in the order of presets §9. */
export const DAY_STATE_IDS = [
  "rested",
  "tired",
  "hungry",
  "hungover",
  "needs_bathroom",
  "cheerful",
  "shaken",
] as const;

/** Id of a day state. */
export type DayStateId = (typeof DAY_STATE_IDS)[number];

/**
 * Schema of a day state: opening ranges of body needs (`body`; bipolar bounds,
 * since `thermal` is bipolar) and of emotions (`emotions`).
 */
export const dayStateSchema = z.strictObject({
  id: z.enum(DAY_STATE_IDS),
  name: textSchema,
  body: z.partialRecord(z.enum(BODY_NEED_IDS), bipolarRangeSchema).default(() => ({})),
  emotions: z.partialRecord(z.enum(EMOTION_IDS), bpRangeSchema).default(() => ({})),
});

/** A day state (presets §9). */
export type DayState = PresetOf<typeof dayStateSchema>;

const RESTED_NEED = { min: 0, max: 2000 };

/** The day states of presets §9. */
export const DAY_STATES: CatalogInput<typeof dayStateSchema> = [
  {
    id: "rested",
    name: "descansado",
    body: {
      fatigue: RESTED_NEED,
      hunger: RESTED_NEED,
      thirst: RESTED_NEED,
      bladder: RESTED_NEED,
      pain: RESTED_NEED,
      intoxication: RESTED_NEED,
      thermal: { min: 0, max: 0 },
    },
  },
  { id: "tired", name: "cansado", body: { fatigue: { min: 6000, max: 7500 } } },
  { id: "hungry", name: "com fome", body: { hunger: { min: 6000, max: 8000 } } },
  {
    id: "hungover",
    name: "de ressaca",
    body: {
      fatigue: { min: 5000, max: 5000 },
      pain: { min: 2000, max: 2000 },
      intoxication: { min: 2000, max: 2000 },
    },
  },
  { id: "needs_bathroom", name: "apertado", body: { bladder: { min: 6500, max: 8000 } } },
  { id: "cheerful", name: "bem-humorado", emotions: { joy: { min: 4000, max: 4000 } } },
  {
    id: "shaken",
    name: "abalado",
    emotions: { fear: { min: 3000, max: 3000 }, sadness: { min: 3000, max: 3000 } },
  },
];
