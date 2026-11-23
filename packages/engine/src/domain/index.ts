/**
 * Public part of the domain module (overview §3.1): results, integer bp
 * arithmetic, branded ids and the constants of simulation-model §17. The UTF-8
 * and FNV helpers stay internal to the engine.
 */
export { err, ok, type Err, type Ok, type Result } from "./result.ts";
export { approach, BP_SCALE, clampInt, div, mulBp, relax } from "./math.ts";
export { BIPOLAR_MIN, BP_MAX, toBipolarBp, toBp, type BipolarBp, type Bp } from "./bp.ts";
export {
  compareIds,
  toCharacterId,
  toFactId,
  toThingId,
  type CharacterId,
  type FactId,
  type IdError,
  type ThingId,
} from "./ids.ts";
export * from "./constants.ts";
