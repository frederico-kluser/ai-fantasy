import { describe, expect, it } from "vitest";

import * as constants from "./domain/constants.ts";
import { DEFAULT_CATALOGS, loadPresets, PLACE_IDS, PRESETS_VERSION } from "./presets/index.ts";
import * as engine from "./index.ts";

describe("engine entry point", () => {
  it("given the engine package when reading its name then it is Hermeneutic Core", () => {
    expect(engine.ENGINE_NAME).toBe("Hermeneutic Core");
  });

  it("given the package entry point when importing then it exports the public API", () => {
    const apart = Object.keys(engine)
      .filter((name) => !(name in constants))
      .sort();

    expect(apart).toStrictEqual([
      "ACT_IDS",
      "APPROACH_DISTANCE",
      "APTITUDE_IDS",
      "ASSOCIATION_TAG_IDS",
      "BIPOLAR_MIN",
      "BODY_NEED_IDS",
      "BOND_ARCHETYPE_IDS",
      "BOND_AXIS_IDS",
      "BOND_LABEL_IDS",
      "BP_MAX",
      "BP_SCALE",
      "CAST_STREAM",
      "CATALOG_NAMES",
      "CELL_RULES",
      "CELL_TYPES",
      "CHARACTER_ARCHETYPE_IDS",
      "DAY_PHASES",
      "DAY_STATE_IDS",
      "DEFAULT_CATALOGS",
      "DRIVE_IDS",
      "EMOTION_IDS",
      "ENGINE_NAME",
      "HISTORY_EVENT_IDS",
      "LIGHT_LEVELS",
      "MAX_DRAW_BOUND",
      "MINUTES_PER_DAY",
      "MIN_GRID_STARTS",
      "PLACE_IDS",
      "PRESETS_VERSION",
      "REQUEST_OBJECT_IDS",
      "SCENE_STREAMS",
      "SIGNAL_CAUSE_IDS",
      "SIGNAL_IDS",
      "STREAMS",
      "TONE_IDS",
      "TOPIC_TYPE_IDS",
      "TRAIT_IDS",
      "VOLUMES",
      "WEATHER_IDS",
      "approach",
      "approachCell",
      "canSee",
      "canonicalize",
      "cellDistance",
      "cellIndex",
      "cellPos",
      "cellsBetween",
      "clampInt",
      "compareIds",
      "createDrawer",
      "createRngState",
      "dayPhase",
      "div",
      "earshot",
      "err",
      "findPath",
      "hasLineOfSight",
      "hashState",
      "hearers",
      "isPassable",
      "isSeed",
      "lightLevel",
      "loadPresets",
      "minuteOfDay",
      "moveTick",
      "mulBp",
      "nearestExit",
      "ok",
      "openRange",
      "parseGridSpec",
      "relax",
      "toBipolarBp",
      "toBp",
      "toCharacterId",
      "toFactId",
      "toThingId",
      "visionRange",
      "voiceRange",
      "withdrawCell",
    ]);
    expect(engine).toMatchObject({ ...constants });
  });

  it("given the package entry point when importing then the presets API is the presets module's", () => {
    expect(engine).toMatchObject({
      loadPresets,
      DEFAULT_CATALOGS,
      PRESETS_VERSION,
      PLACE_IDS,
    });
  });
});
