import { defineProject, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config.ts";

/** Vitest project of the site (jsdom); Stryker runs it through `stryker.config.mjs`. */
export default mergeConfig(
  viteConfig,
  defineProject({
    test: {
      name: "web",
      include: ["src/**/*.test.{ts,tsx}"],
      environment: "jsdom",
      setupFiles: ["./vitest.setup.ts"],
    },
  }),
);
