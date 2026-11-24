import { describe, expect, it } from "vitest";

import { aCastInput, SEEDS } from "../../test/support.ts";
import { attachEngine, type WorkerScope } from "./host.ts";
import { PRESETS } from "./presets.ts";

describe("engine worker host", () => {
  it("given the host scope when a message arrives then it posts the answer of the handler", () => {
    const posted: unknown[] = [];
    let deliver: (event: { readonly data: unknown }) => void = () => undefined;
    const scope: WorkerScope = {
      postMessage: (message) => posted.push(message),
      addEventListener: (_type, listener) => {
        deliver = listener;
      },
    };
    attachEngine(scope, PRESETS);

    deliver({
      data: {
        v: 1,
        id: 2,
        kind: "generateCast",
        input: aCastInput([["Lia", "elder"]]),
        seeds: SEEDS,
      },
    });

    expect(posted).toMatchObject([{ v: 1, id: 2, ok: true, kind: "generateCast" }]);
  });

  it("given the host scope when attaching then it listens to messages", () => {
    const types: string[] = [];
    attachEngine(
      { postMessage: () => undefined, addEventListener: (type) => types.push(type) },
      PRESETS,
    );

    expect(types).toStrictEqual(["message"]);
  });
});
