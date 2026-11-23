import { defineProject } from "vitest/config";

/** Vitest project of the local server; Stryker runs it through `stryker.config.mjs`. */
export default defineProject({
  test: {
    name: "server",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    environment: "node",
  },
});
