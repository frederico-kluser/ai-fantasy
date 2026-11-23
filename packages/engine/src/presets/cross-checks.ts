/**
 * Rules across catalogs (simulation-model §5.1, §5.3 and §5.4; presets §6),
 * checked once every preset passed its schema and every id is in place, so
 * each catalog is complete here.
 */
import type { Presets } from "./catalogs.ts";
import { inconsistent, type PresetError } from "./errors.ts";

const SIDES = ["aToB", "bToA"] as const;
const OPPOSITE = { aToB: "bToA", bToA: "aToB" } as const;

/**
 * simulation-model §5.4: the reciprocal of a family or role label is a label of
 * the same kind whose reciprocal is the first one.
 */
function labelReciprocals(labels: Presets["bondLabels"]): PresetError[] {
  const links = new Set(
    labels.map((label) => `${label.id}:${label.kind}:${String(label.reciprocal)}`),
  );
  return labels.flatMap((label, index) => {
    if (label.reciprocal === null) {
      return [];
    }
    const back = `${label.reciprocal}:${label.kind}:${label.id}`;
    const place = { catalog: "bondLabels", index, presetId: label.id, path: "reciprocal" } as const;
    const message = `${label.reciprocal} must be a ${label.kind} label whose reciprocal is ${label.id}`;
    return links.has(back) ? [] : [inconsistent(place, message)];
  });
}

/**
 * simulation-model §5.4 and presets §6: a family or role label on one side of
 * a bond archetype asks for its reciprocal on the other side.
 */
function archetypeLabels({ bondLabels, bondArchetypes }: Presets): PresetError[] {
  const reciprocals = new Map(bondLabels.map((label) => [label.id, label.reciprocal]));
  return bondArchetypes.flatMap((archetype, index) =>
    SIDES.flatMap((side) => {
      const asking = archetype[OPPOSITE[side]].label;
      const expected = reciprocals.get(asking) ?? null;
      const actual = archetype[side].label;
      if (expected === null || actual === expected) {
        return [];
      }
      const place = {
        catalog: "bondArchetypes",
        index,
        presetId: archetype.id,
        path: `${side}.label`,
      } as const;
      return [inconsistent(place, `${actual} must be ${expected}, the reciprocal of ${asking}`)];
    }),
  );
}

/** simulation-model §5.3 and presets §6: a bond directs only directed drives at the other. */
function undirectedDrives({ drives, bondArchetypes }: Presets): PresetError[] {
  const directed = new Set(drives.filter((drive) => drive.directed).map((drive) => drive.id));
  return bondArchetypes.flatMap((archetype, index) =>
    SIDES.flatMap((side) =>
      archetype[side].directedDrives.flatMap((drive, position) => {
        const path = `${side}.directedDrives.${position}`;
        const place = { catalog: "bondArchetypes", index, presetId: archetype.id, path } as const;
        return directed.has(drive) ? [] : [inconsistent(place, `${drive} is not a directed drive`)];
      }),
    ),
  );
}

/** simulation-model §5.1: only the bipolar need may open below 0 in a day state. */
function negativeNeeds({ bodyNeeds, dayStates }: Presets): PresetError[] {
  const unipolar = bodyNeeds.filter((need) => need.scale === "UNIPOLAR").map((need) => need.id);
  return dayStates.flatMap((state, index) =>
    unipolar.flatMap((need) => {
      const range = state.body[need];
      const place = {
        catalog: "dayStates",
        index,
        presetId: state.id,
        path: `body.${need}.min`,
      } as const;
      const message = `${need} is unipolar: its range starts at 0 or more`;
      return range !== undefined && range.min < 0 ? [inconsistent(place, message)] : [];
    }),
  );
}

/** Every rule across catalogs that the presets break, in a fixed order. */
export function crossCatalogProblems(presets: Presets): PresetError[] {
  return [
    ...labelReciprocals(presets.bondLabels),
    ...archetypeLabels(presets),
    ...undirectedDrives(presets),
    ...negativeNeeds(presets),
  ];
}
