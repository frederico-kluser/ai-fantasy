/**
 * Seeds, streams and the immutable state of the draws (simulation-model §15).
 * There is one stream per purpose; the cast seed feeds only `generation` and the
 * scene seed feeds the others, so either can vary without touching the other.
 */
import { fnv1a32 } from "../domain/fnv.ts";
import { seedSfc32, sfc32Words, type StreamWords } from "./sfc32.ts";

/** Every draw stream, one per purpose, in the order of simulation-model §15. */
export const STREAMS = [
  "generation",
  "setup",
  "turn",
  "choice",
  "signal",
  "perception",
  "resolution",
  "leave",
] as const;

/** Name of a draw stream. */
export type StreamName = (typeof STREAMS)[number];

/** The only stream fed by the cast seed: characters, bonds and shared history. */
export const CAST_STREAM = "generation";

/** The streams fed by the scene seed (`setup` draws the opening values of a scene). */
export const SCENE_STREAMS: readonly StreamName[] = STREAMS.filter((name) => name !== CAST_STREAM);

/** The two seeds of a session: integers in `0..2^32 − 1` (see {@link isSeed}). */
export interface RngSeeds {
  readonly castSeed: number;
  readonly sceneSeed: number;
}

/**
 * Immutable state of all draw streams; part of the engine state, so it holds
 * only integers and hashes canonically. Only a drawer's `finish()` makes a new one.
 */
export interface RngState {
  /** Sequence number of the next draw: 0 for the first draw of a session. */
  readonly nextSeq: number;
  /** The sfc32 words of each stream. */
  readonly streams: Readonly<Record<StreamName, StreamWords>>;
}

/** 2^32: seeds are below it. */
const SEED_LIMIT = 4294967296;

/** Whether `value` is a valid seed: an integer in `0..2^32 − 1`. */
export function isSeed(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < SEED_LIMIT;
}

function requireSeed(value: number): number {
  if (!isSeed(value)) {
    throw new RangeError(`a seed must be an integer in 0..4294967295, got ${value}`);
  }
  return value;
}

/**
 * The 32-bit seed of a stream: FNV-1a 32 of the UTF-8 bytes of `"<seed>:<name>"`,
 * with the seed in decimal without leading zeros (simulation-model §15).
 */
export function hash32(seed: number, name: string): number {
  return fnv1a32(`${seed}:${name}`);
}

/** Builds a record with one entry per stream, in the order of {@link STREAMS}. */
export function mapStreams<T>(build: (name: StreamName) => T): Record<StreamName, T> {
  // Every key is set by the loop right below.
  const streams = {} as Record<StreamName, T>;
  for (const name of STREAMS) {
    streams[name] = build(name);
  }
  return streams;
}

/**
 * The state of a new session: every stream seeded from its seed and name, and
 * the sequence at 0.
 *
 * @throws RangeError if a seed is not an integer in `0..2^32 − 1` (validate input
 * from outside with {@link isSeed} first).
 */
export function createRngState(seeds: RngSeeds): RngState {
  const castSeed = requireSeed(seeds.castSeed);
  const sceneSeed = requireSeed(seeds.sceneSeed);
  return {
    nextSeq: 0,
    streams: mapStreams((name) => {
      const seed = name === CAST_STREAM ? castSeed : sceneSeed;
      return sfc32Words(seedSfc32(hash32(seed, name)));
    }),
  };
}
