import { defineProject } from "vitest/config";

/** Vitest project of the engine; Stryker runs it through `stryker.config.mjs`. */
export default defineProject({
  test: {
    name: "engine",
    include: ["src/**/*.test.ts", "test/**/*.test.ts", "bench/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
