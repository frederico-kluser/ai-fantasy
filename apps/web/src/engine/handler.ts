/**
 * What the engine worker does with a message (overview §6): checks the
 * envelope, runs the engine and answers with the same id. Nothing here
 * throws: a bad request, a rejected input or an engine failure are answers.
 * Pure, so it runs the same in the worker, in process and in the tests.
 */
import {
  DOMINANT_DRIVE_WEIGHT,
  DRIVE_IDS,
  generateCast,
  type Cast,
  type Presets,
} from "@ai-fantasy/engine";
import { z } from "zod";

import { castProblem, checkSceneSetup } from "../playground/setup.ts";
import {
  engineRequestSchema,
  PROTOCOL_VERSION,
  problemsOf,
  type CastView,
  type EngineFailure,
  type EngineRequest,
  type EngineResponse,
} from "./protocol.ts";

/** The generated cast as the site shows it (see {@link CastView}). */
export function castViewOf(cast: Cast): CastView {
  return {
    characters: cast.identities.map((identity, index) => {
      const draft = cast.drafts.characters[index];
      const weights = draft?.weights;
      return {
        id: identity.id,
        name: identity.name,
        dominantDrives: DRIVE_IDS.filter((id) => (weights?.[id] ?? 0) >= DOMINANT_DRIVE_WEIGHT),
        associations: (draft?.associations ?? []).map((association) => ({
          tag: association.subject.tag,
          valence: association.valence,
        })),
      };
    }),
    relations: cast.characters.flatMap((character) =>
      character.bonds
        .filter((bond) => bond.labels.length > 0)
        .map((bond) => ({ from: character.id, to: bond.target, labels: [...bond.labels] })),
    ),
    drafts: {
      characters: cast.drafts.characters.map((draft) => ({
        ...draft,
        associations: draft.associations.map(({ subject, valence }) => ({
          subject: { ...subject },
          valence,
        })),
      })),
      bonds: cast.drafts.bonds.map(({ a, b, derived, draft }) => ({
        a,
        b,
        derived,
        draft: { ...draft, secrets: [...draft.secrets] },
      })),
    },
    hook: cast.hook === null ? null : { ...cast.hook },
  };
}

const idOnly = z.looseObject({ id: z.int().min(0) });

function failure(id: number | null, error: EngineFailure): EngineResponse {
  return { v: PROTOCOL_VERSION, id, ok: false, error };
}

function answer(presets: Presets, request: EngineRequest): EngineResponse {
  const base = { v: PROTOCOL_VERSION, id: request.id, ok: true } as const;
  if (request.kind === "generateCast") {
    const generated = generateCast(presets, request.input, request.seeds);
    return generated.ok
      ? { ...base, kind: "generateCast", cast: castViewOf(generated.value.cast) }
      : failure(request.id, {
          code: "CAST_REJECTED",
          problems: generated.error.map(castProblem),
        });
  }
  const checked = checkSceneSetup(presets, request.setup);
  return checked.ok
    ? { ...base, kind: "checkSetup", review: checked.value }
    : failure(request.id, { code: "SETUP_REJECTED", problems: checked.error });
}

/**
 * Answers one message of the site.
 *
 * @returns the answer with the request's id: a value, or a failure with code
 * `BAD_REQUEST` (the envelope is wrong; `id` is `null` if it had no valid id),
 * `CAST_REJECTED`, `SETUP_REJECTED` or `WORKER_FAILED` (the engine threw).
 */
export function handleRequest(presets: Presets, message: unknown): EngineResponse {
  const request = engineRequestSchema.safeParse(message);
  if (!request.success) {
    const id = idOnly.safeParse(message);
    const problems = problemsOf(request.error);
    return failure(id.success ? id.data.id : null, { code: "BAD_REQUEST", problems });
  }
  try {
    return answer(presets, request.data);
  } catch (thrown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    return failure(request.data.id, { code: "WORKER_FAILED", problems: [{ path: "", message }] });
  }
}
