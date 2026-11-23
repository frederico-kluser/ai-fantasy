/**
 * Public part of the generation module (overview §3.1, presets §10.1): the
 * cast generator with its input, validation and errors, and the opening of a
 * scene. The draws, the graph and the assembly stay inside the engine.
 */
export { generateCast, type Cast, type CastGeneration } from "./cast.ts";
export { dominantDrivesOf } from "./character-draft.ts";
export type { CastError, CastErrorCode } from "./errors.ts";
export type { PlacedEvent } from "./history.ts";
export {
  CAST_MAX,
  DRAWN_DEFICIT_IDS,
  type BondDraft,
  type BondSpec,
  type CastInput,
  type CastInputData,
  type CharacterDraft,
  type CharacterSpec,
  type DrawnDeficitId,
  type EventSpec,
} from "./input.ts";
export { openScene, type OpenedScene, type OpeningError, type SceneOpening } from "./opening.ts";
export { hasTension, TENSION_EVENTS } from "./tension.ts";
export { validateCast } from "./validate.ts";
