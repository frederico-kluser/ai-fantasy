/**
 * Public part of the space module (overview §3.1, simulation-model §3.1, §8.1
 * and §8.2): the grid and its template, distance, line of sight, hearing,
 * cheapest paths, movement destinations and the per-tick movement step. The
 * search machinery stays inside the engine.
 */
export {
  CELL_RULES,
  CELL_TYPES,
  cellDistance,
  cellIndex,
  cellPos,
  isPassable,
  type CellPos,
  type CellRule,
  type CellType,
  type Grid,
} from "./grid.ts";
export { MIN_GRID_STARTS, parseGridSpec, type GridError, type GridSpec } from "./grid-spec.ts";
export { canSee, cellsBetween, hasLineOfSight } from "./sight.ts";
export {
  earshot,
  hearers,
  openRange,
  voiceRange,
  VOLUMES,
  type Earshot,
  type Heard,
  type Listener,
  type Voice,
  type Volume,
} from "./hearing.ts";
export { findPath, type PathError } from "./path.ts";
export { APPROACH_DISTANCE, approachCell, nearestExit, withdrawCell } from "./destinations.ts";
export { moveTick, type MoveGoal, type Occupant } from "./movement.ts";
