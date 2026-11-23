/**
 * Public part of the presets module (overview §3.1, presets §1): the loader,
 * the default catalogs and their version, the id lists and the types of the
 * loaded presets. The schemas, the grid legend and the raw data stay inside the
 * engine; everything goes through {@link loadPresets}.
 */
export { loadPresets } from "./load.ts";
export {
  CATALOG_NAMES,
  DEFAULT_CATALOGS,
  type CatalogName,
  type PresetCatalogs,
  type Presets,
} from "./catalogs.ts";
export type { PresetError, PresetErrorCode } from "./errors.ts";
export { PRESETS_VERSION } from "./version.ts";
export type { GridTemplate } from "./grid.ts";

export { BODY_NEED_IDS, type BodyNeedEntry, type BodyNeedId } from "./body.ts";
export { EMOTION_IDS, type EmotionEntry, type EmotionId } from "./emotions.ts";
export { DRIVE_IDS, type DriveEntry, type DriveId } from "./drives.ts";
export {
  BOND_AXIS_IDS,
  BOND_LABEL_IDS,
  type BondAxisEntry,
  type BondAxisId,
  type BondLabelEntry,
  type BondLabelId,
} from "./bonds.ts";
export {
  APTITUDE_IDS,
  TRAIT_IDS,
  type AptitudeEntry,
  type AptitudeId,
  type TraitEntry,
  type TraitId,
} from "./traits.ts";
export {
  SIGNAL_CAUSE_IDS,
  SIGNAL_IDS,
  type SignalCauseId,
  type SignalEntry,
  type SignalId,
} from "./signals.ts";
export { PLACE_IDS, type PlaceId, type PlacePreset } from "./places.ts";
export { WEATHER_IDS, type WeatherId, type WeatherPreset } from "./weathers.ts";
export { ASSOCIATION_TAG_IDS, type AssociationTag, type AssociationTagId } from "./tags.ts";
export {
  CHARACTER_ARCHETYPE_IDS,
  type CharacterArchetype,
  type CharacterArchetypeId,
} from "./character-archetypes.ts";
export { BOND_ARCHETYPE_IDS, type BondArchetype, type BondArchetypeId } from "./bond-archetypes.ts";
export { HISTORY_EVENT_IDS, type HistoryEvent, type HistoryEventId } from "./history-events.ts";
export { DAY_STATE_IDS, type DayState, type DayStateId } from "./day-states.ts";
export { ACT_IDS, type ActEntry, type ActId } from "./acts.ts";
export { TONE_IDS, type ToneEntry, type ToneId } from "./tones.ts";
export { TOPIC_TYPE_IDS, type TopicTypeEntry, type TopicTypeId } from "./topics.ts";
export {
  REQUEST_OBJECT_IDS,
  type RequestObjectEntry,
  type RequestObjectId,
} from "./request-objects.ts";
