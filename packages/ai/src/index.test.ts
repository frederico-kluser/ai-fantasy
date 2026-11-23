import { describe, expect, it } from "vitest";

import { AI_ROLES } from "./index.ts";

describe("ai entry point", () => {
  it("given the AI package when listing the model roles then they are systemOne and textModel", () => {
    expect(AI_ROLES).toEqual(["systemOne", "textModel"]);
  });
});
