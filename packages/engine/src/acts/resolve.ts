/**
 * Resolving the act of one character (simulation-model §16 step 5): validate it
 * and mark an interruption (5.1); find who perceives it and how each `DIRECT`
 * listener reads its tone (5.2); settle the author's obligations and create the
 * new ones (the obligations part of 5.3); record the fact and the copies (5.4);
 * and set the movement destination (5.6). The consequences of 5.3 (SOC-03) and
 * the tendencies of 5.5 (SOC-06) run on the result, between these steps, in the
 * scene step (SOC-05); the cost in ticks says how far the step then advances.
 */
import type { CharacterState } from "../character/state.ts";
import type { Bp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import { err, ok, type Result } from "../domain/result.ts";
import type { ActFact, Fact } from "../memory/fact.ts";
import { recordAct } from "../memory/record.ts";
import {
  createDrawer,
  type DrawMode,
  type Drawer,
  type DrawerResult,
  type ForcedDraw,
} from "../rng/drawer.ts";
import type { RngState } from "../rng/state.ts";
import { cellDistance, type Grid } from "../space/grid.ts";
import type { ActLabel } from "./label.ts";
import { movementOf, type MovementOutcome } from "./movement.ts";
import {
  createObligations,
  isInterruption,
  settleObligations,
  type EndedObligation,
  type Obligation,
} from "./obligations.ts";
import { perceiveAct, type ActPerspective, type Perceived } from "./perspectives.ts";
import { actEntry, actTicks, type ActRules } from "./rules.ts";
import { readerView, readTone, type ToneReading } from "./tone.ts";
import { validateAct, type ActError } from "./validate.ts";

/** The act to resolve and the scene it happens in, without the draws. */
export interface ResolveScene {
  readonly rules: ActRules;
  readonly grid: Grid;
  /** The noise and the sight range of the tick (simulation-model §3.2 and §6). */
  readonly now: { readonly noise: Bp; readonly vision: number };
  /** The tick when the act is resolved: the drawer of this step opens at it. */
  readonly tick: number;
  readonly author: CharacterId;
  readonly label: ActLabel;
  /** The characters present, the author included. */
  readonly characters: readonly CharacterState[];
  /** The record of facts, in increasing id order. */
  readonly facts: readonly Fact[];
  /** The obligations pending in the scene. */
  readonly obligations: readonly Obligation[];
  /** Whether the author is leaving the slice (its `FAREWELL` heads for an exit). */
  readonly leaving: boolean;
}

/** The draw streams and how draws resolve: `resolveAct` opens the drawer of `tick` (simulation-model §15). */
export interface OwnDraws {
  readonly rng: RngState;
  readonly mode: DrawMode;
  readonly forced: readonly ForcedDraw[];
}

/** A drawer the caller already opened for this tick (one drawer per tick), and finishes itself. */
export interface SharedDrawer {
  readonly drawer: Drawer;
}

/** The act to resolve: the scene, and either the draw streams or an open drawer. */
export type ResolveInput = ResolveScene & (OwnDraws | SharedDrawer);

/** One who perceived the act: its perspective and, for a `DIRECT` listener, its reading of the tone. */
export interface ListenerView {
  readonly id: CharacterId;
  readonly perspective: ActPerspective;
  /** `null` unless `DIRECT`: only direct listeners interpret the act (simulation-model §8.3). */
  readonly reading: ToneReading | null;
}

/** A resolved act. */
export interface ActResolution {
  /** The cost of the act in ticks (dialogue-acts §2). */
  readonly ticks: number;
  /** A third party acted over a pending obligation of the last act (simulation-model §11 item 4). */
  readonly interruption: boolean;
  /** Who perceived the act, in increasing id order, with each one's reading. */
  readonly listeners: readonly ListenerView[];
  /** The new fact: the real act, whatever the listeners read. */
  readonly fact: ActFact;
  readonly facts: readonly Fact[];
  /** The characters present with their new copies. */
  readonly characters: readonly CharacterState[];
  /** The obligations pending after the act. */
  readonly obligations: readonly Obligation[];
  /** The author's obligations the act answered or ignored. */
  readonly ended: readonly EndedObligation[];
  readonly movement: MovementOutcome;
  /**
   * The draw streams after the act and the records of its draws, when
   * `resolveAct` opened the drawer; `null` when the caller passed its own drawer
   * (the caller's `finish()` gives them).
   */
  readonly draws: DrawerResult | null;
}

function authorOf(input: ResolveInput): CharacterState {
  const author = input.characters.find((character) => character.id === input.author);
  if (author === undefined) {
    throw new RangeError(`the author ${input.author} is not present`);
  }
  return author;
}

/** Each `DIRECT` listener reads the tone; the others only perceived the act. */
function readListeners(
  drawer: Drawer,
  input: ResolveInput,
  author: CharacterState,
  perceived: readonly Perceived[],
): ListenerView[] {
  return perceived.map(({ id, perspective }) => {
    const listener = input.characters.find((character) => character.id === id);
    if (perspective !== "DIRECT" || listener === undefined) {
      return { id, perspective, reading: null };
    }
    const reading = readTone(drawer, input.rules, {
      tone: input.label.tone,
      listener: id,
      reader: readerView(listener, author.id),
      distance: cellDistance(input.grid, author.cell, listener.cell),
      noise: input.now.noise,
    });
    return { id, perspective, reading };
  });
}

/** The drawer of the tick, and the one opened here (to finish), if any. */
function drawerOf(input: ResolveInput): { readonly drawer: Drawer; readonly own: Drawer | null } {
  if ("drawer" in input) {
    return { drawer: input.drawer, own: null };
  }
  const own = createDrawer(input.rng, { tick: input.tick, mode: input.mode, forced: input.forced });
  return { drawer: own, own };
}

/** Steps 5.2 to 5.4 and 5.6 of a valid act. */
function resolveValid(input: ResolveInput, author: CharacterState): ActResolution {
  const others = input.characters.filter((character) => character.id !== author.id);
  const { drawer, own } = drawerOf(input);
  const perceived = perceiveAct(drawer, {
    grid: input.grid,
    now: input.now,
    author,
    label: input.label,
    speech: actEntry(input.rules, input.label.act).speech,
    others,
  });
  const listeners = readListeners(drawer, input, author, perceived);
  const recorded = recordAct({ ...input, perceived });
  const settled = settleObligations(input.obligations, author.id, input.label);
  const created = createObligations(input.rules, { ...input, fact: recorded.fact.id, perceived });
  return {
    ticks: actTicks(input.rules, input.label),
    interruption: isInterruption(input.obligations, input.facts, author.id),
    listeners,
    ...recorded,
    obligations: [...settled.pending, ...created],
    ended: settled.ended,
    movement: movementOf({ ...input, from: author.cell, others }),
    draws: own === null ? null : own.finish(),
  };
}

/**
 * Resolves the act of `input.author` (simulation-model §16 steps 5.1, 5.2,
 * 5.4, 5.6 and the obligations of 5.3). The draws (`HEAR_FRAGMENT`,
 * `TONE_MISREAD`, `TONE_CONFUSION`) go to the drawer of `input.tick`: the one
 * the caller passes (`drawer`, one drawer per tick, finished by the caller), or
 * one opened here from `rng`, `mode` and `forced` (then `draws` gives the next
 * state and the records).
 *
 * It is a composition of the exported steps, which the appraisal (SOC-03) and
 * the scene step (SOC-05) can call one by one to put the consequences between
 * them, on the same drawer:
 *
 * 1. `validateAct` and `isInterruption` (5.1);
 * 2. `perceiveAct`, then `readTone` for each `DIRECT` listener in id order (5.2);
 * 3. the consequences of the act as each listener read it (5.3, SOC-03), then
 *    `settleObligations` and `createObligations`;
 * 4. `recordAct`, with the `appraisal` the consequences give (offenders,
 *    importances, who believed a lie) (5.4);
 * 5. the tendencies of the author (5.5, SOC-06);
 * 6. `movementOf` (5.6).
 *
 * Here step 3 has no consequences and step 4 records the neutral values.
 *
 * @returns the resolution, or the validation error; an invalid act draws nothing.
 * @throws RangeError if the author is not among the characters present.
 */
export function resolveAct(input: ResolveInput): Result<ActResolution, ActError> {
  const author = authorOf(input);
  const valid = validateAct(input.label, {
    ...input,
    noise: input.now.noise,
    author,
    others: input.characters.filter((character) => character.id !== author.id),
  });
  return valid.ok ? ok(resolveValid(input, author)) : err(valid.error);
}
