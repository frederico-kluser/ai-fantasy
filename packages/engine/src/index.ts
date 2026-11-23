/**
 * Public API of `@ai-fantasy/engine`, the Hermeneutic Core: a pure and
 * deterministic engine with no I/O (ADR 0014, overview §3).
 *
 * This file only re-exports; code lives in the modules next to it.
 */
export { ENGINE_NAME } from "./meta.ts";
export * from "./domain/index.ts";
export * from "./rng/index.ts";
export * from "./time/index.ts";
export * from "./space/index.ts";
export { canonicalize } from "./session/canonical.ts";
export { hashState } from "./session/hash.ts";
export * from "./presets/index.ts";
export * from "./acts/index.ts";
export * from "./character/index.ts";
export * from "./context/index.ts";
export * from "./memory/index.ts";
