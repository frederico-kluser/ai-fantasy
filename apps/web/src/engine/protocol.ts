/**
 * The message protocol between the site and the engine worker (overview §6):
 * typed and versioned. Every request carries an `id`; the answer carries the
 * same `id` and is either a value or a failure, never an exception. Both sides
 * check what they receive with these schemas (ADR 0021).
 */
import {
  APTITUDE_IDS,
  ASSOCIATION_TAG_IDS,
  BOND_AXIS_IDS,
  DRAWN_DEFICIT_IDS,
  DRIVE_IDS,
  HISTORY_EVENT_IDS,
  TRAIT_IDS,
} from "@ai-fantasy/engine";
import { z } from "zod";

/** Version of the protocol: a request of another version is refused. */
export const PROTOCOL_VERSION = 1;

/** Largest seed: seeds are integers in `0..2^32 − 1` (simulation-model §15). */
export const SEED_MAX = 4294967295;

/** Schema of a seed. */
export const seedSchema = z.int().min(0).max(SEED_MAX);

/** Schema of the two seeds of a session. */
export const seedsSchema = z.strictObject({ castSeed: seedSchema, sceneSeed: seedSchema });

const version = z.literal(PROTOCOL_VERSION);
const requestId = z.int().min(0);

/** Schema of a request to the engine worker. The engine checks the payloads itself. */
export const engineRequestSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    v: version,
    id: requestId,
    kind: z.literal("generateCast"),
    input: z.unknown(),
    seeds: seedsSchema,
  }),
  z.strictObject({ v: version, id: requestId, kind: z.literal("checkSetup"), setup: z.unknown() }),
]);

/** A request to the engine worker. */
export type EngineRequest = z.infer<typeof engineRequestSchema>;

/** What the site can ask the worker: a request without its envelope. */
export type EngineAsk =
  | Omit<Extract<EngineRequest, { kind: "generateCast" }>, "v" | "id">
  | Omit<Extract<EngineRequest, { kind: "checkSetup" }>, "v" | "id">;

const tagAssociation = z.strictObject({
  subject: z.strictObject({ kind: z.literal("TAG"), tag: z.enum(ASSOCIATION_TAG_IDS) }),
  valence: z.int(),
});

/** The drawn values of a character as plain data (presets §10.1, `CharacterDraft`). */
export const characterDraftDataSchema = z.strictObject({
  traits: z.record(z.enum(TRAIT_IDS), z.int()),
  aptitudes: z.record(z.enum(APTITUDE_IDS), z.int()),
  weights: z.record(z.enum(DRIVE_IDS), z.int()),
  deficits: z.record(z.enum(DRAWN_DEFICIT_IDS), z.int()),
  associations: z.array(tagAssociation),
});

/** The drawn values of a character, as the site keeps them to lock it. */
export type CharacterDraftData = z.infer<typeof characterDraftDataSchema>;

const axesSchema = z.record(z.enum(BOND_AXIS_IDS), z.int());

/** The drawn values of a bond as plain data (presets §10.1, `BondDraft`). */
export const bondDraftDataSchema = z.strictObject({
  aToB: axesSchema,
  bToA: axesSchema,
  secrets: z.array(z.boolean()),
});

/** The drawn values of a bond, as the site keeps them to lock it. */
export type BondDraftData = z.infer<typeof bondDraftDataSchema>;

const characterIdSchema = z.int().min(0);

/** Schema of the generated cast as the site shows it. */
export const castViewSchema = z.strictObject({
  characters: z.array(
    z.strictObject({
      id: characterIdSchema,
      name: z.string(),
      dominantDrives: z.array(z.enum(DRIVE_IDS)),
      associations: z.array(z.strictObject({ tag: z.enum(ASSOCIATION_TAG_IDS), valence: z.int() })),
    }),
  ),
  /** Every directed bond with labels, by holder then target (family included). */
  relations: z.array(
    z.strictObject({
      from: characterIdSchema,
      to: characterIdSchema,
      labels: z.array(z.string()),
    }),
  ),
  drafts: z.strictObject({
    characters: z.array(characterDraftDataSchema),
    bonds: z.array(bondDraftDataSchema),
  }),
  hook: z
    .strictObject({
      event: z.enum(HISTORY_EVENT_IDS),
      author: characterIdSchema,
      subject: characterIdSchema,
      secret: z.boolean(),
    })
    .nullable(),
});

/** The generated cast as the site shows it: names, drives, relations, drafts and the hook. */
export type CastView = z.infer<typeof castViewSchema>;

/** Schema of the review of a valid scene setup. */
export const setupReviewSchema = z.strictObject({
  characters: z.array(
    z.strictObject({
      id: characterIdSchema,
      name: z.string(),
      cell: z.strictObject({ x: z.int(), y: z.int() }),
      player: z.boolean(),
    }),
  ),
  /** Fingerprint of the opened characters (`hashState`), to compare two setups. */
  hash: z.string(),
});

/** What the review sheet shows of a valid setup. */
export type SetupReview = z.infer<typeof setupReviewSchema>;

/** A problem of what was asked: where (`path`, with dots; empty for the whole) and why. */
export const problemSchema = z.strictObject({ path: z.string(), message: z.string() });

/** A problem of what was asked. */
export type Problem = z.infer<typeof problemSchema>;

/** Why the worker did not answer with a value. */
export const FAILURE_CODES = [
  "BAD_REQUEST",
  "CAST_REJECTED",
  "SETUP_REJECTED",
  "WORKER_FAILED",
] as const;

/** A failure of the worker: a code and the problems, each with a path and a message. */
export const failureSchema = z.strictObject({
  code: z.enum(FAILURE_CODES),
  problems: z.array(problemSchema),
});

/** A failure of the worker, as a value. */
export type EngineFailure = z.infer<typeof failureSchema>;

/** Schema of an answer of the worker; `id` is `null` only when the request had no valid id. */
export const engineResponseSchema = z.union([
  z.strictObject({
    v: version,
    id: requestId,
    ok: z.literal(true),
    kind: z.literal("generateCast"),
    cast: castViewSchema,
  }),
  z.strictObject({
    v: version,
    id: requestId,
    ok: z.literal(true),
    kind: z.literal("checkSetup"),
    review: setupReviewSchema,
  }),
  z.strictObject({
    v: version,
    id: requestId.nullable(),
    ok: z.literal(false),
    error: failureSchema,
  }),
]);

/** An answer of the engine worker. */
export type EngineResponse = z.infer<typeof engineResponseSchema>;

/** The issues of a Zod error as problems, the path joined with dots. */
export function problemsOf(error: z.ZodError): Problem[] {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}
