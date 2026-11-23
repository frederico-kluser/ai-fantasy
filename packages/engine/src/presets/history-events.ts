/**
 * History events (presets §7): facts before the first slice. "A" did it, "B"
 * suffered or received it. The effects are deltas on the bond axes of each one
 * toward the other, drive deficits (directed drives aim at the other) and
 * shifts of the emotion baselines; the offender serves accusations.
 */
import { z } from "zod";

import { BOND_AXIS_IDS } from "./bonds.ts";
import { DRIVE_IDS } from "./drives.ts";
import { EMOTION_IDS } from "./emotions.ts";
import {
  bipolarSchema,
  bpSchema,
  textSchema,
  type CatalogInput,
  type PresetOf,
} from "./primitives.ts";

/** Ids of the history events, in the order of presets §7. */
export const HISTORY_EVENT_IDS = [
  "helped_in_crisis",
  "saved_life",
  "lent_not_repaid",
  "betrayed_trust",
  "public_humiliation",
  "abandoned",
  "nursed_when_sick",
  "stole",
  "lied_seriously",
  "won_competition",
  "taught_craft",
  "rejected_love",
  "violent_fight",
  "forgave",
  "shared_secret",
  "informed_on",
  "shared_grief",
  "valuable_gift",
  "broken_promise",
  "kept_promise",
  "secret_affair",
] as const;

/** Id of a history event. */
export type HistoryEventId = (typeof HISTORY_EVENT_IDS)[number];

const emotionShifts = z.partialRecord(z.enum(EMOTION_IDS), bipolarSchema).default(() => ({}));

/**
 * The effects of an event on one side: `bond` deltas toward the other, drive
 * deficit deltas (`drives`), baseline shifts and baseline shifts that apply
 * only when the character's `honesty` is above 0 (`baselinesIfHonest`).
 */
const effectsSchema = z.strictObject({
  bond: z.partialRecord(z.enum(BOND_AXIS_IDS), bipolarSchema).default(() => ({})),
  drives: z.partialRecord(z.enum(DRIVE_IDS), bipolarSchema).default(() => ({})),
  baselines: emotionShifts,
  baselinesIfHonest: emotionShifts,
});

/**
 * Schema of a history event: effects `onA` and `onB`, the `offender` (who did
 * something wrong), the chance in bp that it is a secret (`secretChance`: 0
 * never, 10000 always) and who holds a copy when it is a secret (`knownBy`); a
 * non-secret event is known by both (presets §7).
 */
export const historyEventSchema = z
  .strictObject({
    id: z.enum(HISTORY_EVENT_IDS),
    name: textSchema,
    onA: effectsSchema,
    onB: effectsSchema,
    offender: z.enum(["NONE", "A", "B", "BOTH"]),
    secretChance: bpSchema,
    knownBy: z.enum(["BOTH", "A"]),
  })
  .superRefine((event, context) => {
    if (event.secretChance === 0 && event.knownBy !== "BOTH") {
      const message = "an event that is never secret is known by both";
      context.addIssue({ code: "custom", path: ["knownBy"], message });
    }
  });

/** A history event (presets §7). */
export type HistoryEvent = PresetOf<typeof historyEventSchema>;

/** The history events of presets §7. */
export const HISTORY_EVENTS: CatalogInput<typeof historyEventSchema> = [
  {
    id: "helped_in_crisis",
    name: "ajudou numa crise",
    onA: { bond: { affection: 1000 } },
    onB: { bond: { trust: 2000, affection: 1500, dependence: 1000 } },
    offender: "NONE",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "saved_life",
    name: "salvou a vida",
    onA: { bond: { affection: 1000 } },
    onB: { bond: { trust: 3000, affection: 2500, dependence: 2000 } },
    offender: "NONE",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "lent_not_repaid",
    name: "emprestou e não recebeu de volta",
    onA: { bond: { resentment: 2500, trust: -2000 }, drives: { material_security: 1500 } },
    onB: { baselines: { guilt: 500, shame: 500 } },
    offender: "B",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "betrayed_trust",
    name: "traiu a confiança",
    onA: { baselinesIfHonest: { guilt: 1000 } },
    onB: { bond: { trust: -4000, resentment: 4000 }, drives: { justice: 3000 } },
    offender: "A",
    secretChance: 5000,
    knownBy: "A",
  },
  {
    id: "public_humiliation",
    name: "humilhou em público",
    onA: {},
    onB: { bond: { resentment: 3500 }, drives: { dignity: 3000, justice: 2500 } },
    offender: "A",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "abandoned",
    name: "abandonou",
    onA: { baselines: { guilt: 1000 } },
    onB: { bond: { affection: -2000, resentment: 3000 }, drives: { intimacy: 2000 } },
    offender: "A",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "nursed_when_sick",
    name: "cuidou na doença",
    onA: { bond: { affection: 1000 } },
    onB: { bond: { affection: 2000, trust: 1500 } },
    offender: "NONE",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "stole",
    name: "roubou",
    onA: { baselinesIfHonest: { guilt: 1000 } },
    onB: { bond: { resentment: 3000, trust: -3000 } },
    offender: "A",
    secretChance: 10000,
    knownBy: "A",
  },
  {
    id: "lied_seriously",
    name: "mentiu sobre algo grave",
    onA: {},
    onB: { bond: { trust: -3000 } },
    offender: "A",
    secretChance: 10000,
    knownBy: "A",
  },
  {
    id: "won_competition",
    name: "venceu uma disputa",
    onA: { baselines: { joy: 500 } },
    onB: { bond: { resentment: 2000, respect: 1500 } },
    offender: "NONE",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "taught_craft",
    name: "ensinou um ofício",
    onA: { bond: { affection: 1000 } },
    onB: { bond: { respect: 3000, affection: 1500 } },
    offender: "NONE",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "rejected_love",
    name: "declarou amor e foi rejeitado(a)",
    onA: { baselines: { shame: 500 } },
    onB: { baselines: { guilt: 300 } },
    offender: "NONE",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "violent_fight",
    name: "brigaram feio",
    onA: { bond: { resentment: 3000, fearOf: 1500 } },
    onB: { bond: { resentment: 3000, fearOf: 1500 } },
    offender: "BOTH",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "forgave",
    name: "perdoou",
    onA: { bond: { resentment: -3000 } },
    onB: { baselines: { guilt: -500 } },
    offender: "NONE",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "shared_secret",
    name: "compartilhou um segredo",
    onA: { bond: { closeness: 2000 } },
    onB: { bond: { trust: 2000, closeness: 2000 } },
    offender: "NONE",
    secretChance: 10000,
    knownBy: "BOTH",
  },
  {
    id: "informed_on",
    name: "delatou",
    onA: {},
    onB: { bond: { resentment: 4000 }, drives: { justice: 4000 } },
    offender: "A",
    secretChance: 10000,
    knownBy: "BOTH",
  },
  {
    id: "shared_grief",
    name: "perderam alguém em comum",
    onA: { bond: { closeness: 2000 }, baselines: { sadness: 500 } },
    onB: { bond: { closeness: 2000 }, baselines: { sadness: 500 } },
    offender: "NONE",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "valuable_gift",
    name: "deu um presente valioso",
    onA: {},
    onB: { bond: { affection: 2000, dependence: 500 } },
    offender: "NONE",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "broken_promise",
    name: "quebrou uma promessa",
    onA: { baselines: { guilt: 500 } },
    onB: { bond: { trust: -2500, resentment: 2000 } },
    offender: "A",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "kept_promise",
    name: "cumpriu uma promessa difícil",
    onA: {},
    onB: { bond: { trust: 2500, respect: 1500 } },
    offender: "NONE",
    secretChance: 0,
    knownBy: "BOTH",
  },
  {
    id: "secret_affair",
    name: "traiu B com outra pessoa, às escondidas",
    onA: { baselinesIfHonest: { guilt: 1000 } },
    onB: {},
    offender: "A",
    secretChance: 10000,
    knownBy: "A",
  },
];
