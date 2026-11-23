import { defineProject } from "vitest/config";

/** Vitest project of the AI package; Stryker runs it through `stryker.config.mjs`. */
export default defineProject({
  test: {
    name: "ai",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    environment: "node",
  },
});
