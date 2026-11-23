/**
 * Public part of the time module (overview §3.1, simulation-model §2 and §3.2):
 * the clock by ticks, the phases of the day, the light of the scene and the
 * sight range.
 */
export { DAY_PHASES, dayPhase, MINUTES_PER_DAY, minuteOfDay, type DayPhase } from "./clock.ts";
export {
  LIGHT_LEVELS,
  lightLevel,
  visionRange,
  type LightInput,
  type LightLevel,
} from "./light.ts";
