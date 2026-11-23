import { afterEach, describe, expect, it, vi } from "vitest";

import { aCastInput, SEEDS } from "../../test/support.ts";
import { createEngine } from "./create.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createEngine", () => {
  it("given a browser with workers when creating the engine then a module worker runs the engine file", () => {
    const started: unknown[][] = [];
    vi.stubGlobal(
      "Worker",
      class {
        constructor(...args: unknown[]) {
          started.push([String(args[0]), args[1]]);
        }
        postMessage(): void {
          return undefined;
        }
        addEventListener(): void {
          return undefined;
        }
      },
    );

    createEngine();

    expect(started).toStrictEqual([
      [
        expect.stringMatching(/\/src\/engine\/engine\.worker\.ts(\?|$)/) as unknown,
        { type: "module", name: "engine" },
      ],
    ]);
  });

  it("given no Worker when creating the engine then it runs in process", async () => {
    vi.stubGlobal("Worker", undefined);

    const answer = await createEngine().generateCast(aCastInput([["Lia", "elder"]]), SEEDS);

    expect(answer).toMatchObject({ ok: true, value: { characters: [{ name: "Lia" }] } });
  });
});
