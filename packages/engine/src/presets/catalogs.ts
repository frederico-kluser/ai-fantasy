/**
 * The preset catalogs as one set (presets §1): the schema of the whole set, the
 * ids each catalog must hold and the default data of the engine.
 */
import { z } from "zod";

import { ACT_IDS, ACTS, actSchema } from "./acts.ts";
import { BODY_NEED_IDS, BODY_NEEDS, bodyNeedSchema } from "./body.ts";
import { BOND_ARCHETYPE_IDS, BOND_ARCHETYPES, bondArchetypeSchema } from "./bond-archetypes.ts";
import {
  BOND_AXES,
  BOND_AXIS_IDS,
  BOND_LABEL_IDS,
  BOND_LABELS,
  bondAxisSchema,
  bondLabelSchema,
} from "./bonds.ts";
import {
  CHARACTER_ARCHETYPE_IDS,
  CHARACTER_ARCHETYPES,
  characterArchetypeSchema,
} from "./character-archetypes.ts";
import { DAY_STATE_IDS, DAY_STATES, dayStateSchema } from "./day-states.ts";
import { DRIVE_IDS, DRIVES, driveSchema } from "./drives.ts";
import { EMOTION_IDS, EMOTIONS, emotionSchema } from "./emotions.ts";
import type { CatalogName } from "./errors.ts";
import { HISTORY_EVENT_IDS, HISTORY_EVENTS, historyEventSchema } from "./history-events.ts";
import { PLACE_IDS, PLACES, placeSchema } from "./places.ts";
import type { DeepReadonly } from "./primitives.ts";
import { REQUEST_OBJECT_IDS, REQUEST_OBJECTS, requestObjectSchema } from "./request-objects.ts";
import { SIGNAL_IDS, SIGNALS, signalSchema } from "./signals.ts";
import { ASSOCIATION_TAG_IDS, ASSOCIATION_TAGS, associationTagSchema } from "./tags.ts";
import { TONE_IDS, TONES, toneSchema } from "./tones.ts";
import { TOPIC_TYPE_IDS, TOPIC_TYPES, topicTypeSchema } from "./topics.ts";
import {
  APTITUDE_IDS,
  APTITUDES,
  aptitudeSchema,
  TRAIT_IDS,
  TRAITS,
  traitSchema,
} from "./traits.ts";
import { WEATHER_IDS, WEATHERS, weatherSchema } from "./weathers.ts";

export { CATALOG_NAMES, type CatalogName } from "./errors.ts";

/**
 * Schema of the set of catalogs: one list per catalog, every preset checked by
 * the schema of its catalog. A missing or unknown catalog is an error.
 */
export const catalogsSchema = z.strictObject({
  bodyNeeds: z.array(bodyNeedSchema),
  emotions: z.array(emotionSchema),
  drives: z.array(driveSchema),
  bondAxes: z.array(bondAxisSchema),
  bondLabels: z.array(bondLabelSchema),
  traits: z.array(traitSchema),
  aptitudes: z.array(aptitudeSchema),
  signals: z.array(signalSchema),
  places: z.array(placeSchema),
  weathers: z.array(weatherSchema),
  associationTags: z.array(associationTagSchema),
  characterArchetypes: z.array(characterArchetypeSchema),
  bondArchetypes: z.array(bondArchetypeSchema),
  historyEvents: z.array(historyEventSchema),
  dayStates: z.array(dayStateSchema),
  acts: z.array(actSchema),
  tones: z.array(toneSchema),
  topicTypes: z.array(topicTypeSchema),
  requestObjects: z.array(requestObjectSchema),
});

/** The ids each catalog holds, once each and in this order (presets §1 rule 2: ids never change). */
export const CATALOG_IDS: Readonly<Record<CatalogName, readonly string[]>> = {
  bodyNeeds: BODY_NEED_IDS,
  emotions: EMOTION_IDS,
  drives: DRIVE_IDS,
  bondAxes: BOND_AXIS_IDS,
  bondLabels: BOND_LABEL_IDS,
  traits: TRAIT_IDS,
  aptitudes: APTITUDE_IDS,
  signals: SIGNAL_IDS,
  places: PLACE_IDS,
  weathers: WEATHER_IDS,
  associationTags: ASSOCIATION_TAG_IDS,
  characterArchetypes: CHARACTER_ARCHETYPE_IDS,
  bondArchetypes: BOND_ARCHETYPE_IDS,
  historyEvents: HISTORY_EVENT_IDS,
  dayStates: DAY_STATE_IDS,
  acts: ACT_IDS,
  tones: TONE_IDS,
  topicTypes: TOPIC_TYPE_IDS,
  requestObjects: REQUEST_OBJECT_IDS,
};

/** The catalogs as written in the code, before validation (defaults may be left out). */
export type PresetCatalogs = DeepReadonly<z.input<typeof catalogsSchema>>;

/**
 * The loaded presets: every catalog validated, with defaults filled in and
 * bp values typed as `Bp` or `BipolarBp`. Read-only.
 */
export type Presets = DeepReadonly<z.output<typeof catalogsSchema>>;

/** The catalogs of the engine, from the specification tables (version `PRESETS_VERSION`). */
export const DEFAULT_CATALOGS: PresetCatalogs = {
  bodyNeeds: BODY_NEEDS,
  emotions: EMOTIONS,
  drives: DRIVES,
  bondAxes: BOND_AXES,
  bondLabels: BOND_LABELS,
  traits: TRAITS,
  aptitudes: APTITUDES,
  signals: SIGNALS,
  places: PLACES,
  weathers: WEATHERS,
  associationTags: ASSOCIATION_TAGS,
  characterArchetypes: CHARACTER_ARCHETYPES,
  bondArchetypes: BOND_ARCHETYPES,
  historyEvents: HISTORY_EVENTS,
  dayStates: DAY_STATES,
  acts: ACTS,
  tones: TONES,
  topicTypes: TOPIC_TYPES,
  requestObjects: REQUEST_OBJECTS,
};
