/**
 * Who perceives an act and how (simulation-model §8.2): from the geometric
 * hearing of the space module, each present character gets `DIRECT`,
 * `FRAGMENT` (drawn on the `perception` stream), `SEEN` or nothing. In acts
 * without speech, the targets and whoever sees the author get `DIRECT`.
 */
import type { Bp } from "../domain/bp.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";
import type { Perspective } from "../memory/copy.ts";
import type { Drawer } from "../rng/drawer.ts";
import type { Grid } from "../space/grid.ts";
import { earshot, type Earshot, type Listener, type Volume } from "../space/hearing.ts";
import { canSee } from "../space/sight.ts";
import type { ActLabel } from "./label.ts";

/** The perspective of someone who perceived the act: every one but `TOLD`. */
export type ActPerspective = Exclude<Perspective, "TOLD">;

/** Someone who perceived the act, and how. */
export interface Perceived {
  readonly id: CharacterId;
  readonly perspective: ActPerspective;
}

/** What the perspectives of an act depend on. */
export interface PerspectiveInput {
  readonly grid: Grid;
  /** The noise and the sight range of the tick (simulation-model §3.2 and §6). */
  readonly now: { readonly noise: Bp; readonly vision: number };
  /** The author and where it stands. */
  readonly author: Listener;
  readonly label: ActLabel;
  /** Whether the act is a speech act (the `speech` of its preset). */
  readonly speech: boolean;
  /** The others present, where they stand (any order; the author excluded). */
  readonly others: readonly Listener[];
}

/**
 * The chance of a fragment, in bp, by volume (simulation-model §8.2): 3000, and
 * 5000 for a whisper at 2 cells, the only distance where a whisper can be a
 * fragment (range 1, fragments up to twice it).
 */
const FRAGMENT_CHANCE: Readonly<Record<Volume, number>> = {
  WHISPER: 5000,
  NORMAL: 3000,
  SHOUT: 3000,
};

/** `SEEN` when the listener sees the author, otherwise nothing. */
function seenOrNothing(input: PerspectiveInput, listener: Listener): ActPerspective | null {
  const sees = canSee(input.grid, listener.cell, input.author.cell, input.now.vision);
  return sees ? "SEEN" : null;
}

/** The perspective of a listener on a speech act, drawing the fragment when in its range. */
function heardAs(
  drawer: Drawer,
  input: PerspectiveInput,
  listener: Listener,
): ActPerspective | null {
  const { volume } = input.label;
  const where: Earshot = earshot(
    input.grid,
    { volume, noise: input.now.noise },
    input.author.cell,
    listener.cell,
  );
  if (where === "DIRECT") {
    return "DIRECT";
  }
  const fragment =
    where === "FRAGMENT_RANGE" &&
    drawer.drawChance("perception", FRAGMENT_CHANCE[volume], "HEAR_FRAGMENT", listener.id);
  return fragment ? "FRAGMENT" : seenOrNothing(input, listener);
}

/** The perspective of a present character on an act without speech: `DIRECT` for targets and watchers. */
function watchedAs(input: PerspectiveInput, listener: Listener): ActPerspective | null {
  const { targets } = input.label;
  const targeted = targets !== "GROUP" && targets.includes(listener.id);
  return targeted || seenOrNothing(input, listener) !== null ? "DIRECT" : null;
}

/**
 * Who perceives the act and how, in increasing id order (simulation-model
 * §8.2). A speech act is `DIRECT` within range; between the range and twice it,
 * a `FRAGMENT` with chance 3000 (5000 for a whisper at 2 cells), drawn as
 * `HEAR_FRAGMENT` with the listener as target; otherwise `SEEN` for whoever sees
 * the author. An act without speech is `DIRECT` for its targets and for whoever
 * sees the author. Those who perceive nothing are left out.
 */
export function perceiveAct(drawer: Drawer, input: PerspectiveInput): Perceived[] {
  const ordered = [...input.others].sort((a, b) => compareIds(a.id, b.id));
  return ordered.flatMap((listener) => {
    const perspective = input.speech
      ? heardAs(drawer, input, listener)
      : watchedAs(input, listener);
    return perspective === null ? [] : [{ id: listener.id, perspective }];
  });
}
