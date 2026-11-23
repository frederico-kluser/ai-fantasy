/**
 * Bond archetypes (presets §6): the labels and typical axis values of a bond in
 * each direction (A→B and B→A), the drives it directs at the other and the
 * typical history events. Archetypes with different roles for A and B are
 * directional: choosing one says who is A.
 */
import { z } from "zod";

import { BOND_AXIS_IDS, BOND_LABEL_IDS } from "./bonds.ts";
import { DRIVE_IDS } from "./drives.ts";
import { HISTORY_EVENT_IDS } from "./history-events.ts";
import {
  bpSchema,
  reportIssues,
  textSchema,
  uniqueList,
  type CatalogInput,
  type PresetOf,
} from "./primitives.ts";

/** Ids of the bond archetypes, in the order of presets §6. */
export const BOND_ARCHETYPE_IDS = [
  "parent_child",
  "siblings",
  "spouses",
  "ex_partners",
  "lovers",
  "old_friends",
  "rivals",
  "enemies",
  "creditor_debtor",
  "mentor_apprentice",
  "boss_employee",
  "colleagues",
  "neighbors",
  "acquaintances",
  "strangers",
  "unrequited_love",
  "protector_protected",
] as const;

/** Id of a bond archetype. */
export type BondArchetypeId = (typeof BOND_ARCHETYPE_IDS)[number];

/**
 * One direction of a bond archetype: the `label` held, the typical `axes`
 * (axes left out stay in `0..500`) and the drives directed at the other
 * (`directedDrives`, each created with deficit 3000).
 */
const bondSideSchema = z.strictObject({
  label: z.enum(BOND_LABEL_IDS),
  axes: z.partialRecord(z.enum(BOND_AXIS_IDS), bpSchema),
  directedDrives: uniqueList(z.enum(DRIVE_IDS)).default(() => []),
});

/**
 * Schema of a bond archetype: the two directions (`aToB`, `bToA`), the
 * `typicalEvents` and the `directional` mark, which holds exactly when the two
 * labels differ (presets §6).
 */
export const bondArchetypeSchema = z
  .strictObject({
    id: z.enum(BOND_ARCHETYPE_IDS),
    name: textSchema,
    directional: z.boolean(),
    aToB: bondSideSchema,
    bToA: bondSideSchema,
    typicalEvents: uniqueList(z.enum(HISTORY_EVENT_IDS)),
  })
  .superRefine((archetype, context) => {
    const differentRoles = archetype.aToB.label !== archetype.bToA.label;
    const message = differentRoles
      ? "an archetype with different labels for A and B is directional"
      : "a directional archetype has different labels for A and B";
    const issues =
      differentRoles === archetype.directional ? [] : [{ path: ["directional"], message }];
    reportIssues(context, issues);
  });

/** A bond archetype (presets §6). */
export type BondArchetype = PresetOf<typeof bondArchetypeSchema>;

/** The bond archetypes of presets §6. */
export const BOND_ARCHETYPES: CatalogInput<typeof bondArchetypeSchema> = [
  {
    id: "parent_child",
    name: "pai ou mãe (A) e filho(a) (B)",
    directional: true,
    aToB: {
      label: "PARENT",
      axes: { affection: 8000, trust: 6000, closeness: 8000 },
      directedDrives: ["care"],
    },
    bToA: {
      label: "CHILD",
      axes: { affection: 7000, trust: 7000, dependence: 6000, respect: 6000, closeness: 8000 },
    },
    typicalEvents: ["nursed_when_sick", "kept_promise"],
  },
  {
    id: "siblings",
    name: "irmãos",
    directional: false,
    aToB: { label: "SIBLING", axes: { affection: 6000, closeness: 8000, resentment: 1500 } },
    bToA: { label: "SIBLING", axes: { affection: 6000, closeness: 8000, resentment: 1500 } },
    typicalEvents: ["won_competition", "helped_in_crisis"],
  },
  {
    id: "spouses",
    name: "cônjuges",
    directional: false,
    aToB: {
      label: "SPOUSE",
      axes: { affection: 7000, closeness: 9000, trust: 6000, attraction: 5000 },
    },
    bToA: {
      label: "SPOUSE",
      axes: { affection: 7000, closeness: 9000, trust: 6000, attraction: 5000 },
    },
    typicalEvents: ["shared_grief", "broken_promise"],
  },
  {
    id: "ex_partners",
    name: "ex-parceiros",
    directional: false,
    aToB: {
      label: "EX",
      axes: { affection: 3000, resentment: 4000, closeness: 8000, attraction: 3000 },
    },
    bToA: {
      label: "EX",
      axes: { affection: 2000, resentment: 5000, closeness: 8000, attraction: 2000 },
    },
    typicalEvents: ["betrayed_trust", "abandoned"],
  },
  {
    id: "lovers",
    name: "namorados",
    directional: false,
    aToB: {
      label: "PARTNER",
      axes: { attraction: 8000, affection: 7000, closeness: 6000 },
      directedDrives: ["desire"],
    },
    bToA: {
      label: "PARTNER",
      axes: { attraction: 8000, affection: 7000, closeness: 6000 },
      directedDrives: ["desire"],
    },
    typicalEvents: ["valuable_gift", "shared_secret"],
  },
  {
    id: "old_friends",
    name: "amigos de longa data",
    directional: false,
    aToB: { label: "FRIEND", axes: { affection: 7000, trust: 7000, closeness: 7000 } },
    bToA: { label: "FRIEND", axes: { affection: 7000, trust: 7000, closeness: 7000 } },
    typicalEvents: ["helped_in_crisis", "shared_secret"],
  },
  {
    id: "rivals",
    name: "rivais",
    directional: false,
    aToB: { label: "RIVAL", axes: { respect: 5000, resentment: 5000, closeness: 4000 } },
    bToA: { label: "RIVAL", axes: { respect: 5000, resentment: 5000, closeness: 4000 } },
    typicalEvents: ["won_competition", "public_humiliation"],
  },
  {
    id: "enemies",
    name: "inimigos",
    directional: false,
    aToB: {
      label: "ENEMY",
      axes: { resentment: 8000, fearOf: 3000 },
      directedDrives: ["justice"],
    },
    bToA: {
      label: "ENEMY",
      axes: { resentment: 8000, fearOf: 3000 },
      directedDrives: ["justice"],
    },
    typicalEvents: ["betrayed_trust", "violent_fight"],
  },
  {
    id: "creditor_debtor",
    name: "credor (A) e devedor (B)",
    directional: true,
    aToB: { label: "CREDITOR", axes: { trust: 3000, resentment: 3000 } },
    bToA: { label: "DEBTOR", axes: { fearOf: 3000, dependence: 5000 } },
    typicalEvents: ["lent_not_repaid"],
  },
  {
    id: "mentor_apprentice",
    name: "mentor (A) e aprendiz (B)",
    directional: true,
    aToB: { label: "MENTOR", axes: { affection: 5000, respect: 3000, closeness: 5000 } },
    bToA: { label: "APPRENTICE", axes: { respect: 8000, dependence: 6000, closeness: 5000 } },
    typicalEvents: ["taught_craft"],
  },
  {
    id: "boss_employee",
    name: "patrão (A) e empregado (B)",
    directional: true,
    aToB: { label: "BOSS", axes: { respect: 3000, closeness: 3000 } },
    bToA: {
      label: "EMPLOYEE",
      axes: { fearOf: 3000, dependence: 7000, resentment: 2000, closeness: 3000 },
    },
    typicalEvents: ["public_humiliation"],
  },
  {
    id: "colleagues",
    name: "colegas",
    directional: false,
    aToB: { label: "COLLEAGUE", axes: { trust: 4000, closeness: 4000 } },
    bToA: { label: "COLLEAGUE", axes: { trust: 4000, closeness: 4000 } },
    typicalEvents: [],
  },
  {
    id: "neighbors",
    name: "vizinhos",
    directional: false,
    aToB: { label: "NEIGHBOR", axes: { closeness: 4000 } },
    bToA: { label: "NEIGHBOR", axes: { closeness: 4000 } },
    typicalEvents: ["valuable_gift", "violent_fight"],
  },
  {
    id: "acquaintances",
    name: "conhecidos",
    directional: false,
    aToB: { label: "ACQUAINTANCE", axes: { closeness: 2000 } },
    bToA: { label: "ACQUAINTANCE", axes: { closeness: 2000 } },
    typicalEvents: [],
  },
  {
    id: "strangers",
    name: "desconhecidos",
    directional: false,
    aToB: { label: "STRANGER", axes: {} },
    bToA: { label: "STRANGER", axes: {} },
    typicalEvents: [],
  },
  {
    id: "unrequited_love",
    name: "paixão (A) não correspondida (B)",
    directional: true,
    aToB: {
      label: "CRUSH",
      axes: { attraction: 8000, affection: 6000, closeness: 3000 },
      directedDrives: ["desire"],
    },
    bToA: { label: "ACQUAINTANCE", axes: { attraction: 1000, affection: 3000, closeness: 3000 } },
    typicalEvents: ["rejected_love"],
  },
  {
    id: "protector_protected",
    name: "protetor (A) e protegido (B)",
    directional: true,
    aToB: {
      label: "PROTECTOR",
      axes: { affection: 6000, closeness: 5000 },
      directedDrives: ["care"],
    },
    bToA: { label: "PROTECTED", axes: { trust: 8000, dependence: 7000, closeness: 5000 } },
    typicalEvents: ["saved_life"],
  },
];
