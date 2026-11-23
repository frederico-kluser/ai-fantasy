import { describe, expect, it } from "vitest";

import * as ai from "./index.ts";

describe("ai entry point", () => {
  it("given the AI package when listing the model roles then they are systemOne and textModel", () => {
    expect(ai.AI_ROLES).toEqual(["systemOne", "textModel"]);
  });

  it("given the AI package when reading the prompt version then it is a dated version", () => {
    expect(ai.PROMPT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/u);
  });

  it("given the AI package when importing then the builders, validation, fallbacks and fakes are public", () => {
    expect(
      [
        ai.buildPlayerLineCall,
        ai.buildSceneCall,
        ai.buildCharacterCalls,
        ai.buildBondCalls,
        ai.validateAnswers,
        ai.readPlayerLine,
        ai.validateLine,
        ai.fallbackLine,
        ai.createFakeSystemOne,
        ai.createFakeTextModel,
      ].map((value) => typeof value),
    ).toEqual(Array.from({ length: 10 }, () => "function"));
  });
});
