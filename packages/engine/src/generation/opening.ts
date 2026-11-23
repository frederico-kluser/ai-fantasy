/**
 * Opening a scene (presets §9 and §10.1, "Abertura da cena"): the day state of
 * each character applied to the body and the emotions, and distinct starting
 * cells, drawn only in the `setup` stream of the scene seed.
 */
import { greatestNeed, type Body } from "../character/body.ts";
import type { Emotions } from "../character/emotions.ts";
import type { CharacterState } from "../character/state.ts";
import { toBipolarBp, toBp } from "../domain/bp.ts";
import { DISCOMFORT } from "../domain/constants.ts";
import type { CharacterId } from "../domain/ids.ts";
import { itemAt } from "../domain/lookup.ts";
import { err, ok, type Result } from "../domain/result.ts";
import { BODY_NEED_IDS } from "../presets/body.ts";
import type { Presets } from "../presets/catalogs.ts";
import type { DayState, DayStateId } from "../presets/day-states.ts";
import { EMOTION_IDS } from "../presets/emotions.ts";
import { createDrawer, type DrawRecord, type Drawer } from "../rng/drawer.ts";
import type { RngState } from "../rng/state.ts";
import { isInside, isPassable, type CellPos, type Grid } from "../space/grid.ts";
import { parseGridSpec, type GridError, type GridSpec } from "../space/grid-spec.ts";
import { presetById } from "./lookup.ts";
import { drawInRange } from "./ranges.ts";

/** How the scene opens: the grid template, and per character (by id) a day state and a cell. */
export interface SceneOpening {
  readonly grid: GridSpec;
  /** The day state of each character; a missing entry is `rested`. */
  readonly dayStates?: readonly DayStateId[];
  /** A cell chosen by hand for each character, or `null` to draw it; a missing entry is `null`. */
  readonly positions?: readonly (CellPos | null)[];
}

/** Why a scene could not open. */
export type OpeningError =
  | { readonly code: "INVALID_GRID"; readonly grid: GridError }
  | { readonly code: "INVALID_POSITION" | "TAKEN_POSITION"; readonly character: CharacterId };

/** An opened scene: the characters placed and set for the day, the grid, the rng state and the records. */
export interface OpenedScene {
  readonly characters: readonly CharacterState[];
  readonly grid: Grid;
  readonly rng: RngState;
  readonly records: readonly DrawRecord[];
}

/** physical_relief: `clamp((greatest need − 5000) × 2, 0, 10000)` (simulation-model §5.3). */
const RELIEF_FACTOR = 2;

function openBody(drawer: Drawer, state: DayState, rested: DayState, id: CharacterId): Body {
  const label = { stream: "setup", purpose: "DAY_STATE_BODY", target: id } as const;
  const values = BODY_NEED_IDS.map((need): [string, number] => {
    const range = state.body[need] ?? rested.body[need] ?? { min: 0, max: 0 };
    return [need, drawInRange(drawer, range, label)];
  });
  const { thermal = 0, ...needs } = Object.fromEntries(values);
  // Every need has just been given a value, clamped to its scale below.
  const unipolar = Object.fromEntries(
    Object.entries(needs).map(([need, value]) => [need, toBp(value)]),
  ) as Omit<Body, "thermal">;
  return { ...unipolar, thermal: toBipolarBp(thermal) };
}

function openEmotions(drawer: Drawer, state: DayState, base: Emotions, id: CharacterId): Emotions {
  const label = { stream: "setup", purpose: "DAY_STATE_EMOTION", target: id } as const;
  const entries = EMOTION_IDS.map((emotion) => {
    const range = state.emotions[emotion];
    return [emotion, range === undefined ? base[emotion] : toBp(drawInRange(drawer, range, label))];
  });
  // Every emotion id has just been given a value.
  return Object.fromEntries(entries) as Emotions;
}

function openCharacter(
  drawer: Drawer,
  presets: Presets,
  character: CharacterState,
  dayState: DayStateId,
): CharacterState {
  const state = presetById(presets.dayStates, dayState);
  const body = openBody(drawer, state, presetById(presets.dayStates, "rested"), character.id);
  const relief = toBp((greatestNeed(body) - DISCOMFORT) * RELIEF_FACTOR);
  const deficits = { ...character.drives.deficits, physical_relief: relief };
  return {
    ...character,
    body,
    emotions: openEmotions(drawer, state, character.baselines, character.id),
    drives: { ...character.drives, deficits },
    perceptions: [],
    threat: toBp(0),
  };
}

function fixedCell(grid: Grid, pos: CellPos): number | null {
  if (!isInside(grid, pos.x, pos.y)) {
    return null;
  }
  const index = pos.y * grid.width + pos.x;
  return isPassable(itemAt(grid.cells, index)) ? index : null;
}

/** The cells chosen by hand, checked; `undefined` for the characters to draw. */
function fixedCells(
  grid: Grid,
  ids: readonly CharacterId[],
  positions: readonly (CellPos | null)[],
): Result<(number | undefined)[], OpeningError> {
  const cells: (number | undefined)[] = [];
  for (const id of ids) {
    const pos = positions[id] ?? null;
    const cell = pos === null ? undefined : fixedCell(grid, pos);
    if (cell === null) {
      return err({ code: "INVALID_POSITION", character: id });
    }
    if (cell !== undefined && cells.includes(cell)) {
      return err({ code: "TAKEN_POSITION", character: id });
    }
    cells.push(cell);
  }
  return ok(cells);
}

/**
 * The cell of a character to place (presets §10.1): a free suggested start,
 * drawn uniformly (`START_CELL`); without one, the free passable cell of lowest
 * index. A valid template has at least 8 distinct passable starts and a cast at
 * most 8 characters, so the fallback only serves edited grids.
 *
 * @throws RangeError if no passable cell is free (a broken invariant).
 */
export function drawCell(
  drawer: Drawer,
  grid: Grid,
  starts: readonly number[],
  taken: readonly (number | undefined)[],
  id: CharacterId,
): number {
  const free = starts.filter((cell) => !taken.includes(cell));
  if (free.length > 0) {
    return itemAt(free, drawer.draw("setup", free.length, "START_CELL", id));
  }
  const index = grid.cells.findIndex((type, cell) => isPassable(type) && !taken.includes(cell));
  if (index < 0) {
    throw new RangeError(`no free passable cell for character ${id}`);
  }
  return index;
}

function placeAll(
  drawer: Drawer,
  grid: Grid,
  spec: GridSpec,
  fixed: readonly (number | undefined)[],
): number[] {
  const starts = spec.starts.map((pos) => pos.y * grid.width + pos.x);
  return fixed.reduce<(number | undefined)[]>(
    (cells, cell, index) => {
      cells[index] = cell ?? drawCell(drawer, grid, starts, cells, index as CharacterId);
      return cells;
    },
    [...fixed],
    // Every entry was either fixed or has just been placed.
  ) as number[];
}

/**
 * Opens a scene for a cast (presets §10.1): the grid from its template, then
 * for each character by id the body and emotions of its day state, then the
 * cells chosen by hand and the drawn ones, all in the `setup` stream.
 *
 * @param characters the cast's characters, by id (ids `0..n−1`).
 * @param rng the rng state of the session, whose `setup` stream the scene seed fed.
 * @returns the characters ready for the first tick, the grid, the rng state and
 * the draw records, or why the scene cannot open.
 * @example
 * const opened = openScene(presets, cast.characters, { grid: place.grid, dayStates: cast.dayStates }, rng);
 */
export function openScene(
  presets: Presets,
  characters: readonly CharacterState[],
  opening: SceneOpening,
  rng: RngState,
): Result<OpenedScene, OpeningError> {
  const grid = parseGridSpec(opening.grid);
  if (!grid.ok) {
    return err({ code: "INVALID_GRID", grid: grid.error });
  }
  const ids = characters.map((character) => character.id);
  const fixed = fixedCells(grid.value, ids, opening.positions ?? []);
  if (!fixed.ok) {
    return fixed;
  }
  const drawer = createDrawer(rng, { tick: 0, mode: "NORMAL", forced: [] });
  const opened = characters.map((character) =>
    openCharacter(drawer, presets, character, opening.dayStates?.[character.id] ?? "rested"),
  );
  const cells = placeAll(drawer, grid.value, opening.grid, fixed.value);
  const placed = opened.map((character, index) => ({ ...character, cell: itemAt(cells, index) }));
  const finished = drawer.finish();
  return ok({ characters: placed, grid: grid.value, rng: finished.rng, records: finished.records });
}
