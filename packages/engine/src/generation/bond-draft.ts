/**
 * The drawn values of a bond (presets §6, §10.1 steps 2 and 3): the axes of
 * each side around the archetype and the secret mark of each event. Every draw
 * is in the `generation` stream.
 */
import { toBp, type Bp, BP_MAX } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import type { Drawer } from "../rng/drawer.ts";
import type { BondArchetype } from "../presets/bond-archetypes.ts";
import { BOND_AXIS_IDS, type BondAxisId } from "../presets/bonds.ts";
import type { HistoryEvent } from "../presets/history-events.ts";
import type { BondDraft } from "./input.ts";
import { around, drawInRange } from "./ranges.ts";

/** Variation around a typical axis value, and the range of an axis the archetype leaves out (presets §6). */
const AXES = { spread: 1000, uncited: { min: 0, max: 500 } } as const;

type Axes = BondDraft["aToB"];

function drawAxes(
  drawer: Drawer,
  typical: Readonly<Partial<Record<BondAxisId, number>>>,
  holder: CharacterId,
): Axes {
  const label = { stream: "generation", purpose: "BOND_AXIS", target: holder } as const;
  const entries = BOND_AXIS_IDS.map((axis): [BondAxisId, Bp] => {
    const cited = typical[axis];
    const range = cited === undefined ? AXES.uncited : around(cited, AXES.spread, 0, BP_MAX);
    return [axis, toBp(drawInRange(drawer, range, label))];
  });
  // Every axis id has just been given a value, in catalog order.
  return Object.fromEntries(entries) as Axes;
}

/**
 * Whether an event is a secret (presets §7): never or always by its chance,
 * otherwise drawn (`HISTORY_SECRET`, about who did it).
 */
export function drawSecret(drawer: Drawer, event: HistoryEvent, author: CharacterId): boolean {
  if (event.secretChance === 0 || event.secretChance === BP_MAX) {
    return event.secretChance === BP_MAX;
  }
  return drawer.drawChance("generation", event.secretChance, "HISTORY_SECRET", author);
}

/** A pair to draw: its sides, archetype and events with their presets. */
export interface BondToDraw {
  readonly a: CharacterId;
  readonly b: CharacterId;
  readonly archetype: BondArchetype;
  readonly events: readonly { readonly preset: HistoryEvent; readonly author: CharacterId }[];
}

/** Draws a bond (presets §10.1 step 2): the axes of A→B, of B→A, then each event's secret. */
export function drawBond(drawer: Drawer, bond: BondToDraw): BondDraft {
  const aToB = drawAxes(drawer, bond.archetype.aToB.axes, bond.a);
  const bToA = drawAxes(drawer, bond.archetype.bToA.axes, bond.b);
  const secrets = bond.events.map(({ preset, author }) => drawSecret(drawer, preset, author));
  return { aToB, bToA, secrets };
}
