/**
 * The drawn values of a character (presets §5 and §8, §10.1 step 1): traits
 * around the archetype, aptitudes, drive weights and deficits by dominance, and
 * associations. Every draw is in the `generation` stream.
 */
import { BIPOLAR_MIN, BP_MAX, toBipolarBp, toBp, type BipolarBp, type Bp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import { itemAt } from "../domain/lookup.ts";
import type { Drawer } from "../rng/drawer.ts";
import type { CharacterArchetype } from "../presets/character-archetypes.ts";
import { DRIVE_IDS, type DriveId } from "../presets/drives.ts";
import { ASSOCIATION_TAG_IDS, type AssociationTagId } from "../presets/tags.ts";
import { APTITUDE_IDS, TRAIT_IDS } from "../presets/traits.ts";
import { DRAWN_DEFICIT_IDS, type CharacterDraft, type CharacterSpec } from "./input.ts";
import { around, drawInRange, type Range } from "./ranges.ts";

/** Ranges of presets §5 for what the archetype does not set, and the spread of what it sets. */
const RANGES = {
  traitSpread: 1500,
  uncitedTrait: { min: -2000, max: 2000 },
  aptitude: { min: 3500, max: 6500 },
  highAptitude: { min: 6500, max: 8500 },
  dominantWeight: { min: 7000, max: 9000 },
  otherWeight: { min: 2000, max: 5000 },
  dominantDeficit: { min: 4000, max: 6000 },
  otherDeficit: { min: 2000, max: 4000 },
} as const;

/** Associations of presets §8: up to 2 drawn, 7000 of being a fear, and their valences. */
const ASSOCIATIONS = {
  drawnMax: 2,
  fearChance: 7000,
  fear: { min: -8000, max: -4000 },
  attachment: { min: 3000, max: 6000 },
  /** The valence of the association the SOM picks. */
  chosen: { FEAR: -6000, ATTACHMENT: 5000 },
} as const;

/** Dominant drives of a character at most (simulation-model §5.3). */
const DOMINANTS_MAX = 3;

/**
 * The dominant drives (presets §5): the SOM picks first, then the archetype's,
 * without repeats, up to 3.
 *
 * @example
 * dominantDrivesOf(caretaker, ["fun", "care"]); // ["fun", "care", "intimacy"]
 */
export function dominantDrivesOf(
  archetype: CharacterArchetype,
  picks: readonly DriveId[],
): DriveId[] {
  return [...new Set([...picks, ...archetype.dominantDrives])].slice(0, DOMINANTS_MAX);
}

/** A record with one drawn value per id, drawn in the order of `ids`. */
function drawRecord<K extends string, V>(ids: readonly K[], draw: (id: K) => V): Record<K, V> {
  // Every id gets its value in order, so the draws follow the catalog order.
  return Object.fromEntries(ids.map((id) => [id, draw(id)])) as Record<K, V>;
}

type TagAssociation = CharacterDraft["associations"][number];

function tagAssociation(tag: AssociationTagId, valence: number): TagAssociation {
  return { subject: { kind: "TAG", tag }, valence: toBipolarBp(valence) };
}

function drawAssociation(
  drawer: Drawer,
  taken: readonly TagAssociation[],
  id: CharacterId,
): TagAssociation {
  const free = ASSOCIATION_TAG_IDS.filter((tag) => taken.every((a) => a.subject.tag !== tag));
  const tag = itemAt(free, drawer.draw("generation", free.length, "ASSOCIATION_TAG", id));
  const fear = drawer.drawChance("generation", ASSOCIATIONS.fearChance, "ASSOCIATION_FEAR", id);
  const range = fear ? ASSOCIATIONS.fear : ASSOCIATIONS.attachment;
  const label = { stream: "generation", purpose: "ASSOCIATION_VALENCE", target: id } as const;
  return tagAssociation(tag, drawInRange(drawer, range, label));
}

/** The SOM's association first, then 0 to 2 drawn among the tags not used yet (presets §8). */
function drawAssociations(drawer: Drawer, spec: CharacterSpec, id: CharacterId): TagAssociation[] {
  const chosen = spec.association;
  const first =
    chosen === null ? [] : [tagAssociation(chosen.tag, ASSOCIATIONS.chosen[chosen.kind])];
  const count = drawer.draw("generation", ASSOCIATIONS.drawnMax + 1, "ASSOCIATION_COUNT", id);
  return Array.from({ length: count }).reduce<TagAssociation[]>(
    (list) => [...list, drawAssociation(drawer, list, id)],
    first,
  );
}

function traitRange(archetype: CharacterArchetype, trait: (typeof TRAIT_IDS)[number]): Range {
  const cited = archetype.traits[trait];
  return cited === undefined
    ? RANGES.uncitedTrait
    : around(cited, RANGES.traitSpread, BIPOLAR_MIN, BP_MAX);
}

/**
 * Draws the values of a character (presets §10.1 step 1): traits, aptitudes,
 * drive weights, drawn deficits and associations, in this order.
 */
export function drawCharacter(
  drawer: Drawer,
  archetype: CharacterArchetype,
  spec: CharacterSpec,
  id: CharacterId,
): CharacterDraft {
  const draw = (range: Range, purpose: string) =>
    drawInRange(drawer, range, { stream: "generation", purpose, target: id });
  const dominants: readonly DriveId[] = dominantDrivesOf(archetype, spec.dominantDrives);
  const isDominant = (drive: DriveId) => dominants.includes(drive);
  const traits = drawRecord(TRAIT_IDS, (trait): BipolarBp =>
    toBipolarBp(draw(traitRange(archetype, trait), "TRAIT")),
  );
  const aptitudes = drawRecord(APTITUDE_IDS, (aptitude): Bp => {
    const high = archetype.highAptitudes.includes(aptitude);
    return toBp(draw(high ? RANGES.highAptitude : RANGES.aptitude, "APTITUDE"));
  });
  const weights = drawRecord(DRIVE_IDS, (drive): Bp =>
    toBp(draw(isDominant(drive) ? RANGES.dominantWeight : RANGES.otherWeight, "DRIVE_WEIGHT")),
  );
  const deficits = drawRecord(DRAWN_DEFICIT_IDS, (drive): Bp =>
    toBp(draw(isDominant(drive) ? RANGES.dominantDeficit : RANGES.otherDeficit, "DRIVE_DEFICIT")),
  );
  return { traits, aptitudes, weights, deficits, associations: drawAssociations(drawer, spec, id) };
}
