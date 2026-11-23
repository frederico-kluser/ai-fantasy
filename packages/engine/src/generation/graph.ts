/**
 * The graph of bonds (presets §6): the chosen pairs, the coherence rules (one
 * spouse and one partner per character, no parent cycle, one kinship per pair)
 * and the transitive family (siblings and grandparents) the generator adds.
 */
import type { CharacterId } from "../domain/ids.ts";
import type { BondArchetypeId } from "../presets/bond-archetypes.ts";
import { BOND_LABEL_IDS, type BondLabelId } from "../presets/bonds.ts";
import { castError, type CastError, type CastErrorCode } from "./errors.ts";
import type { BondDraft, BondSpec, DerivedLock, EventSpec } from "./input.ts";

/** One directed label the family adds: `holder` holds `label` for `target`. */
interface FamilyLink {
  readonly holder: CharacterId;
  readonly target: CharacterId;
  readonly label: BondLabelId;
}

/** A pair of the cast with its bond, chosen or added by the transitive family. */
export interface PairPlan {
  /** Side A of the archetype (presets §6). */
  readonly a: CharacterId;
  readonly b: CharacterId;
  /** The archetype whose axes are drawn. */
  readonly archetype: BondArchetypeId;
  /** The labels of each side, in catalog order. */
  readonly labels: { readonly aToB: readonly BondLabelId[]; readonly bToA: readonly BondLabelId[] };
  readonly events: readonly EventSpec[];
  readonly locked: BondDraft | null;
  /** The index of the bond in the input, or `null` for a pair the family added. */
  readonly input: number | null;
}

/** The key of an unordered pair: `<lower id>.<other id>`. */
export function pairKey(x: number, y: number): string {
  return `${Math.min(x, y)}.${Math.max(x, y)}`;
}

function idOf(value: number): CharacterId {
  // Indices of characters were checked against the cast before the graph is read.
  return value as CharacterId;
}

/** Archetypes a character may hold once, with the error of a second one (presets §6 rule 1). */
const ONCE_ONLY: Readonly<Partial<Record<BondArchetypeId, CastErrorCode>>> = {
  spouses: "TOO_MANY_SPOUSES",
  lovers: "TOO_MANY_PARTNERS",
};

function onceOnlyErrors(bonds: readonly BondSpec[]): CastError[] {
  return bonds.flatMap((bond, index) => {
    const code = ONCE_ONLY[bond.archetype];
    const earlier = bonds.slice(0, index).filter((other) => other.archetype === bond.archetype);
    const ends = earlier.flatMap((other) => [other.a, other.b]);
    const repeated = ends.includes(bond.a) || ends.includes(bond.b);
    const message = `a character already holds a ${bond.archetype} bond`;
    return code !== undefined && repeated ? [castError(code, `bonds.${index}`, message)] : [];
  });
}

/** The `[parent, child]` edges of the chosen `parent_child` bonds. */
function parentEdges(bonds: readonly BondSpec[]): (readonly [CharacterId, CharacterId])[] {
  return bonds
    .filter((bond) => bond.archetype === "parent_child")
    .map((bond) => [idOf(bond.a), idOf(bond.b)] as const);
}

/** A chosen `parent_child` bond: its index in the input, the parent and the child. */
interface ParentBond {
  readonly index: number;
  readonly parent: number;
  readonly child: number;
}

/**
 * The parent bonds that lie on a cycle: bonds whose child is nobody's parent,
 * or whose parent is nobody's child, are dropped until none drops.
 */
function cycleBonds(bonds: readonly BondSpec[]): ParentBond[] {
  let left = bonds.flatMap((bond, index) =>
    bond.archetype === "parent_child" ? [{ index, parent: bond.a, child: bond.b }] : [],
  );
  let size = -1;
  while (left.length !== size) {
    size = left.length;
    const parents = new Set(left.map((edge) => edge.parent));
    const children = new Set(left.map((edge) => edge.child));
    left = left.filter((edge) => parents.has(edge.child) && children.has(edge.parent));
  }
  return left;
}

function link(holder: CharacterId, target: CharacterId, label: BondLabelId): FamilyLink {
  return { holder, target, label };
}

/** Siblings (children of the same parent) and grandparents (presets §6 rule 3). */
function familyLinks(edges: readonly (readonly [CharacterId, CharacterId])[]): FamilyLink[] {
  return edges.flatMap(([parent, child]) =>
    edges.flatMap(([other, second]) => {
      const siblings =
        other === parent && child < second
          ? [link(child, second, "SIBLING"), link(second, child, "SIBLING")]
          : [];
      const grand =
        other === child
          ? [link(parent, second, "GRANDPARENT"), link(second, parent, "GRANDCHILD")]
          : [];
      return [...siblings, ...grand];
    }),
  );
}

/** The kinship each label means for the conflict rule; other labels mean none. */
const KINSHIP: Readonly<Partial<Record<BondLabelId, string>>> = {
  PARENT: "PARENT",
  CHILD: "PARENT",
  SIBLING: "SIBLING",
  GRANDPARENT: "GRANDPARENT",
  GRANDCHILD: "GRANDPARENT",
};

/**
 * The pairs with two kinships once the family is transitive (presets §6): a
 * pair is parent and child, siblings, or grandparent and grandchild, never two
 * of these. Checked on the labels of both sides, in pair order.
 */
export function conflictErrors(pairs: readonly PairPlan[]): CastError[] {
  return pairs.flatMap((pair) => {
    const labels = [...pair.labels.aToB, ...pair.labels.bToA];
    const kinds = [...new Set(labels.flatMap((label) => KINSHIP[label] ?? []))].sort();
    const key = pairKey(pair.a, pair.b);
    const message = `the pair ${key} would be ${kinds.join(" and ")}`;
    return kinds.length > 1 ? [castError("FAMILY_CONFLICT", `pair.${key}`, message)] : [];
  });
}

/** The two ids of a pair key, lower first. */
function idsOfKey(key: string): readonly [number, number] {
  const [lower = 0, upper = 0] = key.split(".").map(Number);
  return [lower, upper];
}

/** Pair order: by the lower id, then by the other. */
function comparePairKeys(x: string, y: string): number {
  const [x1, x2] = idsOfKey(x);
  const [y1, y2] = idsOfKey(y);
  return x1 - y1 || x2 - y2;
}

/**
 * The coherence problems of the chosen bonds (presets §6): a second spouse or
 * partner, or a parent cycle (one error per bond on it). Kinship conflicts are
 * checked on the pairs ({@link conflictErrors}). Expects bonds between
 * distinct, existing characters.
 */
export function graphErrors(bonds: readonly BondSpec[]): CastError[] {
  const cycle = cycleBonds(bonds);
  if (cycle.length > 0) {
    const message = "PARENT bonds form a cycle: someone would be their own ancestor";
    const cycleErrors = cycle.map((edge) =>
      castError(
        "PARENT_CYCLE",
        `bonds.${edge.index}`,
        `${message} (${edge.parent} → ${edge.child})`,
      ),
    );
    return [...onceOnlyErrors(bonds), ...cycleErrors];
  }
  return onceOnlyErrors(bonds);
}

function inCatalogOrder(labels: readonly BondLabelId[]): BondLabelId[] {
  return BOND_LABEL_IDS.filter((label) => labels.includes(label));
}

/** The labels `links` give `holder` for `target`. */
function labelsFor(links: readonly FamilyLink[], holder: number, target: number): BondLabelId[] {
  return links
    .filter((entry) => entry.holder === holder && entry.target === target)
    .map((entry) => entry.label);
}

/** The archetype and side A of a pair the family adds without a chosen bond (presets §10.1 step 3). */
function derivedPair(
  links: readonly FamilyLink[],
  key: string,
  locks: readonly DerivedLock[],
): PairPlan {
  const [lower, upper] = idsOfKey(key);
  const grand = links.find(
    (entry) => pairKey(entry.holder, entry.target) === key && entry.label === "GRANDPARENT",
  );
  const a = idOf(grand?.holder ?? lower);
  const b = idOf(a === lower ? upper : lower);
  return {
    a,
    b,
    archetype: grand === undefined ? "siblings" : "parent_child",
    labels: {
      aToB: inCatalogOrder(labelsFor(links, a, b)),
      bToA: inCatalogOrder(labelsFor(links, b, a)),
    },
    events: [],
    locked: locks.find((lock) => lock.a === a && lock.b === b)?.locked ?? null,
    input: null,
  };
}

function comparePairPlans(x: PairPlan, y: PairPlan): number {
  return comparePairKeys(pairKey(x.a, x.b), pairKey(y.a, y.b));
}

/**
 * Every pair of the cast with a bond, in pair order (lower id, then the other):
 * the chosen bonds with their archetype labels plus the family ones, and the
 * pairs the transitive family adds, with their locks. Expects a graph without
 * cycles ({@link graphErrors}).
 */
export function pairPlans(
  bonds: readonly BondSpec[],
  sideLabels: (archetype: BondArchetypeId) => readonly [BondLabelId, BondLabelId],
  locks: readonly DerivedLock[],
): PairPlan[] {
  const links = familyLinks(parentEdges(bonds));
  const chosen = bonds.map((bond, index): PairPlan => {
    const [aLabel, bLabel] = sideLabels(bond.archetype);
    const aToB = inCatalogOrder([aLabel, ...labelsFor(links, bond.a, bond.b)]);
    const bToA = inCatalogOrder([bLabel, ...labelsFor(links, bond.b, bond.a)]);
    const { events, locked, archetype } = bond;
    return {
      a: idOf(bond.a),
      b: idOf(bond.b),
      archetype,
      labels: { aToB, bToA },
      events,
      locked,
      input: index,
    };
  });
  const taken = new Set(chosen.map((pair) => pairKey(pair.a, pair.b)));
  const added = [...new Set(links.map((entry) => pairKey(entry.holder, entry.target)))]
    .filter((key) => !taken.has(key))
    .map((key) => derivedPair(links, key, locks));
  return [...chosen, ...added].sort(comparePairPlans);
}
