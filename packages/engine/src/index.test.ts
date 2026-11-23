import { describe, expect, it } from "vitest";

import * as constants from "./domain/constants.ts";
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
      "APPROACH_DISTANCE",
      "BIPOLAR_MIN",
      "BP_MAX",
      "BP_SCALE",
      "CAST_STREAM",
      "CELL_RULES",
      "CELL_TYPES",
      "DAY_PHASES",
      "ENGINE_NAME",
      "LIGHT_LEVELS",
      "MAX_DRAW_BOUND",
      "MINUTES_PER_DAY",
      "MIN_GRID_STARTS",
      "SCENE_STREAMS",
      "STREAMS",
      "VOLUMES",
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
      "visionRange",
      "voiceRange",
      "withdrawCell",
    ]);
    expect(engine).toMatchObject({ ...constants });
  });
});
