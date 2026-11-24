/**
 * The site's side of the engine worker protocol (overview §6): each request
 * gets an id and a promise that resolves with the answer of the same id, as a
 * `Result` — never a rejection. Answers are checked with the protocol schema;
 * one that breaks it fails its request, and a worker error fails them all.
 */
import { err, ok, type CastInputData, type Result, type RngSeeds } from "@ai-fantasy/engine";
import { z } from "zod";

import type { SceneSetup } from "../playground/setup.ts";
import {
  engineResponseSchema,
  PROTOCOL_VERSION,
  type CastView,
  type EngineAsk,
  type EngineFailure,
  type EngineResponse,
  type SetupReview,
} from "./protocol.ts";

/** What the client needs of a worker: posting and listening (a `Worker` fits). */
export interface EnginePort {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  addEventListener(type: "error", listener: () => void): void;
}

/** An answer of the engine: the value asked for, or why not. */
export type EngineAnswer<T> = Result<T, EngineFailure>;

/** What the site asks the engine. */
export interface EngineClient {
  /** Generates a cast in the worker (presets §10.1). */
  generateCast(input: CastInputData, seeds: RngSeeds): Promise<EngineAnswer<CastView>>;
  /** Checks a scene setup in the worker and returns what the review sheet shows. */
  checkSetup(setup: SceneSetup): Promise<EngineAnswer<SetupReview>>;
}

type Settle = (response: EngineResponse) => void;

const OUT_OF_PROTOCOL: EngineFailure = {
  code: "WORKER_FAILED",
  problems: [{ path: "", message: "O motor respondeu fora do protocolo." }],
};

const STOPPED: EngineFailure = {
  code: "WORKER_FAILED",
  problems: [{ path: "", message: "O motor parou de responder; recarregue a página." }],
};

/** An id no request has: answers without a valid id settle nothing. */
const NO_ID = -1;

const idOnly = z.looseObject({ id: z.int().min(0) });

function failed(id: number, error: EngineFailure): EngineResponse {
  return { v: PROTOCOL_VERSION, id, ok: false, error };
}

function valueOf<T>(response: EngineResponse, pick: (response: EngineResponse) => T | undefined) {
  if (!response.ok) {
    return err(response.error);
  }
  const value = pick(response);
  return value === undefined ? err(OUT_OF_PROTOCOL) : ok(value);
}

/**
 * A client of the engine worker over `port`.
 *
 * @example
 * const engine = createEngineClient(new Worker(url, { type: "module" }));
 * const answer = await engine.generateCast(input, seeds);
 */
export function createEngineClient(port: EnginePort): EngineClient {
  const pending = new Map<number, Settle>();
  let nextId = 0;
  port.addEventListener("message", (event) => {
    const parsed = engineResponseSchema.safeParse(event.data);
    const id = (parsed.success ? parsed.data.id : idOnly.safeParse(event.data).data?.id) ?? NO_ID;
    const settle = pending.get(id);
    if (settle !== undefined) {
      pending.delete(id);
      settle(parsed.success ? parsed.data : failed(id, OUT_OF_PROTOCOL));
    }
  });
  port.addEventListener("error", () => {
    pending.forEach((settle, id) => {
      settle(failed(id, STOPPED));
    });
    pending.clear();
  });
  const ask = (request: EngineAsk) =>
    new Promise<EngineResponse>((resolve) => {
      const id = nextId;
      nextId += 1;
      pending.set(id, resolve);
      port.postMessage({ v: PROTOCOL_VERSION, id, ...request });
    });
  return {
    generateCast: async (input, seeds) =>
      valueOf(await ask({ kind: "generateCast", input, seeds }), (response) =>
        "cast" in response ? response.cast : undefined,
      ),
    checkSetup: async (setup) =>
      valueOf(await ask({ kind: "checkSetup", setup }), (response) =>
        "review" in response ? response.review : undefined,
      ),
  };
}

/**
 * A port that answers in the same thread, after the current task: the engine
 * where no `Worker` exists (tests, old browsers). Answers go through the same
 * protocol as the worker's.
 */
export function createInProcessPort(handle: (message: unknown) => unknown): EnginePort {
  const listeners: ((event: { readonly data: unknown }) => void)[] = [];
  return {
    postMessage: (message) => {
      // A copy, as a real worker would get: the answer never shares objects with the request.
      const copy = structuredClone(message);
      void Promise.resolve().then(() => {
        const data = handle(copy);
        listeners.forEach((listener) => {
          listener({ data });
        });
      });
    },
    addEventListener: (type: string, listener: (event: { readonly data: unknown }) => void) => {
      if (type === "message") {
        listeners.push(listener);
      }
    },
  };
}
