/**
 * Helpers shared by the server tests. They hold no assertions of their own and
 * no branches: tests stay one behavior each (testing-strategy §2).
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { onTestFinished } from "vitest";

import { loadConfig, type ServerConfig } from "../src/config.ts";

/**
 * A recognizable fake OpenRouter key. Tests never read the real one from
 * `process.env`; they inject this value and check it never leaks.
 */
export const FAKE_KEY = "sk-or-v1-TEST-ONLY-0000-never-a-real-key-0000";

/** The address tests use to reach an app through `inject` (the default port). */
export const LOCAL_ORIGIN = "http://127.0.0.1:4318";

/** A new empty folder for the current test, removed when the test finishes. */
export function temporaryFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "ai-fantasy-server-"));
  onTestFinished(() => {
    rmSync(folder, { recursive: true, force: true });
  });
  return folder;
}

/** Writes `content` to `root/relativePath`, creating the folders on the way. */
export function writeTree(root: string, relativePath: string, content: string | Buffer): string {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}

/** The configuration read from `env` (no `process.env`); the test fails if it is invalid. */
export function configFor(env: Readonly<Record<string, string>>): ServerConfig {
  const result = loadConfig(env);
  assert.ok(result.ok, "the test configuration is invalid");
  return result.value;
}

/** A log destination that keeps every line written to it. */
export interface CapturedLog {
  readonly write: (line: string) => void;
  readonly lines: string[];
}

/** A log destination for `buildApp({ logger })` that keeps the lines in memory. */
export function capturedLog(): CapturedLog {
  const lines: string[] = [];
  return {
    write: (line) => {
      lines.push(line);
    },
    lines,
  };
}
