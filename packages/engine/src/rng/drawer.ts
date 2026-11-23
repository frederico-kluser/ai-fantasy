/**
 * The drawer: the only way the engine draws (simulation-model §15). A step opens
 * one from the immutable {@link RngState}, draws, and calls `finish()` to get the
 * next state and the records of every draw. The drawer is mutable only inside
 * that step; the engine state stays immutable.
 *
 * Every draw consumes its stream exactly as the natural draw does, even when it
 * is forced or in MOST_LIKELY mode, so changing one outcome never shifts the
 * draws that follow it (invariant 8).
 */
import { BP_MAX } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import {
  chanceOutcomes,
  rawOutcomes,
  requireChance,
  totalWeight,
  weightedOutcomes,
  type DrawOutcomes,
} from "./outcomes.ts";
import { sfc32FromWords, sfc32Words, type Sfc32 } from "./sfc32.ts";
import { mapStreams, type RngState, type StreamName } from "./state.ts";
import { uniformBelow } from "./uniform.ts";

/** How draws resolve: naturally, or each one as its most likely outcome. */
export type DrawMode = "NORMAL" | "MOST_LIKELY";

/** Kind of draw: a raw integer, a chance in bp, or a weighted choice of an index. */
export type DrawKind = "RAW" | "CHANCE" | "WEIGHTED";

/**
 * Which draws a forced outcome applies to: the draw with sequence number `seq`,
 * or every draw with `purpose` (and, if given, `target`).
 */
export type DrawSelector =
  | { readonly kind: "SEQ"; readonly seq: number }
  | { readonly kind: "PURPOSE"; readonly purpose: string; readonly target?: CharacterId };

/**
 * An outcome forced on the draws a selector picks: the raw value, 1 (success)
 * or 0 (failure) for a chance, or the option index of a weighted draw.
 */
export interface ForcedDraw {
  readonly selector: DrawSelector;
  readonly outcome: number;
}

/** One draw, as it enters the session log. */
export interface DrawRecord {
  /** Position of the draw in the session: 0, 1, 2… across every step. */
  readonly seq: number;
  /** Tick of the step that drew. */
  readonly tick: number;
  readonly stream: StreamName;
  readonly kind: DrawKind;
  /** What the draw decides, in SCREAMING_SNAKE_CASE (for example `TURN_ORDER`). */
  readonly purpose: string;
  /** The character the draw is about, if any. */
  readonly target?: CharacterId;
  /** The natural value is in `[0, bound)`: the bound of a raw draw, 10000 for a chance, the total weight. */
  readonly bound: number;
  /** The natural value drawn, kept even when the outcome was forced or MOST_LIKELY. */
  readonly value: number;
  /** The chance, in bp, of a chance draw. */
  readonly p?: number;
  /** The applied result: the raw value, 1 or 0 for a chance, or the chosen option index. */
  readonly outcome: number;
  /** Present when a forced outcome was applied. */
  readonly forced?: true;
  /** Present when the drawer ran in MOST_LIKELY mode (a forced outcome still wins). */
  readonly mode?: "MOST_LIKELY";
}

/** How a step draws. */
export interface DrawerOptions {
  /** Tick of the step, written in each record: a safe integer ≥ 0. */
  readonly tick: number;
  readonly mode: DrawMode;
  /** Forced outcomes; for each draw, the first entry whose selector matches decides. */
  readonly forced: readonly ForcedDraw[];
}

/** What a finished drawer gives back. */
export interface DrawerResult {
  /** The state after every draw of the step. */
  readonly rng: RngState;
  /** The records of the draws, in order. */
  readonly records: readonly DrawRecord[];
}

/**
 * Draws for one step. Every method checks its arguments before drawing and
 * throws a `RangeError` on a programming error, leaving the drawer unchanged.
 */
export interface Drawer {
  /** A uniform integer in `[0, bound)`, with `bound` an integer in `1..2^31`. */
  readonly draw: (
    stream: StreamName,
    bound: number,
    purpose: string,
    target?: CharacterId,
  ) => number;
  /** Whether a chance of `p` bp (an integer in `0..10000`) succeeds: `u < p` for `u` in `[0, 10000)`. */
  readonly drawChance: (
    stream: StreamName,
    p: number,
    purpose: string,
    target?: CharacterId,
  ) => boolean;
  /** The index of an option, with probability proportional to its weight (integers ≥ 0, total in `1..2^31`). */
  readonly drawWeighted: (
    stream: StreamName,
    weights: readonly number[],
    purpose: string,
    target?: CharacterId,
  ) => number;
  /** Ends the step: the next state and the records. The drawer cannot be used afterwards. */
  readonly finish: () => DrawerResult;
}

type DrawRecordDraft = { -readonly [Key in keyof DrawRecord]: DrawRecord[Key] };

const PURPOSE_FORMAT = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

function requirePurpose(purpose: string): void {
  if (!PURPOSE_FORMAT.test(purpose)) {
    throw new RangeError(
      `a draw purpose must be SCREAMING_SNAKE_CASE, got ${JSON.stringify(purpose)}`,
    );
  }
}

function requireTick(tick: number): void {
  if (!Number.isSafeInteger(tick) || tick < 0) {
    throw new RangeError(`a tick must be a safe integer ≥ 0, got ${tick}`);
  }
}

function selects(selector: DrawSelector, record: DrawRecord): boolean {
  if (selector.kind === "SEQ") {
    return selector.seq === record.seq;
  }
  return (
    selector.purpose === record.purpose &&
    (selector.target === undefined || selector.target === record.target)
  );
}

/** The first forced entry whose selector matches the draw, if any. */
function firstSelecting(forced: readonly ForcedDraw[], record: DrawRecord): ForcedDraw | undefined {
  for (const entry of forced) {
    if (selects(entry.selector, record)) {
      return entry;
    }
  }
  return undefined;
}

class StreamDrawer implements Drawer {
  readonly #tick: number;
  readonly #mode: DrawMode;
  readonly #forced: readonly ForcedDraw[];
  readonly #streams: Record<StreamName, Sfc32>;
  readonly #records: DrawRecord[] = [];
  #nextSeq: number;
  #finished = false;

  constructor(rng: RngState, options: DrawerOptions) {
    requireTick(options.tick);
    this.#tick = options.tick;
    this.#mode = options.mode;
    this.#forced = options.forced;
    this.#streams = mapStreams((name) => sfc32FromWords(rng.streams[name]));
    this.#nextSeq = rng.nextSeq;
  }

  readonly draw = (
    stream: StreamName,
    bound: number,
    purpose: string,
    target?: CharacterId,
  ): number => this.#settle(rawOutcomes, bound, this.#open("RAW", stream, bound, purpose, target));

  readonly drawChance = (
    stream: StreamName,
    p: number,
    purpose: string,
    target?: CharacterId,
  ): boolean => {
    requireChance(p);
    const record = this.#open("CHANCE", stream, BP_MAX, purpose, target);
    record.p = p;
    return this.#settle(chanceOutcomes, p, record) === 1;
  };

  readonly drawWeighted = (
    stream: StreamName,
    weights: readonly number[],
    purpose: string,
    target?: CharacterId,
  ): number => {
    const total = totalWeight(weights);
    return this.#settle(
      weightedOutcomes,
      weights,
      this.#open("WEIGHTED", stream, total, purpose, target),
    );
  };

  readonly finish = (): DrawerResult => {
    this.#ensureOpen();
    this.#finished = true;
    return {
      rng: {
        nextSeq: this.#nextSeq,
        streams: mapStreams((name) => sfc32Words(this.#streams[name])),
      },
      records: this.#records,
    };
  };

  #ensureOpen(): void {
    if (this.#finished) {
      throw new Error("this drawer is finished; draw again from the rng state it returned");
    }
  }

  /** Checks the draw, consumes its stream and starts its record. */
  #open(
    kind: DrawKind,
    stream: StreamName,
    bound: number,
    purpose: string,
    target: CharacterId | undefined,
  ): DrawRecordDraft {
    this.#ensureOpen();
    requirePurpose(purpose);
    const value = uniformBelow(this.#streams[stream], bound);
    const record: DrawRecordDraft = {
      seq: this.#nextSeq,
      tick: this.#tick,
      stream,
      kind,
      purpose,
      bound,
      value,
      outcome: value,
    };
    this.#nextSeq += 1;
    if (target !== undefined) {
      record.target = target;
    }
    if (this.#mode === "MOST_LIKELY") {
      record.mode = "MOST_LIKELY";
    }
    return record;
  }

  /** Applies the forced, MOST_LIKELY or natural outcome, in this order, and keeps the record. */
  #settle<A>(outcomes: DrawOutcomes<A>, about: A, record: DrawRecordDraft): number {
    const forced = firstSelecting(this.#forced, record);
    if (forced !== undefined && outcomes.isPossible(forced.outcome, about)) {
      record.outcome = forced.outcome;
      record.forced = true;
    } else {
      record.outcome =
        record.mode === undefined
          ? outcomes.natural(record.value, about)
          : outcomes.mostLikely(about);
    }
    this.#records.push(record);
    return record.outcome;
  }
}

/**
 * Opens a drawer for one step.
 *
 * @example
 * const drawer = createDrawer(state.rng, { tick, mode: state.drawMode, forced: state.forcedDraws });
 * const speaks = drawer.drawChance("turn", p, "SPEAK_UP", id);
 * const { rng, records } = drawer.finish();
 * @throws RangeError if `tick` is not a safe integer ≥ 0.
 */
export function createDrawer(rng: RngState, options: DrawerOptions): Drawer {
  return new StreamDrawer(rng, options);
}
