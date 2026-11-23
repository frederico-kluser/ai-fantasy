/**
 * Who hears an act, geometrically (simulation-model §8.2): the range of each
 * volume, reduced or blocked by the cells between speaker and listener on the
 * line of sight. Drawing a fragment and giving perspectives belong to the acts
 * (SOC-01); this module only says who is in range and who is up to twice it.
 */
import { BP_MAX } from "../domain/bp.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";
import { itemAt } from "../domain/lookup.ts";
import { div } from "../domain/math.ts";
import { cellDistance, type CellType, type Grid } from "./grid.ts";
import { forEachCellBetween } from "./sight.ts";

/** The volumes of an act, from the softest. */
export const VOLUMES = ["WHISPER", "NORMAL", "SHOUT"] as const;

/** The volume of an act. */
export type Volume = (typeof VOLUMES)[number];

/** A voice: the volume and the noise it fights. */
export interface Voice {
  readonly volume: Volume;
  /** Noise of the place plus the weather, already limited to `0..10000` (simulation-model §6). */
  readonly noise: number;
}

/**
 * Where a listener stands for a voice: in range (`DIRECT`), beyond it but within
 * twice it (`FRAGMENT_RANGE`: a fragment may be drawn), or farther.
 */
export type Earshot = "DIRECT" | "FRAGMENT_RANGE" | "OUT_OF_RANGE";

/** Someone who may hear: the character and the cell where it stands. */
export interface Listener {
  readonly id: CharacterId;
  readonly cell: number;
}

/** Where a listener stands for a voice. */
export interface Heard {
  readonly id: CharacterId;
  readonly earshot: Earshot;
}

const WHISPER_RANGE = 1;
const SHOUT_RANGE = 30;
/** Normal speech: `max(3, 8 − noise / 2000)` cells. */
const NORMAL_RANGE_MAX = 8;
const NORMAL_RANGE_MIN = 3;
const NOISE_PER_CELL = 2000;
/** A fragment can be heard up to twice the range. */
const FRAGMENT_RANGE_FACTOR = 2;

/** What a cell between speaker and listener does to a voice, by severity. */
const PASSES = 0;
const HALVES = 1;
const BLOCKS = 2;

/**
 * The table of simulation-model §8.2 with the "Fala normal" column of §3.1: a
 * whisper stops at anything that blocks sight, normal speech stops at walls and
 * closed doors and is halved by windows, a shout is halved by walls only.
 */
const MUFFLING: Readonly<Record<Volume, Readonly<Record<CellType, number>>>> = {
  WHISPER: {
    FLOOR: PASSES,
    ROUGH: PASSES,
    DOOR_OPEN: PASSES,
    DOOR_CLOSED: BLOCKS,
    WINDOW: PASSES,
    LOW_OBSTACLE: PASSES,
    WALL: BLOCKS,
  },
  NORMAL: {
    FLOOR: PASSES,
    ROUGH: PASSES,
    DOOR_OPEN: PASSES,
    DOOR_CLOSED: BLOCKS,
    WINDOW: HALVES,
    LOW_OBSTACLE: PASSES,
    WALL: BLOCKS,
  },
  SHOUT: {
    FLOOR: PASSES,
    ROUGH: PASSES,
    DOOR_OPEN: PASSES,
    DOOR_CLOSED: PASSES,
    WINDOW: PASSES,
    LOW_OBSTACLE: PASSES,
    WALL: HALVES,
  },
};

/** The range left by the worst cell between, by its severity: whole, halved once, or none. */
const REDUCED_RANGE: readonly ((range: number) => number)[] = [
  (range) => range,
  (range) => div(range, 2),
  () => 0,
];

/** The range of each volume in the open, from the noise. */
const OPEN_RANGE: Readonly<Record<Volume, (noise: number) => number>> = {
  WHISPER: () => WHISPER_RANGE,
  NORMAL: (noise) => Math.max(NORMAL_RANGE_MIN, NORMAL_RANGE_MAX - div(noise, NOISE_PER_CELL)),
  SHOUT: () => SHOUT_RANGE,
};

function requireNoise(noise: number): number {
  if (!Number.isSafeInteger(noise) || noise < 0 || noise > BP_MAX) {
    throw new RangeError(`noise must be an integer in 0..10000 bp, got ${noise}`);
  }
  return noise;
}

/**
 * The range of a voice in the open, in cells (simulation-model §8.2):
 * `WHISPER` 1, `NORMAL` `max(3, 8 − div(noise, 2000))`, `SHOUT` 30.
 *
 * @throws RangeError if the noise is not an integer in `0..10000`.
 */
export function openRange(voice: Voice): number {
  return OPEN_RANGE[voice.volume](requireNoise(voice.noise));
}

/**
 * The range of a voice from `from` toward `to`, in cells, after the cells
 * strictly between them on the line of sight (simulation-model §8.2): a block
 * gives 0; otherwise one or more halving cells halve the range once.
 *
 * @throws RangeError if the noise is not an integer in `0..10000` or an index is
 * not a cell of the grid.
 */
export function voiceRange(grid: Grid, voice: Voice, from: number, to: number): number {
  const range = openRange(voice);
  const muffling = MUFFLING[voice.volume];
  let worst = PASSES;
  forEachCellBetween(grid, from, to, (cell) => {
    worst = Math.max(worst, muffling[itemAt(grid.cells, cell)]);
  });
  return itemAt(REDUCED_RANGE, worst)(range);
}

/**
 * Where a listener at `to` stands for a voice from `from`: `DIRECT` at a
 * Chebyshev distance up to the range, `FRAGMENT_RANGE` up to twice it, else
 * `OUT_OF_RANGE`. A blocked voice has range 0: nobody hears it.
 *
 * @throws RangeError if the noise is not an integer in `0..10000` or an index is
 * not a cell of the grid.
 */
export function earshot(grid: Grid, voice: Voice, from: number, to: number): Earshot {
  const range = voiceRange(grid, voice, from, to);
  const distance = cellDistance(grid, from, to);
  if (distance <= range) {
    return "DIRECT";
  }
  return distance <= FRAGMENT_RANGE_FACTOR * range ? "FRAGMENT_RANGE" : "OUT_OF_RANGE";
}

/**
 * Where each listener stands for a voice from the cell `speaker`, sorted by
 * increasing id (simulation-model §8.2). Pass the others present, not the speaker.
 *
 * @example
 * hearers(grid, { volume: "WHISPER", noise }, author.cell, others);
 * // [{ id: 1, earshot: "DIRECT" }, { id: 4, earshot: "FRAGMENT_RANGE" }]
 */
export function hearers(
  grid: Grid,
  voice: Voice,
  speaker: number,
  listeners: readonly Listener[],
): Heard[] {
  return [...listeners]
    .sort((a, b) => compareIds(a.id, b.id))
    .map((listener) => ({
      id: listener.id,
      earshot: earshot(grid, voice, speaker, listener.cell),
    }));
}
