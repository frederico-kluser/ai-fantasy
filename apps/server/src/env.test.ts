import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, describe, expect, it } from "vitest";

import { loadEnvFileIfPresent, resolvePort } from "./env.ts";

const scratch = mkdtempSync(join(tmpdir(), "ai-fantasy-env-"));
const VARIABLE = "AI_FANTASY_ENV_TEST_VARIABLE";

afterEach(() => {
  Reflect.deleteProperty(process.env, VARIABLE);
});

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("PORT (ai-integration §3)", () => {
  it("given no PORT when resolving the port then it is 4318", () => {
    expect(resolvePort(undefined)).toEqual({ ok: true, value: 4318 });
  });

  it("given an empty PORT when resolving the port then it is 4318", () => {
    expect(resolvePort("")).toEqual({ ok: true, value: 4318 });
  });

  it("given PORT 4319 when resolving the port then it is 4319", () => {
    expect(resolvePort("4319")).toEqual({ ok: true, value: 4319 });
  });

  it("given PORT 0 when resolving the port then the system picks one", () => {
    expect(resolvePort("0")).toEqual({ ok: true, value: 0 });
  });

  it("given the highest port when resolving the port then it is accepted", () => {
    expect(resolvePort("65535")).toEqual({ ok: true, value: 65535 });
  });

  it.each(["65536", "70000", "99999"])(
    "given PORT %s above the highest port when resolving the port then it is an error",
    (raw) => {
      expect(resolvePort(raw)).toEqual({
        ok: false,
        error: `PORT inválido: "${raw}" (use um inteiro de 0 a 65535)`,
      });
    },
  );

  it.each(["abc", "-1", "43.18", " 4318", "4318 ", "x4318", "4318x", "123456"])(
    "given PORT %j that is not a port number when resolving the port then it is an error",
    (raw) => {
      expect(resolvePort(raw)).toEqual({
        ok: false,
        error: `PORT inválido: "${raw}" (use um inteiro de 0 a 65535)`,
      });
    },
  );
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
