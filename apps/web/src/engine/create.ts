/**
 * Starting the engine (overview §6): a module Web Worker, so long runs never
 * freeze the page; where no `Worker` exists (the unit tests), the same handler
 * answers in process.
 */
import { createEngineClient, createInProcessPort, type EngineClient } from "./client.ts";
import { handleRequest } from "./handler.ts";
import { PRESETS } from "./presets.ts";

/** A client of a new engine. */
export function createEngine(): EngineClient {
  if (typeof Worker === "undefined") {
    return createEngineClient(createInProcessPort((message) => handleRequest(PRESETS, message)));
  }
  const url = new URL("./engine.worker.ts", import.meta.url);
  return createEngineClient(new Worker(url, { type: "module", name: "engine" }));
}
