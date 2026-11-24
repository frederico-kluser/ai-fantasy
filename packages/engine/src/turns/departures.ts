/**
 * Leaving the slice (simulation-model §11 item 1): at each decision point the
 * characters in `AUTO` who are not leaving are weighed in id order, and the
 * first who decides to leave stops the evaluation (at most one starts leaving
 * per decision point). It acts at once with a `FAREWELL` or a `LEAVE`.
 *
 * ```text
 * leave = max(0, greatest need − 5000) + max(0, threat − 6000) + max(0, boredom − 6000)
 *       + 1500 at LATE_NIGHT or DAWN + 1000 in an uncovered cell with rain or storm
 *       + 3000 if it reached or lost for good the goal of the scene
 * stay  = mulBp(company, 3000) + mulBp(highest desire toward a present, 4000)
 *       + mulBp(curiosity, 2000) + 3000 if it owes an answer
 * ```
 */
import type { ActLabel } from "../acts/label.ts";
import type { Obligation } from "../acts/obligations.ts";
import { greatestNeed } from "../character/body.ts";
import { bondToward } from "../character/bonds.ts";
import { directedDeficit, dominantDrives, isDirected } from "../character/drives.ts";
import type { CharacterState } from "../character/state.ts";
import { toBp, type Bp } from "../domain/bp.ts";
import { CRITICAL, DISCOMFORT, LEAVE_ACT_INTENSITY, LEAVE_MARGIN } from "../domain/constants.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";
import { clampInt, mulBp } from "../domain/math.ts";
import type { Fact } from "../memory/fact.ts";
import type { WeatherId } from "../presets/weathers.ts";
import type { Drawer } from "../rng/drawer.ts";
import type { Grid } from "../space/grid.ts";
import { earshot } from "../space/hearing.ts";
import type { DayPhase } from "../time/clock.ts";
import { isDirectedTo, sliceActs } from "../decision/facts.ts";
import type { PlayerSeat, TurnState } from "./state.ts";

/** What the leave rule reads. */
export interface DepartureInput {
  readonly grid: Grid;
  /** The phase of the day and the noise of the tick. */
  readonly now: { readonly phase: DayPhase; readonly noise: Bp };
  readonly weather: WeatherId;
  /** The tick of the decision point. */
  readonly tick: number;
  /** The characters present (those leaving included), in any order. */
  readonly characters: readonly CharacterState[];
  readonly player: PlayerSeat | null;
  readonly turns: TurnState;
  readonly facts: readonly Fact[];
  /** The id of the first fact of this slice. */
  readonly sliceStart: number;
  readonly obligations: readonly Obligation[];
}

/** The will to leave and the will to stay of one character. */
export interface LeaveScores {
  readonly leave: number;
  readonly stay: number;
}

/** Nobody starts leaving, or one character does, with its act. */
export type Departure =
  | { readonly kind: "NONE" }
  | {
      readonly kind: "LEAVE";
      readonly character: CharacterId;
      /** A NPC with a critical need leaves without a draw. */
      readonly forced: boolean;
      readonly label: ActLabel;
    };

const TOO_MUCH = 6000;
const LATE = 1500;
const LATE_PHASES: readonly DayPhase[] = ["LATE_NIGHT", "DAWN"];
const WET = 1000;
const WET_WEATHERS: readonly WeatherId[] = ["rain", "storm"];
const GOAL = 3000;
const COMPANY_FACTOR = 3000;
const DESIRE_FACTOR = 4000;
const CURIOSITY_FACTOR = 2000;
const OWES = 3000;
/** The leave chance is twice the lead, at most 9500. */
const LEAVE_SLOPE = 2;
const LEAVE_CHANCE_MAX = 9500;
/** "Nos últimos 12 ticks" (simulation-model §11 item 1). */
const RECENT_TICKS = 12;
/** Affection for a listener that warms the farewell. */
const WARM_FAREWELL = 6000;

function others(input: DepartureInput, who: CharacterState): CharacterState[] {
  return input.characters.filter((character) => character.id !== who.id);
}

/** It reached the goal of the scene, or a present answered a request of it with `HARD_REFUSE`. */
function goalSettled(input: DepartureInput, who: CharacterState): boolean {
  const present = others(input, who).map(({ id }) => id);
  const wants = dominantDrives(who.drives).some(isDirected);
  const lost = sliceActs(input.facts, input.sliceStart).some(
    (fact) =>
      fact.band === "HARD_REFUSE" && present.includes(fact.author) && isDirectedTo(fact, who),
  );
  return input.turns.reachedGoals.includes(who.id) || (wants && lost);
}

function wetCell(input: DepartureInput, who: CharacterState): boolean {
  return WET_WEATHERS.includes(input.weather) && input.grid.roofed[who.cell] === false;
}

/** The will to leave and to stay of `who` (see the module comment). */
export function leaveScores(input: DepartureInput, who: CharacterState): LeaveScores {
  const { drives } = who;
  const desire = Math.max(
    0,
    ...others(input, who).map(({ id }) => directedDeficit(drives, "desire", id)),
  );
  const owes = input.obligations.some((owed) => owed.debtor === who.id);
  const leave =
    Math.max(0, greatestNeed(who.body) - DISCOMFORT) +
    Math.max(0, who.threat - TOO_MUCH) +
    Math.max(0, who.emotions.boredom - TOO_MUCH) +
    (LATE_PHASES.includes(input.now.phase) ? LATE : 0) +
    (wetCell(input, who) ? WET : 0) +
    (goalSettled(input, who) ? GOAL : 0);
  const stay =
    mulBp(drives.deficits.company, COMPANY_FACTOR) +
    mulBp(desire, DESIRE_FACTOR) +
    mulBp(drives.deficits.curiosity, CURIOSITY_FACTOR) +
    (owes ? OWES : 0);
  return { leave, stay };
}

/** Whether `who` acted or was addressed an act in the last 12 ticks. */
function recentlyEngaged(input: DepartureInput, who: CharacterState): boolean {
  return sliceActs(input.facts, input.sliceStart).some(
    (fact) =>
      input.tick - fact.tick < RECENT_TICKS && (fact.author === who.id || isDirectedTo(fact, who)),
  );
}

/**
 * The act of a character who decides to leave (simulation-model §11 item 1):
 * after acting or being addressed in the last 12 ticks, a `FAREWELL` to the
 * `GROUP`, `WARM` with affection ≥ 6000 for a listener (else `NEUTRAL`), about
 * small talk; otherwise a `LEAVE` to nobody. Intensity 3000, volume `NORMAL`.
 */
export function departureAct(input: DepartureInput, who: CharacterState): ActLabel {
  const common = {
    intensity: toBp(LEAVE_ACT_INTENSITY),
    volume: "NORMAL",
    isFalse: false,
  } as const;
  if (!recentlyEngaged(input, who)) {
    return { ...common, act: "LEAVE", tone: "NEUTRAL", targets: [], topic: { type: "NONE" } };
  }
  const voice = { volume: "NORMAL", noise: input.now.noise } as const;
  const fond = others(input, who).some(
    (other) =>
      earshot(input.grid, voice, who.cell, other.cell) === "DIRECT" &&
      bondToward(who.bonds, other.id).axes.affection >= WARM_FAREWELL,
  );
  const tone = fond ? "WARM" : "NEUTRAL";
  return { ...common, act: "FAREWELL", tone, targets: "GROUP", topic: { type: "SMALL_TALK" } };
}

/** Whether `who` decides to leave now, and whether it was forced. */
function decides(drawer: Drawer, input: DepartureInput, who: CharacterState): boolean | "FORCED" {
  const npc = input.player?.id !== who.id;
  if (npc && greatestNeed(who.body) >= CRITICAL) {
    return "FORCED";
  }
  const { leave, stay } = leaveScores(input, who);
  const lead = leave - stay;
  if (lead < LEAVE_MARGIN) {
    return false;
  }
  const p = clampInt(lead * LEAVE_SLOPE, 0, LEAVE_CHANCE_MAX);
  return drawer.drawChance("leave", p, "LEAVE_DECISION", who.id);
}

/**
 * The departures of a decision point (simulation-model §11 item 1): the
 * characters in `AUTO` who are not leaving, in id order, until the first who
 * decides to leave: a NPC whose greatest need is ≥ 9000 without a draw; anyone
 * else when `leave − stay ≥ 3000`, with a draw (`LEAVE_DECISION`, stream
 * `leave`) of `clamp((leave − stay) × 2, 0, 9500)`. The player in `MANUAL`
 * never leaves by itself.
 */
export function decideDepartures(drawer: Drawer, input: DepartureInput): Departure {
  const manual = input.player?.control === "MANUAL" ? input.player.id : null;
  const candidates = [...input.characters]
    .filter((character) => character.id !== manual && !input.turns.leaving.includes(character.id))
    .sort((a, b) => compareIds(a.id, b.id));
  for (const who of candidates) {
    const decision = decides(drawer, input, who);
    if (decision !== false) {
      const label = departureAct(input, who);
      return { kind: "LEAVE", character: who.id, forced: decision === "FORCED", label };
    }
  }
  return { kind: "NONE" };
}
