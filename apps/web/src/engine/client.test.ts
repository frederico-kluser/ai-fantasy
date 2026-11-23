import { describe, expect, it } from "vitest";

import { aCastInput, aSetup, SEEDS } from "../../test/support.ts";
import { createEngineClient, createInProcessPort, type EnginePort } from "./client.ts";
import { handleRequest } from "./handler.ts";
import { PRESETS } from "./presets.ts";

type Listener = (event: { readonly data: unknown }) => void;

/** A port that keeps what the client posts and lets the test answer by hand. */
function aManualPort() {
  const posted: unknown[] = [];
  const listeners = new Map<string, Listener[]>();
  const port: EnginePort = {
    postMessage: (message) => posted.push(message),
    addEventListener: (type: string, listener: Listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
  };
  const emit = (type: string, data: unknown) => {
    (listeners.get(type) ?? []).forEach((listener) => {
      listener({ data });
    });
  };
  return { port, posted, emit };
}

const ONE = aCastInput([["Lia", "caretaker"]]);

describe("engine client", () => {
  it("given the in-process worker when generating a cast then it answers with the generated characters", async () => {
    const client = createEngineClient(
      createInProcessPort((message) => handleRequest(PRESETS, message)),
    );

    const answer = await client.generateCast(ONE, SEEDS);

    expect(answer).toMatchObject({ ok: true, value: { characters: [{ id: 0, name: "Lia" }] } });
  });

  it("given the in-process worker when checking a setup then the review comes back", async () => {
    const client = createEngineClient(
      createInProcessPort((message) => handleRequest(PRESETS, message)),
    );

    const answer = await client.checkSetup(aSetup());

    expect(answer).toMatchObject({
      ok: true,
      value: { characters: [{ name: "Ana" }, { name: "Bruno" }] },
    });
  });

  it("given a rejected input when asking then the failure comes back as a value", async () => {
    const client = createEngineClient(
      createInProcessPort((message) => handleRequest(PRESETS, message)),
    );

    const answer = await client.checkSetup({ ...aSetup(), player: 5 });

    expect(answer).toMatchObject({ ok: false, error: { code: "SETUP_REJECTED" } });
  });

  it("given a request when posting then the envelope has the version, an id and the kind", () => {
    const { port, posted } = aManualPort();
    const client = createEngineClient(port);

    void client.generateCast(ONE, SEEDS);
    void client.checkSetup(aSetup());

    expect(posted).toStrictEqual([
      { v: 1, id: 0, kind: "generateCast", input: ONE, seeds: SEEDS },
      { v: 1, id: 1, kind: "checkSetup", setup: aSetup() },
    ]);
  });

  it("given two requests when the answers come out of order then each gets its own", async () => {
    const { port, emit } = aManualPort();
    const client = createEngineClient(port);
    const first = client.checkSetup(aSetup());
    const second = client.checkSetup(aSetup());

    emit("message", { v: 1, id: 1, ok: false, error: { code: "SETUP_REJECTED", problems: [] } });
    emit("message", {
      v: 1,
      id: 0,
      ok: true,
      kind: "checkSetup",
      review: { characters: [], hash: "a" },
    });

    expect([await first, await second]).toStrictEqual([
      { ok: true, value: { characters: [], hash: "a" } },
      { ok: false, error: { code: "SETUP_REJECTED", problems: [] } },
    ]);
  });

  it("given an answer of the other kind when it arrives then the request fails as a value", async () => {
    const { port, emit } = aManualPort();
    const client = createEngineClient(port);
    const pending = client.generateCast(ONE, SEEDS);

    emit("message", {
      v: 1,
      id: 0,
      ok: true,
      kind: "checkSetup",
      review: { characters: [], hash: "a" },
    });

    expect(await pending).toMatchObject({ ok: false, error: { code: "WORKER_FAILED" } });
  });

  it("given a malformed answer with a pending id when it arrives then the request fails as a value", async () => {
    const { port, emit } = aManualPort();
    const client = createEngineClient(port);
    const pending = client.checkSetup(aSetup());

    emit("message", { v: 1, id: 0, ok: "maybe" });

    expect(await pending).toStrictEqual({
      ok: false,
      error: {
        code: "WORKER_FAILED",
        problems: [{ path: "", message: "O motor respondeu fora do protocolo." }],
      },
    });
  });

  it("given answers for unknown ids when they arrive then the pending request keeps waiting", async () => {
    const { port, emit } = aManualPort();
    const client = createEngineClient(port);
    const pending = client.checkSetup(aSetup());

    emit("message", { v: 1, id: 7, ok: false, error: { code: "BAD_REQUEST", problems: [] } });
    emit("message", { nonsense: true });
    emit("message", { v: 1, id: 0, ok: false, error: { code: "SETUP_REJECTED", problems: [] } });

    expect(await pending).toMatchObject({ ok: false, error: { code: "SETUP_REJECTED" } });
  });

  it("given an answer without an id when it arrives then no pending request takes it", async () => {
    const { port, emit } = aManualPort();
    const client = createEngineClient(port);
    const first = client.checkSetup(aSetup());
    const second = client.checkSetup(aSetup());

    emit("message", { v: 1, id: null, ok: false, error: { code: "BAD_REQUEST", problems: [] } });
    emit("message", { v: 1, id: 1, ok: false, error: { code: "SETUP_REJECTED", problems: [] } });
    emit("message", { v: 1, id: 0, ok: false, error: { code: "SETUP_REJECTED", problems: [] } });

    expect([await first, await second]).toMatchObject([
      { error: { code: "SETUP_REJECTED" } },
      { error: { code: "SETUP_REJECTED" } },
    ]);
  });

  it("given a worker error when requests are pending then each fails as a value", async () => {
    const { port, emit } = aManualPort();
    const client = createEngineClient(port);
    const first = client.checkSetup(aSetup());
    const second = client.generateCast(ONE, SEEDS);

    emit("error", undefined);

    const failed = {
      ok: false,
      error: {
        code: "WORKER_FAILED",
        problems: [{ path: "", message: "O motor parou de responder; recarregue a página." }],
      },
    };
    expect([await first, await second]).toStrictEqual([failed, failed]);
  });

  it("given a request answered when the worker later fails then the answer is kept", async () => {
    const { port, emit } = aManualPort();
    const client = createEngineClient(port);
    const pending = client.checkSetup(aSetup());
    emit("message", { v: 1, id: 0, ok: false, error: { code: "SETUP_REJECTED", problems: [] } });

    emit("error", undefined);

    expect(await pending).toMatchObject({ error: { code: "SETUP_REJECTED" } });
  });
});
