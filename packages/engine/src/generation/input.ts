/**
 * The input of the cast generator (presets §10.1): what the SOM or the user
 * chose for each character and pair, plus the drawn values of what is locked.
 * Data from outside, so it is checked by these schemas before any draw.
 */
import { z } from "zod";

import { AGE_BANDS, SPEECH_REGISTERS } from "../character/state.ts";
import { DOMINANT_DRIVE_WEIGHT } from "../domain/constants.ts";
import { BOND_ARCHETYPE_IDS } from "../presets/bond-archetypes.ts";
import { BOND_AXIS_IDS } from "../presets/bonds.ts";
import { CHARACTER_ARCHETYPE_IDS } from "../presets/character-archetypes.ts";
import { DAY_STATE_IDS } from "../presets/day-states.ts";
import { DRIVE_IDS } from "../presets/drives.ts";
import { HISTORY_EVENT_IDS } from "../presets/history-events.ts";
import {
  bipolarSchema,
  bpSchema,
  reportIssues,
  textSchema,
  uniqueList,
  type DeepReadonly,
} from "../presets/primitives.ts";
import { ASSOCIATION_TAG_IDS } from "../presets/tags.ts";
import { APTITUDE_IDS, TRAIT_IDS } from "../presets/traits.ts";

/** Characters of a cast at most (presets §10). */
export const CAST_MAX = 8;

/** SOM picks for the dominant drives at most (presets §5). */
export const DOMINANT_PICKS_MAX = 2;

/** Associations of a character at most (presets §8). */
export const ASSOCIATIONS_MAX = 3;

/**
 * The undirected drives whose initial deficit is drawn: all but
 * `physical_relief` and `physical_safety`, which are computed (presets §5).
 */
export const DRAWN_DEFICIT_IDS = [
  "material_security",
  "predictability",
  "company",
  "recognition",
  "dignity",
  "influence",
  "curiosity",
  "purpose",
  "fun",
] as const;

/** A drive whose initial deficit is drawn. */
export type DrawnDeficitId = (typeof DRAWN_DEFICIT_IDS)[number];

/** Dominant drives of a character: 2 or 3 (simulation-model §5.3). */
const DOMINANTS = { min: 2, max: 3 };

const tagAssociationSchema = z.strictObject({
  subject: z.strictObject({ kind: z.literal("TAG"), tag: z.enum(ASSOCIATION_TAG_IDS) }),
  valence: bipolarSchema,
});

/**
 * The drawn values of a character (`CharacterDraft`): traits, aptitudes, the
 * weights of the 15 drives, the drawn deficits and the associations. A locked
 * draft must be possible: 2 or 3 dominant weights and distinct tags.
 */
export const characterDraftSchema = z
  .strictObject({
    traits: z.record(z.enum(TRAIT_IDS), bipolarSchema),
    aptitudes: z.record(z.enum(APTITUDE_IDS), bpSchema),
    weights: z.record(z.enum(DRIVE_IDS), bpSchema),
    deficits: z.record(z.enum(DRAWN_DEFICIT_IDS), bpSchema),
    associations: z.array(tagAssociationSchema).max(ASSOCIATIONS_MAX),
  })
  .superRefine((draft, context) => {
    const dominants = Object.values(draft.weights).filter((w) => w >= DOMINANT_DRIVE_WEIGHT);
    const message = `a character has 2 or 3 dominant drives, got ${dominants.length}`;
    const fits = dominants.length >= DOMINANTS.min && dominants.length <= DOMINANTS.max;
    reportIssues(context, fits ? [] : [{ path: ["weights"], message }]);
    const tags = draft.associations.map((association) => association.subject.tag);
    reportIssues(
      context,
      tags.flatMap((tag, index) =>
        tags.indexOf(tag) < index
          ? [{ path: ["associations", index], message: `${tag} is repeated` }]
          : [],
      ),
    );
  });

const axesSchema = z.record(z.enum(BOND_AXIS_IDS), bpSchema);

/**
 * The drawn values of a chosen bond (`BondDraft`): the eight axes of A→B and of
 * B→A, and whether each event of the bond is a secret, in the order of the list.
 */
export const bondDraftSchema = z.strictObject({
  aToB: axesSchema,
  bToA: axesSchema,
  secrets: z.array(z.boolean()),
});

const identitySchema = z.strictObject({
  name: textSchema,
  pronouns: z.string().default(""),
  description: z.string().default(""),
  role: z.string().default(""),
  ageBand: z.enum(AGE_BANDS).default("ADULT"),
  speechRegister: z.enum(SPEECH_REGISTERS).default("COLLOQUIAL"),
});

const characterSpecSchema = z.strictObject({
  archetype: z.enum(CHARACTER_ARCHETYPE_IDS),
  identity: identitySchema,
  dominantDrives: uniqueList(z.enum(DRIVE_IDS))
    .max(DOMINANT_PICKS_MAX)
    .default(() => []),
  dayState: z.enum(DAY_STATE_IDS).default("rested"),
  association: z
    .strictObject({ tag: z.enum(ASSOCIATION_TAG_IDS), kind: z.enum(["FEAR", "ATTACHMENT"]) })
    .nullable()
    .default(null),
  locked: characterDraftSchema.nullable().default(null),
});

const characterIndex = z.int().min(0);

const eventSpecSchema = z.strictObject({
  event: z.enum(HISTORY_EVENT_IDS),
  author: characterIndex,
});

const bondSpecSchema = z.strictObject({
  a: characterIndex,
  b: characterIndex,
  archetype: z.enum(BOND_ARCHETYPE_IDS),
  events: z.array(eventSpecSchema).default(() => []),
  locked: bondDraftSchema.nullable().default(null),
});

/** Schema of the whole input of the generator (presets §10.1). */
export const castInputSchema = z.strictObject({
  attempt: z.int().min(0).default(0),
  characters: z.array(characterSpecSchema).min(1).max(CAST_MAX),
  bonds: z.array(bondSpecSchema).default(() => []),
});

/** The input of the generator as the caller writes it (defaults may be left out). */
export type CastInputData = z.input<typeof castInputSchema>;

/** The input of the generator, validated and with every default filled in. */
export type CastInput = DeepReadonly<z.output<typeof castInputSchema>>;

/** What the input says about one character. */
export type CharacterSpec = CastInput["characters"][number];

/** What the input says about one pair. */
export type BondSpec = CastInput["bonds"][number];

/** An event of a pair: which and who did it. */
export type EventSpec = BondSpec["events"][number];

/** The drawn values of a character; lock it by passing it back as `locked`. */
export type CharacterDraft = DeepReadonly<z.output<typeof characterDraftSchema>>;

/** The drawn values of a bond; lock it by passing it back as `locked`. */
export type BondDraft = DeepReadonly<z.output<typeof bondDraftSchema>>;
