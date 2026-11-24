import type { Presets } from "@ai-fantasy/engine";
import { describe, expect, it } from "vitest";

import { aCastInput, SEEDS } from "../../test/support.ts";
import { handleRequest } from "./handler.ts";
import { PRESETS } from "./presets.ts";
import { engineResponseSchema } from "./protocol.ts";

const FAMILY = aCastInput(
  [
    ["Dona Rosa", "elder"],
    ["Marta", "caretaker"],
    ["Joca", "child"],
  ],
  [
    { a: 0, b: 1, archetype: "parent_child" },
    { a: 1, b: 2, archetype: "parent_child" },
  ],
);

function generate(input: unknown, id = 3) {
  return handleRequest(PRESETS, { v: 1, id, kind: "generateCast", input, seeds: SEEDS });
}

describe("handleRequest (engine worker protocol)", () => {
  it("given the worker when generating a cast then it answers with the generated characters and bonds", () => {
    const response = generate(FAMILY);

    expect(response).toMatchObject({ v: 1, id: 3, ok: true, kind: "generateCast" });
    expect(response).toMatchObject({
      cast: {
        characters: [{ name: "Dona Rosa" }, { name: "Marta" }, { name: "Joca" }],
        relations: [
          { from: 0, to: 1, labels: ["PARENT"] },
          { from: 0, to: 2, labels: ["GRANDPARENT"] },
          { from: 1, to: 0, labels: ["CHILD"] },
          { from: 1, to: 2, labels: ["PARENT"] },
          { from: 2, to: 0, labels: ["GRANDCHILD"] },
          { from: 2, to: 1, labels: ["CHILD"] },
        ],
      },
    });
  });

  it("given a generated cast when answering then the answer passes the protocol schema", () => {
    expect(engineResponseSchema.safeParse(generate(FAMILY)).success).toBe(true);
  });

  it("given a generated cast when answering then each character lists its dominant drives and associations", () => {
    const response = generate(aCastInput([["Lia", "caretaker"]]));

    expect(response).toMatchObject({
      cast: {
        characters: [
          {
            id: 0,
            dominantDrives: ["company", "intimacy", "care"],
            associations: expect.any(Array) as unknown,
          },
        ],
        hook: null,
      },
    });
  });

  it("given a generated cast when answering then the drafts come in the order of the input", () => {
    const response = generate(FAMILY);

    expect(response).toMatchObject({
      cast: {
        drafts: {
          characters: [{ traits: {} }, { traits: {} }, { traits: {} }],
          bonds: [
            { a: 0, b: 1, derived: false, draft: { secrets: [] } },
            { a: 1, b: 2, derived: false, draft: { secrets: [] } },
            { a: 0, b: 2, derived: true, draft: { secrets: [] } },
          ],
        },
      },
    });
  });

  it("given a cast with tension lacking when generating then the hook comes in the answer", () => {
    const response = generate(
      aCastInput(
        [
          ["Ana", "merchant"],
          ["Bia", "scholar"],
        ],
        [{ a: 0, b: 1, archetype: "old_friends" }],
      ),
    );

    expect(response).toMatchObject({
      cast: {
        hook: { author: expect.any(Number) as unknown, secret: expect.any(Boolean) as unknown },
      },
    });
  });

  it("given a bond with an event when generating then its draft keeps one secret mark per event", () => {
    const response = generate(
      aCastInput(
        [
          ["Ana", "merchant"],
          ["Bia", "scholar"],
        ],
        [{ a: 0, b: 1, archetype: "rivals", events: [{ event: "stole", author: 0 }] }],
      ),
    );

    expect(response).toMatchObject({
      cast: { drafts: { bonds: [{ draft: { secrets: [expect.any(Boolean) as unknown] } }] } },
    });
  });

  it("given an invalid cast input when generating then the answer is CAST_REJECTED with the path", () => {
    const response = generate(aCastInput([["Ana", "wizard"]]));

    expect(response).toStrictEqual({
      v: 1,
      id: 3,
      ok: false,
      error: {
        code: "CAST_REJECTED",
        problems: [
          {
            path: "cast.characters.0.archetype",
            message: expect.stringMatching(/^Dado inválido no elenco \(.+\)\.$/) as unknown,
          },
        ],
      },
    });
  });

  it("given a message without a valid envelope when handling then BAD_REQUEST with no id", () => {
    const response = handleRequest(PRESETS, { hello: "world" });

    expect(response).toMatchObject({ v: 1, id: null, ok: false, error: { code: "BAD_REQUEST" } });
  });

  it("given a request of another version when handling then BAD_REQUEST with its id", () => {
    const response = handleRequest(PRESETS, { v: 2, id: 9, kind: "checkSetup", setup: {} });

    expect(response).toMatchObject({
      id: 9,
      ok: false,
      error: { code: "BAD_REQUEST", problems: [{ path: "v" }] },
    });
  });

  it.each([
    [{ castSeed: 4294967296, sceneSeed: 0 }, "seeds.castSeed"],
    [{ castSeed: 0, sceneSeed: -1 }, "seeds.sceneSeed"],
  ])("given the seeds %j when handling then the request is refused at %s", (seeds, path) => {
    const response = handleRequest(PRESETS, {
      v: 1,
      id: 2,
      kind: "generateCast",
      input: FAMILY,
      seeds,
    });

    expect(response).toMatchObject({
      id: 2,
      ok: false,
      error: { code: "BAD_REQUEST", problems: [{ path }] },
    });
  });

  it("given the largest seeds when handling then the cast is generated", () => {
    const seeds = { castSeed: 4294967295, sceneSeed: 4294967295 };

    expect(
      handleRequest(PRESETS, { v: 1, id: 2, kind: "generateCast", input: FAMILY, seeds }).ok,
    ).toBe(true);
  });

  it("given a request with id -1 when handling then it is refused with no id", () => {
    const response = handleRequest(PRESETS, { v: 1, id: -1, kind: "checkSetup", setup: {} });

    expect(response).toMatchObject({
      id: null,
      ok: false,
      error: { code: "BAD_REQUEST", problems: [{ path: "id" }] },
    });
  });

  it("given a request with id 0 when handling then it is answered with id 0", () => {
    expect(handleRequest(PRESETS, { v: 1, id: 0, kind: "checkSetup", setup: {} })).toMatchObject({
      id: 0,
      error: { code: "SETUP_REJECTED" },
    });
  });

  it("given a request with a bad seed when handling then the problem names the seed", () => {
    const response = handleRequest(PRESETS, {
      v: 1,
      id: 1,
      kind: "generateCast",
      input: FAMILY,
      seeds: { castSeed: -1, sceneSeed: 0 },
    });

    expect(response).toMatchObject({ error: { problems: [{ path: "seeds.castSeed" }] } });
  });

  it("given the engine throws when handling then the answer is WORKER_FAILED with the message", () => {
    // Broken presets make the engine throw: what a bug in the worker would look like.
    const broken = {} as Presets;

    const response = handleRequest(broken, {
      v: 1,
      id: 4,
      kind: "generateCast",
      input: FAMILY,
      seeds: SEEDS,
    });

    expect(response).toMatchObject({
      id: 4,
      ok: false,
      error: {
        code: "WORKER_FAILED",
        problems: [{ path: "", message: expect.any(String) as unknown }],
      },
    });
  });

  it("given a setup check when the setup is invalid then the answer is SETUP_REJECTED", () => {
    const response = handleRequest(PRESETS, { v: 1, id: 5, kind: "checkSetup", setup: {} });

    expect(response).toMatchObject({ id: 5, ok: false, error: { code: "SETUP_REJECTED" } });
  });
});
