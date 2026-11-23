// @ts-check
import { strykerBase } from "../../stryker.base.mjs";

/** Mutation testing of the engine: score at least 90% (ADR 0018). */
/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  ...strykerBase,
  thresholds: { high: 95, low: 90, break: 90 },
};
