/**
 * Builds the state of each character from the drawn values, the pairs and the
 * effects of the history (presets §10.1, "Efeitos da história"). Until the scene
 * opens, the body is at 0, the emotions at the baselines and the cell is 0.
 */
import type { Bond } from "../character/bonds.ts";
import {
  DIRECTED_DRIVE_IDS,
  isDirected,
  type DirectedDeficit,
  type DirectedDriveId,
  type Drives,
  type UndirectedDriveId,
} from "../character/drives.ts";
import { emotionBaselines, type EmotionShifts } from "../character/emotions.ts";
import type { CharacterState } from "../character/state.ts";
import type { Traits } from "../character/traits.ts";
import { toBipolarBp, toBp, type Bp } from "../domain/bp.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";
import { BOND_AXIS_IDS, type BondAxisId, type BondLabelId } from "../presets/bonds.ts";
import { BODY_NEED_IDS } from "../presets/body.ts";
import { DRIVE_IDS, type DriveId } from "../presets/drives.ts";
import { EMOTION_IDS } from "../presets/emotions.ts";
import { TRAIT_IDS } from "../presets/traits.ts";
import type { PairPlan } from "./graph.ts";
import type { DriveEffect, Effects } from "./history.ts";
import type { FactCopy } from "../memory/copy.ts";
import {
  DRAWN_DEFICIT_IDS,
  type BondDraft,
  type CharacterDraft,
  type DrawnDeficitId,
} from "./input.ts";

/** The deficit of a directed drive created by a bond or an event, before the events add (presets §5). */
export const CREATED_DIRECTED_DEFICIT = 3000;

/** A pair with its drawn values and the drives each side directs at the other. */
export interface DrawnPair {
  readonly plan: PairPlan;
  readonly draft: BondDraft;
  /** The drives each side directs at the other (presets §6; only directed drives). */
  readonly directed: {
    readonly aToB: readonly DriveId[];
    readonly bToA: readonly DriveId[];
  };
}

/** What a character holds toward the other side of a pair, before the history. */
interface PairSide {
  readonly target: CharacterId;
  readonly axes: BondDraft["aToB"];
  readonly labels: readonly BondLabelId[];
  readonly directed: readonly DriveId[];
}

function sideOf(pair: DrawnPair, holder: CharacterId): PairSide[] {
  const { plan, draft, directed } = pair;
  if (plan.a === holder) {
    return [
      { target: plan.b, axes: draft.aToB, labels: plan.labels.aToB, directed: directed.aToB },
    ];
  }
  if (plan.b === holder) {
    return [
      { target: plan.a, axes: draft.bToA, labels: plan.labels.bToA, directed: directed.bToA },
    ];
  }
  return [];
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** The effects of `holder`'s history, by kind. */
interface Ledger {
  readonly bondDelta: (target: CharacterId, axis: BondAxisId) => number;
  readonly driveDeltas: (drive: string) => readonly DriveEffect[];
  readonly shift: (emotion: string) => number;
  readonly copies: readonly FactCopy[];
}

function ledgerOf(effects: Effects, holder: CharacterId): Ledger {
  const own = <T extends { readonly holder: CharacterId }>(list: readonly T[]) =>
    list.filter((effect) => effect.holder === holder);
  const bonds = own(effects.bonds);
  const drives = own(effects.drives);
  const shifts = own(effects.shifts);
  const deltas = (list: readonly { readonly delta: number }[]) => sum(list.map((e) => e.delta));
  return {
    bondDelta: (target, axis) =>
      deltas(bonds.filter((e) => e.target === target && e.axis === axis)),
    driveDeltas: (drive) => drives.filter((e) => e.drive === drive),
    shift: (emotion) => deltas(shifts.filter((e) => e.emotion === emotion)),
    copies: own(effects.copies).map((e) => e.copy),
  };
}

function bondOf(side: PairSide, ledger: Ledger): Bond {
  const entries = BOND_AXIS_IDS.map((axis): [BondAxisId, Bp] => [
    axis,
    toBp(side.axes[axis] + ledger.bondDelta(side.target, axis)),
  ]);
  // Every axis id has just been given a value.
  return {
    target: side.target,
    axes: Object.fromEntries(entries) as Bond["axes"],
    labels: side.labels,
  };
}

/** A directed drive toward each target a bond or an event created it for: 3000 plus the events' deltas. */
function directedList(
  drive: DirectedDriveId,
  sides: readonly PairSide[],
  ledger: Ledger,
): DirectedDeficit[] {
  const deltas = ledger.driveDeltas(drive);
  const targets = new Set([
    ...sides.filter((side) => side.directed.includes(drive)).map((side) => side.target),
    ...deltas.map((entry) => entry.target),
  ]);
  return [...targets].sort(compareIds).map((target) => ({
    target,
    deficit: toBp(
      CREATED_DIRECTED_DEFICIT + sum(deltas.filter((d) => d.target === target).map((d) => d.delta)),
    ),
  }));
}

function isDrawnDeficit(drive: string): drive is DrawnDeficitId {
  return DRAWN_DEFICIT_IDS.some((id) => id === drive);
}

function drivesOf(draft: CharacterDraft, sides: readonly PairSide[], ledger: Ledger): Drives {
  const undirected = DRIVE_IDS.filter((drive): drive is UndirectedDriveId => !isDirected(drive));
  const deficits = undirected.map((drive): [UndirectedDriveId, Bp] => {
    const drawn = isDrawnDeficit(drive) ? draft.deficits[drive] : 0;
    return [drive, toBp(drawn + sum(ledger.driveDeltas(drive).map((entry) => entry.delta)))];
  });
  const directed = DIRECTED_DRIVE_IDS.map((drive) => [drive, directedList(drive, sides, ledger)]);
  // Each record has one value per id of its kind.
  return {
    weights: draft.weights,
    deficits: Object.fromEntries(deficits) as Drives["deficits"],
    directed: Object.fromEntries(directed) as Drives["directed"],
  };
}

function zeroRecord<K extends string, V>(ids: readonly K[], value: V): Record<K, V> {
  // One value per id.
  return Object.fromEntries(ids.map((id) => [id, value])) as Record<K, V>;
}

/**
 * The state of character `id` before the scene opens. The pairs come in pair
 * order (lower id, then the other) and the facts in the same order, so the
 * bonds of a character are already sorted by target and its copies by fact id.
 */
export function assembleCharacter(
  id: CharacterId,
  draft: CharacterDraft,
  pairs: readonly DrawnPair[],
  effects: Effects,
): CharacterState {
  const ledger = ledgerOf(effects, id);
  const sides = pairs.flatMap((pair) => sideOf(pair, id));
  const baselineShifts = Object.fromEntries(
    EMOTION_IDS.map((emotion) => [emotion, toBipolarBp(ledger.shift(emotion))]),
  ) as EmotionShifts;
  const traits: Traits = draft.traits;
  const baselines = emotionBaselines(traits, baselineShifts);
  const { thermal, ...needs } = zeroRecord(BODY_NEED_IDS, toBp(0));
  return {
    id,
    cell: 0,
    traits,
    tendencies: zeroRecord(TRAIT_IDS, toBipolarBp(0)),
    aptitudes: draft.aptitudes,
    baselineShifts,
    baselines,
    emotions: baselines,
    body: { ...needs, thermal: toBipolarBp(thermal) },
    drives: drivesOf(draft, sides, ledger),
    bonds: sides.map((side) => bondOf(side, ledger)),
    associations: draft.associations,
    perceptions: [],
    memories: ledger.copies,
    historyApplied: [],
    threat: toBp(0),
  };
}
