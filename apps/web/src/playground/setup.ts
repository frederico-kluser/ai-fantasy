/**
 * The scene setup the review sheet confirms (overview §6, presets §10.1): the
 * seeds, the cast input, the place and its grid template, the weather, the
 * start minute, the positions chosen by hand and the player's character. It is
 * plain data, so WEB-02 can keep it and start the scene from it; the check
 * below runs the engine's own generation and opening, so a setup that passes
 * is one the engine accepts.
 */
import {
  ASSOCIATION_TAG_IDS,
  CAST_MAX,
  generateCast,
  hashState,
  MINUTES_PER_DAY,
  openScene,
  PLACE_IDS,
  PRESETS_VERSION,
  WEATHER_IDS,
  cellPos,
  err,
  ok,
  type CastError,
  type CastErrorCode,
  type CastInputData,
  type CastGeneration,
  type OpenedScene,
  type OpeningError,
  type Presets,
  type Result,
} from "@ai-fantasy/engine";
import { z } from "zod";

import { problemsOf, seedsSchema, type Problem, type SetupReview } from "../engine/protocol.ts";

/** Version of the setup structure. */
export const SETUP_VERSION = 1;

const cellPosSchema = z.strictObject({ x: z.int(), y: z.int() });

function isObject(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

/**
 * Schema of a scene setup. The cast input is checked by the engine
 * (`generateCast`), so here it only has to be an object.
 */
export const sceneSetupSchema = z.strictObject({
  version: z.literal(SETUP_VERSION),
  presetsVersion: z.string(),
  seeds: seedsSchema,
  cast: z.custom<CastInputData>(isObject, "o elenco precisa ser um objeto"),
  place: z.enum(PLACE_IDS),
  /** The place whose grid template the scene uses (presets §2: the scene may swap it). */
  grid: z.enum(PLACE_IDS),
  /** The natural tag of the place, chosen in the sheet (presets §2, `wilderness`). */
  naturalTag: z.enum(ASSOCIATION_TAG_IDS).nullable(),
  weather: z.enum(WEATHER_IDS),
  startMinute: z
    .int()
    .min(0)
    .max(MINUTES_PER_DAY - 1),
  /** A cell chosen by hand for each character, by id, or `null` to draw it. */
  positions: z.array(cellPosSchema.nullable()).max(CAST_MAX),
  /** The player's character, or `null` to only watch. */
  player: z.int().min(0).nullable(),
});

/** A scene setup: what the review sheet confirms and the scene starts from. */
export type SceneSetup = z.infer<typeof sceneSetupSchema>;

/** What each cast error means for whoever fills the form (presets §10.1, "Validação"). */
const CAST_ERROR_TEXT: Readonly<Record<CastErrorCode, string>> = {
  INVALID_INPUT: "Dado inválido no elenco",
  UNKNOWN_CHARACTER: "O laço cita um personagem que não existe",
  SELF_BOND: "Um personagem não pode ter laço consigo mesmo",
  DUPLICATE_BOND: "Esse par já tem um laço",
  AUTHOR_OUTSIDE_PAIR: "Quem fez o acontecimento precisa ser do par",
  STRANGERS_WITH_EVENTS: "Desconhecidos não têm acontecimentos em comum",
  IMPOSSIBLE_DRAFT: "Os valores travados não cabem nos acontecimentos do laço",
  TOO_MANY_SPOUSES: "Alguém ficou com mais de um cônjuge",
  TOO_MANY_PARTNERS: "Alguém ficou com mais de um par romântico",
  PARENT_CYCLE: "Alguém seria ancestral de si mesmo",
  FAMILY_CONFLICT: "Um par ficou com dois parentescos diferentes",
};

/** A cast error as a problem of the form: the field, and the reason in Portuguese. */
export function castProblem(error: CastError): Problem {
  const text = CAST_ERROR_TEXT[error.code];
  const detail = error.code === "INVALID_INPUT" ? ` (${error.message})` : "";
  return { path: `cast.${error.path}`, message: `${text}${detail}.` };
}

/** An opening error as a problem of the form. */
export function openingProblem(error: OpeningError): Problem {
  if (error.code === "INVALID_GRID") {
    return { path: "grid", message: `O gabarito da grade é inválido (${error.grid.code}).` };
  }
  const reason =
    error.code === "TAKEN_POSITION" ? "já está ocupada" : "não é uma célula atravessável da grade";
  const message = `A posição do personagem ${String(error.character + 1)} ${reason}.`;
  return { path: `positions.${String(error.character)}`, message };
}

/** Problems of the setup itself, once the size of the cast is known. */
function setupProblems(setup: SceneSetup, count: number): Problem[] {
  const problems: Problem[] = [];
  if (setup.presetsVersion !== PRESETS_VERSION) {
    const message = `A ficha usa os presets ${setup.presetsVersion}; o motor está nos ${PRESETS_VERSION}.`;
    problems.push({ path: "presetsVersion", message });
  }
  if (setup.player !== null && setup.player >= count) {
    problems.push({ path: "player", message: "O personagem do jogador não está no elenco." });
  }
  if (setup.positions.length > count) {
    problems.push({ path: "positions", message: "Há mais posições do que personagens." });
  }
  return problems;
}

function reviewOf(setup: SceneSetup, generation: CastGeneration, opened: OpenedScene): SetupReview {
  const characters = generation.cast.identities.map((identity, index) => {
    const placed = opened.characters[index];
    return {
      id: identity.id,
      name: identity.name,
      cell: cellPos(opened.grid, placed?.cell ?? 0),
      player: setup.player === identity.id,
    };
  });
  return { characters, hash: hashState(opened.characters) };
}

/**
 * Checks a scene setup with the engine (presets §10.1): its schema, the
 * presets version, then the cast generation from the cast seed and the scene
 * opening from the scene seed, with the positions chosen by hand.
 *
 * @returns what the review sheet shows, or every problem found with its path.
 * @example
 * const checked = checkSceneSetup(PRESETS, setup);
 * if (!checked.ok) showProblems(checked.error);
 */
export function checkSceneSetup(presets: Presets, raw: unknown): Result<SetupReview, Problem[]> {
  const parsed = sceneSetupSchema.safeParse(raw);
  if (!parsed.success) {
    return err(problemsOf(parsed.error));
  }
  const setup = parsed.data;
  const generated = generateCast(presets, setup.cast, setup.seeds);
  if (!generated.ok) {
    return err(generated.error.map(castProblem));
  }
  const problems = setupProblems(setup, generated.value.cast.characters.length);
  if (problems.length > 0) {
    return err(problems);
  }
  const grid = presets.places.find((place) => place.id === setup.grid)?.grid;
  const opening = { grid: grid ?? { rows: [], exits: [], roofed: "ALL", starts: [] } };
  const opened = openScene(
    presets,
    generated.value.cast.characters,
    { ...opening, dayStates: generated.value.cast.dayStates, positions: setup.positions },
    generated.value.rng,
  );
  return opened.ok
    ? ok(reviewOf(setup, generated.value, opened.value))
    : err([openingProblem(opened.error)]);
}
