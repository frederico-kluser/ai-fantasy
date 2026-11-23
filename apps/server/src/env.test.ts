import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, it } from "vitest";

import { loadEnvFileIfPresent } from "./env.ts";

const scratch = mkdtempSync(join(tmpdir(), "ai-fantasy-env-"));
const VARIABLE = "AI_FANTASY_ENV_TEST_VARIABLE";

afterEach(() => {
  Reflect.deleteProperty(process.env, VARIABLE);
});

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe(".env loading (ai-integration §2)", () => {
  it("given no .env file when loading then nothing is loaded and nothing fails", () => {
    expect(loadEnvFileIfPresent(join(scratch, "missing.env"))).toBe(false);
  });

  it("given an .env file when loading then its variables are set", () => {
    const file = join(scratch, "values.env");
    writeFileSync(file, `${VARIABLE}=from-file\n`);

    const loaded = loadEnvFileIfPresent(file);

    expect({ loaded, value: process.env[VARIABLE] }).toEqual({ loaded: true, value: "from-file" });
  });

  it("given a variable already set when loading an .env file then the environment wins", () => {
    const file = join(scratch, "override.env");
    writeFileSync(file, `${VARIABLE}=from-file\n`);
    process.env[VARIABLE] = "from-environment";

    loadEnvFileIfPresent(file);

    expect(process.env[VARIABLE]).toBe("from-environment");
  });

  it("given a path that cannot be read as a file when loading then the error is raised", () => {
    expect(() => loadEnvFileIfPresent(scratch)).toThrow();
  });
});
