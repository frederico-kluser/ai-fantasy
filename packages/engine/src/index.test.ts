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
      "CHARACTER_ARCHETYPE_IDS",
      "DAY_STATE_IDS",
      "DEFAULT_CATALOGS",
      "DRIVE_IDS",
      "EMOTION_IDS",
      "ENGINE_NAME",
      "HISTORY_EVENT_IDS",
      "MAX_DRAW_BOUND",
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
      "WEATHER_IDS",
      "approach",
      "canonicalize",
      "clampInt",
      "compareIds",
      "createDrawer",
      "createRngState",
      "div",
      "err",
      "hashState",
      "isSeed",
      "loadPresets",
      "mulBp",
      "ok",
      "relax",
      "toBipolarBp",
      "toBp",
      "toCharacterId",
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
