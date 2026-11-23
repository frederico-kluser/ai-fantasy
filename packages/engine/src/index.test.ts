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
      "BIPOLAR_MIN",
      "BP_MAX",
      "BP_SCALE",
      "CAST_STREAM",
      "ENGINE_NAME",
      "MAX_DRAW_BOUND",
      "SCENE_STREAMS",
      "STREAMS",
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
      "mulBp",
      "ok",
      "relax",
      "toBipolarBp",
      "toBp",
      "toCharacterId",
    ]);
    expect(engine).toMatchObject({ ...constants });
  });
});
