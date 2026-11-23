/**
 * The tension hook (presets §10 step 6): when characters know each other and
 * no bond has tension, the pair with the lowest ids gets a tension event, drawn
 * with who did it, so the scene has something to talk about.
 */
import { bondToward } from "../character/bonds.ts";
import { directedDeficit } from "../character/drives.ts";
import type { CharacterState } from "../character/state.ts";
import type { CharacterId } from "../domain/ids.ts";
import { itemAt } from "../domain/lookup.ts";
import type { HistoryFact } from "../memory/fact.ts";
import type { Drawer } from "../rng/drawer.ts";
import type { BondLabelId } from "../presets/bonds.ts";
import type { HistoryEvent, HistoryEventId } from "../presets/history-events.ts";
import { drawSecret, possibleSecrets } from "./bond-draft.ts";
import { pairKey, type PairPlan } from "./graph.ts";
import type { PlacedEvent } from "./history.ts";

/** The events the hook draws from, with equal weights (presets §10 step 6). */
export const TENSION_EVENTS: readonly HistoryEventId[] = [
  "betrayed_trust",
  "lent_not_repaid",
  "secret_affair",
  "rejected_love",
  "broken_promise",
  "informed_on",
];

/** Thresholds of the tension definition (presets §10 step 6). */
const TENSION = { level: 3000, attracted: 6000, cold: 2000 } as const;

const DEBT_LABELS: readonly BondLabelId[] = ["CREDITOR", "DEBTOR"];

/** Tension from one side: resentment or fear ≥ 3000, a debt label or directed justice ≥ 3000. */
function sideTension(holder: CharacterState, other: CharacterId): boolean {
  const bond = bondToward(holder.bonds, other);
  return (
    bond.axes.resentment >= TENSION.level ||
    bond.axes.fearOf >= TENSION.level ||
    bond.labels.some((label) => DEBT_LABELS.includes(label)) ||
    directedDeficit(holder.drives, "justice", other) >= TENSION.level
  );
}

/** One side attracted (≥ 6000) and the other cold (≤ 2000). */
function unevenAttraction(holder: CharacterState, other: CharacterState): boolean {
  return (
    bondToward(holder.bonds, other.id).axes.attraction >= TENSION.attracted &&
    bondToward(other.bonds, holder.id).axes.attraction <= TENSION.cold
  );
}

/** Whether the bond between `x` and `y` has tension (presets §10 step 6), in either direction. */
export function hasTension(
  x: CharacterState,
  y: CharacterState,
  facts: readonly HistoryFact[],
): boolean {
  const key = pairKey(x.id, y.id);
  return (
    sideTension(x, y.id) ||
    sideTension(y, x.id) ||
    unevenAttraction(x, y) ||
    unevenAttraction(y, x) ||
    facts.some((fact) => fact.secret && pairKey(fact.author, fact.subject) === key)
  );
}

/**
 * The pair that gets the hook, lower id first: the first pair (in pair order)
 * whose bond is not `strangers`, when no pair has tension; `null` otherwise.
 */
export function hookPair(
  pairs: readonly PairPlan[],
  characters: readonly CharacterState[],
  facts: readonly HistoryFact[],
): readonly [CharacterId, CharacterId] | null {
  const known = pairs.find((pair) => pair.archetype !== "strangers");
  const tense = pairs.some((pair) =>
    hasTension(itemAt(characters, pair.a), itemAt(characters, pair.b), facts),
  );
  if (known === undefined || tense) {
    return null;
  }
  return known.a < known.b ? [known.a, known.b] : [known.b, known.a];
}

/**
 * Draws the hook event of a pair (presets §10 step 6 and §10.1 step 5): who did
 * it (`TENSION_AUTHOR`: 0 is the lower id), then the event among the six with
 * equal weights, weight 0 for those that would leave the pair without tension
 * for some secret mark they can have (`TENSION_EVENT`), then its secret.
 *
 * @param tenses whether the pair has tension once `placed` is added to the history.
 */
export function drawHook(
  drawer: Drawer,
  [lower, upper]: readonly [CharacterId, CharacterId],
  presetOf: (event: HistoryEventId) => HistoryEvent,
  tenses: (placed: PlacedEvent) => boolean,
): PlacedEvent {
  const second = drawer.draw("generation", 2, "TENSION_AUTHOR", lower) === 1;
  const [author, subject] = second ? [upper, lower] : [lower, upper];
  const weights = TENSION_EVENTS.map((event) =>
    possibleSecrets(presetOf(event)).every((secret) => tenses({ event, author, subject, secret }))
      ? 1
      : 0,
  );
  const event = itemAt(
    TENSION_EVENTS,
    drawer.drawWeighted("generation", weights, "TENSION_EVENT", lower),
  );
  return { event, author, subject, secret: drawSecret(drawer, presetOf(event), author) };
}
