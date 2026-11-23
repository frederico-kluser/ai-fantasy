/**
 * Bond axes and labels (simulation-model §5.4). A bond is what A feels for B:
 * eight unipolar axes plus labels. Family and role labels have an obligatory
 * reciprocal (if A holds the label for B, B holds the reciprocal for A); social
 * labels have none.
 */
import { z } from "zod";

import { textSchema, type CatalogInput, type PresetOf } from "./primitives.ts";

/** Ids of the bond axes: the left column of simulation-model §5.4, then the right one. */
export const BOND_AXIS_IDS = [
  "trust",
  "affection",
  "respect",
  "dependence",
  "attraction",
  "fearOf",
  "resentment",
  "closeness",
] as const;

/** Id of a bond axis. */
export type BondAxisId = (typeof BOND_AXIS_IDS)[number];

/** Schema of a bond axis: id and display name. */
export const bondAxisSchema = z.strictObject({ id: z.enum(BOND_AXIS_IDS), name: textSchema });

/** A bond axis (simulation-model §5.4). */
export type BondAxisEntry = PresetOf<typeof bondAxisSchema>;

/** The bond axes of simulation-model §5.4. */
export const BOND_AXES: CatalogInput<typeof bondAxisSchema> = [
  { id: "trust", name: "confiança" },
  { id: "affection", name: "afeto" },
  { id: "respect", name: "respeito" },
  { id: "dependence", name: "dependência" },
  { id: "attraction", name: "atração" },
  { id: "fearOf", name: "medo de B" },
  { id: "resentment", name: "ressentimento" },
  { id: "closeness", name: "proximidade (quanto se conhecem)" },
];

/** Ids of the bond labels, in the order of simulation-model §5.4. */
export const BOND_LABEL_IDS = [
  "PARENT",
  "CHILD",
  "SIBLING",
  "GRANDPARENT",
  "GRANDCHILD",
  "SPOUSE",
  "EX",
  "PARTNER",
  "FRIEND",
  "RIVAL",
  "ENEMY",
  "CREDITOR",
  "DEBTOR",
  "MENTOR",
  "APPRENTICE",
  "BOSS",
  "EMPLOYEE",
  "COLLEAGUE",
  "NEIGHBOR",
  "ACQUAINTANCE",
  "STRANGER",
  "CRUSH",
  "PROTECTOR",
  "PROTECTED",
] as const;

/** Id of a bond label. */
export type BondLabelId = (typeof BOND_LABEL_IDS)[number];

const bondLabelIdSchema = z.enum(BOND_LABEL_IDS);

/**
 * Schema of a bond label: a social label has no reciprocal (`null`); a family
 * or role label names its obligatory reciprocal.
 */
export const bondLabelSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    id: bondLabelIdSchema,
    name: textSchema,
    kind: z.literal("SOCIAL"),
    reciprocal: z.null(),
  }),
  z.strictObject({
    id: bondLabelIdSchema,
    name: textSchema,
    kind: z.enum(["FAMILY", "ROLE"]),
    reciprocal: bondLabelIdSchema,
  }),
]);

/** A bond label (simulation-model §5.4). */
export type BondLabelEntry = PresetOf<typeof bondLabelSchema>;

/** The bond labels of simulation-model §5.4. */
export const BOND_LABELS: CatalogInput<typeof bondLabelSchema> = [
  { id: "PARENT", name: "pai ou mãe", kind: "FAMILY", reciprocal: "CHILD" },
  { id: "CHILD", name: "filho(a)", kind: "FAMILY", reciprocal: "PARENT" },
  { id: "SIBLING", name: "irmão(ã)", kind: "FAMILY", reciprocal: "SIBLING" },
  { id: "GRANDPARENT", name: "avô ou avó", kind: "FAMILY", reciprocal: "GRANDCHILD" },
  { id: "GRANDCHILD", name: "neto(a)", kind: "FAMILY", reciprocal: "GRANDPARENT" },
  { id: "SPOUSE", name: "cônjuge", kind: "FAMILY", reciprocal: "SPOUSE" },
  { id: "EX", name: "ex-parceiro(a)", kind: "SOCIAL", reciprocal: null },
  { id: "PARTNER", name: "namorado(a)", kind: "SOCIAL", reciprocal: null },
  { id: "FRIEND", name: "amigo(a)", kind: "SOCIAL", reciprocal: null },
  { id: "RIVAL", name: "rival", kind: "SOCIAL", reciprocal: null },
  { id: "ENEMY", name: "inimigo(a)", kind: "SOCIAL", reciprocal: null },
  { id: "CREDITOR", name: "credor(a)", kind: "ROLE", reciprocal: "DEBTOR" },
  { id: "DEBTOR", name: "devedor(a)", kind: "ROLE", reciprocal: "CREDITOR" },
  { id: "MENTOR", name: "mentor(a)", kind: "ROLE", reciprocal: "APPRENTICE" },
  { id: "APPRENTICE", name: "aprendiz", kind: "ROLE", reciprocal: "MENTOR" },
  { id: "BOSS", name: "patrão ou patroa", kind: "ROLE", reciprocal: "EMPLOYEE" },
  { id: "EMPLOYEE", name: "empregado(a)", kind: "ROLE", reciprocal: "BOSS" },
  { id: "COLLEAGUE", name: "colega", kind: "SOCIAL", reciprocal: null },
  { id: "NEIGHBOR", name: "vizinho(a)", kind: "SOCIAL", reciprocal: null },
  { id: "ACQUAINTANCE", name: "conhecido(a)", kind: "SOCIAL", reciprocal: null },
  { id: "STRANGER", name: "desconhecido(a)", kind: "SOCIAL", reciprocal: null },
  { id: "CRUSH", name: "paixão", kind: "SOCIAL", reciprocal: null },
  { id: "PROTECTOR", name: "protetor(a)", kind: "ROLE", reciprocal: "PROTECTED" },
  { id: "PROTECTED", name: "protegido(a)", kind: "ROLE", reciprocal: "PROTECTOR" },
];
