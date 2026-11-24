/**
 * The worker side of the protocol (overview §6): every message gets the
 * handler's answer. Kept apart from the worker entry so it runs in the tests.
 */
import type { Presets } from "@ai-fantasy/engine";

import { handleRequest } from "./handler.ts";

/** What the host needs of the worker's global scope. */
export interface WorkerScope {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
}

/** Answers every message that reaches `scope` with {@link handleRequest}. */
export function attachEngine(scope: WorkerScope, presets: Presets): void {
  scope.addEventListener("message", (event) => {
    scope.postMessage(handleRequest(presets, event.data));
  });
}
