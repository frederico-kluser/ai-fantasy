/**
 * The deltas an act leaves on the characters (simulation-model §9): emotions,
 * bond axes toward someone, drive deficits and perceived values. The appraisal
 * computes them as a flat list (the inspector can show each one); this module
 * finishes the list for one act (surprise feeds predictability, equal deltas
 * sum, bonds are capped at ±1500 per axis per act), applies it, and gives the
 * importance of the new fact for each character (simulation-model §12).
 */
import { bondToward, type Bond } from "../character/bonds.ts";
import {
  directedDeficit,
  isDirected,
  withDirectedDeficit,
  type Drives,
} from "../character/drives.ts";
import {
  perceptionPreview,
  perceptionToward,
  type Perception,
  type PerceptionValues,
} from "../character/perception.ts";
import type { CharacterState } from "../character/state.ts";
import { effectiveTrait } from "../character/traits.ts";
import { toBp } from "../domain/bp.ts";
import { BOND_DELTA_CAP } from "../domain/constants.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";
import { clampInt, div } from "../domain/math.ts";
import { factImportance } from "../memory/copy.ts";
import type { CharacterImportance } from "../memory/record.ts";
import type { BondAxisId } from "../presets/bonds.ts";
import type { DriveId } from "../presets/drives.ts";
import type { EmotionId } from "../presets/emotions.ts";

/** One change of one character's state, in bp. */
export type StateDelta =
  | {
      readonly kind: "EMOTION";
      readonly who: CharacterId;
      readonly emotion: EmotionId;
      readonly delta: number;
    }
  | {
      readonly kind: "BOND";
      readonly who: CharacterId;
      readonly toward: CharacterId;
      readonly axis: BondAxisId;
      readonly delta: number;
    }
  | {
      readonly kind: "DRIVE";
      readonly who: CharacterId;
      readonly drive: DriveId;
      /** The person of a directed drive; `null` for the others. */
      readonly toward: CharacterId | null;
      readonly delta: number;
    }
  | {
      readonly kind: "PERCEPTION";
      readonly who: CharacterId;
      readonly toward: CharacterId;
      readonly value: keyof PerceptionValues;
      readonly delta: number;
    };

/** What a delta changes, without the amount: deltas with the same key sum. */
function keyOf(delta: StateDelta): string {
  return JSON.stringify({ ...delta, delta: 0 });
}

/** "Cada ganho de surpresa soma metade dele ao déficit de `predictability`" (dialogue-acts §7.1). */
function withPredictability(delta: StateDelta): StateDelta[] {
  const surprised = delta.kind === "EMOTION" && delta.emotion === "surprise" && delta.delta > 0;
  return surprised
    ? [
        delta,
        {
          kind: "DRIVE",
          who: delta.who,
          drive: "predictability",
          toward: null,
          delta: div(delta.delta, 2),
        },
      ]
    : [delta];
}

/** A bond delta limited to ±1500 (`BOND_DELTA_CAP`, simulation-model §9); the others as they are. */
function capped(delta: StateDelta): StateDelta {
  return delta.kind === "BOND"
    ? { ...delta, delta: clampInt(delta.delta, -BOND_DELTA_CAP, BOND_DELTA_CAP) }
    : delta;
}

/**
 * The deltas of one act, finished (simulation-model §9, dialogue-acts §7.1):
 * each surprise gain adds half of it to the predictability deficit; deltas of
 * the same value of the same person sum, in the place of the first; each bond
 * axis is capped at ±1500 per act; deltas that sum to 0 are dropped.
 */
export function finalizeDeltas(deltas: readonly StateDelta[]): StateDelta[] {
  const sums = new Map<string, StateDelta>();
  for (const delta of deltas.flatMap(withPredictability)) {
    const key = keyOf(delta);
    const held = sums.get(key);
    sums.set(key, { ...delta, delta: (held?.delta ?? 0) + delta.delta });
  }
  return [...sums.values()].map(capped).filter((delta) => delta.delta !== 0);
}

function withBond(bonds: readonly Bond[], toward: CharacterId, axis: BondAxisId, delta: number) {
  const bond = bondToward(bonds, toward);
  const axes = { ...bond.axes, [axis]: toBp(bond.axes[axis] + delta) };
  return [...bonds.filter((held) => held.target !== toward), { ...bond, axes }].sort((a, b) =>
    compareIds(a.target, b.target),
  );
}

function withDrive(drives: Drives, drive: DriveId, toward: CharacterId | null, delta: number) {
  if (isDirected(drive)) {
    // A directed delta always names its person (see StateDelta).
    const target = toward as CharacterId;
    const deficit = directedDeficit(drives, drive, target) + delta;
    const list = withDirectedDeficit(drives.directed[drive], target, deficit);
    return { ...drives, directed: { ...drives.directed, [drive]: list } };
  }
  const deficit = toBp(drives.deficits[drive] + delta);
  return { ...drives, deficits: { ...drives.deficits, [drive]: deficit } };
}

function withPerception(
  character: CharacterState,
  toward: CharacterId,
  value: keyof PerceptionValues,
  delta: number,
): Perception[] {
  const trust = effectiveTrait(character.traits, character.tendencies, "trustInOthers");
  const preview = perceptionPreview(bondToward(character.bonds, toward), trust);
  const perception = perceptionToward(character.perceptions, toward, preview);
  const moved = { ...perception, [value]: toBp(perception[value] + delta) };
  return [...character.perceptions.filter((held) => held.target !== toward), moved].sort((a, b) =>
    compareIds(a.target, b.target),
  );
}

/** Each kind of delta, applied to one character (every value clamped to its scale). */
const APPLY: {
  readonly [K in StateDelta["kind"]]: (
    character: CharacterState,
    delta: Extract<StateDelta, { readonly kind: K }>,
  ) => CharacterState;
} = {
  EMOTION: (character, { emotion, delta }) => ({
    ...character,
    emotions: { ...character.emotions, [emotion]: toBp(character.emotions[emotion] + delta) },
  }),
  BOND: (character, { toward, axis, delta }) => ({
    ...character,
    bonds: withBond(character.bonds, toward, axis, delta),
  }),
  DRIVE: (character, { drive, toward, delta }) => ({
    ...character,
    drives: withDrive(character.drives, drive, toward, delta),
  }),
  PERCEPTION: (character, { toward, value, delta }) => ({
    ...character,
    perceptions: withPerception(character, toward, value, delta),
  }),
};

function applyOne(character: CharacterState, delta: StateDelta): CharacterState {
  // The table entry of a kind takes exactly the deltas of that kind.
  const apply = APPLY[delta.kind] as (state: CharacterState, change: StateDelta) => CharacterState;
  return apply(character, delta);
}

/**
 * The characters with `deltas` applied, in order (simulation-model §9): every
 * value is clamped to its scale; a bond or a perception toward someone without
 * one starts from a stranger's bond or from the preview, kept in id order.
 */
export function applyDeltas(
  characters: readonly CharacterState[],
  deltas: readonly StateDelta[],
): CharacterState[] {
  return characters.map((character) =>
    deltas.filter((delta) => delta.who === character.id).reduce(applyOne, character),
  );
}

/**
 * The importance of the new fact for each of `ids` (simulation-model §12):
 * `Σ|emotion deltas| + 2 × Σ|bond deltas| + 3000` for the `involved`.
 */
export function importancesOf(
  deltas: readonly StateDelta[],
  ids: readonly CharacterId[],
  involved: readonly CharacterId[],
): CharacterImportance[] {
  const of = (id: CharacterId, kind: StateDelta["kind"]) =>
    deltas.filter((delta) => delta.who === id && delta.kind === kind).map((delta) => delta.delta);
  return ids.map((id) => ({
    id,
    importance: factImportance({
      emotionDeltas: of(id, "EMOTION"),
      bondDeltas: of(id, "BOND"),
      involved: involved.includes(id),
    }),
  }));
}
