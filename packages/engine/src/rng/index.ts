/**
 * Public part of the rng module (overview §3.1, simulation-model §15): seeds and
 * streams, the immutable rng state, and the drawer with its records, forced
 * draws and MOST_LIKELY mode. The generator internals stay inside the engine.
 */
export {
  CAST_STREAM,
  createRngState,
  isSeed,
  SCENE_STREAMS,
  STREAMS,
  type RngSeeds,
  type RngState,
  type StreamName,
} from "./state.ts";
export type { StreamWords } from "./sfc32.ts";
export { MAX_DRAW_BOUND } from "./uniform.ts";
export {
  createDrawer,
  type DrawKind,
  type DrawMode,
  type DrawRecord,
  type DrawSelector,
  type Drawer,
  type DrawerOptions,
  type DrawerResult,
  type ForcedDraw,
} from "./drawer.ts";
