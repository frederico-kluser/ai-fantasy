/**
 * Entry of the engine Web Worker (overview §6). Only wiring: the host and the
 * handler it calls are tested; this file runs in the E2E.
 */
import { attachEngine } from "./host.ts";
import { PRESETS } from "./presets.ts";

/* v8 ignore start */
// Stryker disable all
// In a dedicated worker, `self` is the worker scope.
attachEngine(self, PRESETS);
// Stryker restore all
/* v8 ignore stop */
