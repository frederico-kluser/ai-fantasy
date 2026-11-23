import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/** The pure part of the package: everything under src/ but the adapters and the tests. */
const SOURCE_ROOT = fileURLToPath(new URL(".", import.meta.url));

function pureSources(): string[] {
  return readdirSync(SOURCE_ROOT, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"))
    .filter((path) => !path.replaceAll("\\", "/").startsWith("openrouter/"));
}

/** Network access: Node built-ins, HTTP clients, the adapters and the browser network APIs. */
const NETWORK =
  /from\s+["'](node:|https?["']|undici|axios|\S*openrouter)|\bfetch\s*\(|XMLHttpRequest|WebSocket/u;

describe("the pure part of @ai-fantasy/ai (overview §2)", () => {
  it("given the pure sources when scanning then they are found", () => {
    expect(pureSources()).toEqual(expect.arrayContaining(["index.ts", "ports.ts"]));
  });

  it("given the pure sources when scanning then no network import or global appears", () => {
    const offenders = pureSources().filter((path) =>
      NETWORK.test(readFileSync(join(SOURCE_ROOT, path), "utf8")),
    );

    expect(offenders.map((path) => relative(".", path))).toEqual([]);
  });

  it.each([
    ['import { request } from "node:https";'],
    ['import x from "https";'],
    ['import { client } from "../openrouter/index.ts";'],
    ["const reply = await fetch(url);"],
  ])("given %j when scanning then it is network access", (source) => {
    expect(NETWORK.test(source)).toBe(true);
  });
});
