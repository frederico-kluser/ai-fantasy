import { describe, expect, it } from "vitest";

import { ENGINE_NAME } from "./index.ts";

describe("engine entry point", () => {
  it("given the engine package when reading its name then it is Hermeneutic Core", () => {
    expect(ENGINE_NAME).toBe("Hermeneutic Core");
  });
});
