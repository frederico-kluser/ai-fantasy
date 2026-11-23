import { defineConfig, devices } from "@playwright/test";

/** Port of the server started for the E2E run (the dev server uses 4318). */
const E2E_PORT = 4319;
const E2E_ORIGIN = `http://127.0.0.1:${String(E2E_PORT)}`;
const isCi = process.env["CI"] !== undefined;

/**
 * Playwright: Chromium only, against the built site served by the local server on
 * 127.0.0.1:4319 (testing-strategy §10). No retries: a flaky test is a bug (§15).
 */
export default defineConfig({
  testDir: "apps/web/e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: 0,
  reporter: isCi ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: E2E_ORIGIN,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: `${E2E_ORIGIN}/api/health`,
    env: { PORT: String(E2E_PORT) },
    reuseExistingServer: !isCi,
    timeout: 180_000,
  },
});
