/**
 * Test support for the character module: factories that build status layers
 * from a few overrides (testing-strategy §4: `aCharacter().withTrait(…)` style,
 * never giant copied objects) and loops that run a rule for many ticks.
 */
import fc from "fast-check";

import { toBipolarBp, toBp, type BipolarBp, type Bp } from "../../src/domain/bp.ts";
import type { CharacterId } from "../../src/domain/ids.ts";
import { DRIVE_IDS, type DriveId } from "../../src/presets/drives.ts";
import type { BodyNeedId } from "../../src/presets/body.ts";
import { EMOTION_IDS, type EmotionId } from "../../src/presets/emotions.ts";
import { TRAIT_IDS, type TraitId } from "../../src/presets/traits.ts";
import { bodyTick, type Body, type BodyTickInput } from "../../src/character/body.ts";
import type { Traits } from "../../src/character/traits.ts";
import {
  DIRECTED_DRIVE_IDS,
  DRIVE_LEVELS,
  directedDeficit,
  isDirected,
  withDirectedDeficit,
  type DirectedDeficit,
  type DirectedDriveId,
  type Drives,
  type UndirectedDriveId,
} from "../../src/character/drives.ts";
import {
  emotionsTick,
  type EmotionTickInput,
  type Emotions,
} from "../../src/character/emotions.ts";

/** A body at rest: every need at 0, thermal 0, with the overrides given. */
export function aBody(overrides: Partial<Record<BodyNeedId, number>> = {}): Body {
  const need = (id: Exclude<BodyNeedId, "thermal">): Bp => toBp(overrides[id] ?? 0);
  return {
    fatigue: need("fatigue"),
    hunger: need("hunger"),
    thirst: need("thirst"),
    bladder: need("bladder"),
    pain: need("pain"),
    thermal: toBipolarBp(overrides.thermal ?? 0),
    intoxication: need("intoxication"),
  };
}

/** The body after `ticks` ticks with the same input. */
export function ticksOfBody(body: Body, input: BodyTickInput, ticks: number): Body {
  let current = body;
  for (let tick = 0; tick < ticks; tick += 1) {
    current = bodyTick(current, input);
  }
  return current;
}

/** Traits (or tendencies) at 0, with the overrides given. */
export function someTraits(overrides: Partial<Record<TraitId, number>> = {}): Traits {
  const entries = TRAIT_IDS.map((id): [TraitId, BipolarBp] => [
    id,
    toBipolarBp(overrides[id] ?? 0),
  ]);
  // Every trait id has just been given a value.
  return Object.fromEntries(entries) as Traits;
}

/** Emotions (or baselines) at 0, with the overrides given. */
export function someEmotions(overrides: Partial<Record<EmotionId, number>> = {}): Emotions {
  const entries = EMOTION_IDS.map((id): [EmotionId, Bp] => [id, toBp(overrides[id] ?? 0)]);
  // Every emotion id has just been given a value.
  return Object.fromEntries(entries) as Emotions;
}

/** The emotions after `ticks` ticks with the same baselines and input. */
export function ticksOfEmotions(
  emotions: Emotions,
  baselines: Emotions,
  input: EmotionTickInput,
  ticks: number,
): Emotions {
  let current = emotions;
  for (let tick = 0; tick < ticks; tick += 1) {
    current = emotionsTick(current, baselines, input);
  }
  return current;
}

/** Overrides of {@link someDrives}: directed deficits as `[target, deficit]` pairs. */
export interface DriveOverrides {
  readonly weights?: Partial<Record<DriveId, number>>;
  readonly deficits?: Partial<Record<UndirectedDriveId, number>>;
  readonly directed?: Partial<Record<DirectedDriveId, readonly (readonly [number, number])[]>>;
}

function directedList(pairs: readonly (readonly [number, number])[]): DirectedDeficit[] {
  return pairs.reduce<DirectedDeficit[]>(
    (list, [target, deficit]) => withDirectedDeficit(list, target as CharacterId, deficit),
    [],
  );
}

/** Drives with every weight and deficit at 0 and no directed entry, with the overrides given. */
export function someDrives(overrides: DriveOverrides = {}): Drives {
  const weights = DRIVE_IDS.map((id): [DriveId, Bp] => [id, toBp(overrides.weights?.[id] ?? 0)]);
  const undirected = DRIVE_IDS.filter((id): id is UndirectedDriveId => !isDirected(id));
  const deficits = undirected.map((id): [DriveId, Bp] => [id, toBp(overrides.deficits?.[id] ?? 0)]);
  const directed = (id: DirectedDriveId) => directedList(overrides.directed?.[id] ?? []);
  // Every id of each record has just been given a value.
  return {
    weights: Object.fromEntries(weights) as Drives["weights"],
    deficits: Object.fromEntries(deficits) as Drives["deficits"],
    directed: {
      intimacy: directed("intimacy"),
      desire: directed("desire"),
      care: directed("care"),
      justice: directed("justice"),
    },
  };
}

const bpValue = fc.integer({ min: 0, max: 10000 });
const targetPairs = fc.array(fc.tuple(fc.integer({ min: 0, max: 3 }), bpValue), { maxLength: 4 });

/** A record of the same arbitrary for every id. */
function sameForEach(ids: readonly string[], value: fc.Arbitrary<unknown>) {
  return fc.record(Object.fromEntries(ids.map((id) => [id, value])));
}

/** Random drives: any weights and deficits, up to 4 directed entries per drive toward ids 0..3. */
export function arbitraryDrives(): fc.Arbitrary<Drives> {
  const undirected = DRIVE_IDS.filter((id) => !isDirected(id));
  return (
    fc
      .record({
        weights: sameForEach(DRIVE_IDS, bpValue),
        deficits: sameForEach(undirected, bpValue),
        directed: sameForEach(DIRECTED_DRIVE_IDS, targetPairs),
      })
      // The records have one generated value of the right kind per id.
      .map((drawn) => someDrives(drawn as DriveOverrides))
  );
}

/** Drives before and after raising one deficit of a lower level, and a drive of a higher level. */
export interface RaisedLowDeficit {
  readonly before: Drives;
  readonly after: Drives;
  readonly higher: DriveId;
}

function raise(drives: Drives, low: DriveId, target: CharacterId, amount: number): Drives {
  if (isDirected(low)) {
    const deficit = directedDeficit(drives, low, target) + amount;
    const list = withDirectedDeficit(drives.directed[low], target, deficit);
    return { ...drives, directed: { ...drives.directed, [low]: list } };
  }
  const deficit = toBp(drives.deficits[low] + amount);
  return { ...drives, deficits: { ...drives.deficits, [low]: deficit } };
}

/** Random drives with one lower-level deficit raised (for invariant 6 of simulation-model §18). */
export function arbitraryRaisedLowDeficit(): fc.Arbitrary<RaisedLowDeficit> {
  const pairs = DRIVE_IDS.flatMap((low) =>
    DRIVE_IDS.filter((high) => DRIVE_LEVELS[high] > DRIVE_LEVELS[low]).map(
      (high) => [low, high] as const,
    ),
  );
  return fc
    .record({
      drives: arbitraryDrives(),
      pair: fc.constantFrom(...pairs),
      target: fc.integer({ min: 0, max: 3 }),
      amount: fc.integer({ min: 0, max: 10000 }),
    })
    .map(({ drives, pair: [low, higher], target, amount }) => ({
      before: drives,
      after: raise(drives, low, target as CharacterId, amount),
      higher,
    }));
}
