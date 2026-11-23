/**
 * Validation of the cast input (presets §10.1): the schema first, then each
 * chosen bond, then the coherence of the graph. Generated and hand-made casts
 * go through the same checks, and every problem comes back as a value.
 */
import { BP_MAX } from "../domain/bp.ts";
import { err, ok, type Result } from "../domain/result.ts";
import type { Presets } from "../presets/catalogs.ts";
import { castError, type CastError } from "./errors.ts";
import { graphErrors, pairKey, pairPlans, type PairPlan } from "./graph.ts";
import { castInputSchema, type BondSpec, type CastInput } from "./input.ts";
import { presetById } from "./lookup.ts";

/** A valid input and its pairs, ready for the draws. */
export interface CastPlan {
  readonly input: CastInput;
  readonly pairs: readonly PairPlan[];
}

/** Whether a locked secret mark is possible for an event with this secret chance. */
function isPossibleSecret(secret: boolean, chance: number): boolean {
  return secret ? chance > 0 : chance < BP_MAX;
}

function lockedErrors(presets: Presets, bond: BondSpec, path: string): CastError[] {
  const secrets = bond.locked?.secrets;
  if (secrets === undefined) {
    return [];
  }
  const fits =
    secrets.length === bond.events.length &&
    bond.events.every(({ event }, index) =>
      isPossibleSecret(
        secrets[index] === true,
        presetById(presets.historyEvents, event).secretChance,
      ),
    );
  const message = "a locked bond has one possible secret mark per event";
  return fits ? [] : [castError("IMPOSSIBLE_DRAFT", `${path}.locked`, message)];
}

function eventErrors(presets: Presets, bond: BondSpec, path: string): CastError[] {
  const outside = bond.events.flatMap(({ author }, index) =>
    author === bond.a || author === bond.b
      ? []
      : [
          castError(
            "AUTHOR_OUTSIDE_PAIR",
            `${path}.events.${index}`,
            `${author} is not in the pair`,
          ),
        ],
  );
  const strangers =
    bond.archetype === "strangers" && bond.events.length > 0
      ? [castError("STRANGERS_WITH_EVENTS", path, "strangers share no history")]
      : [];
  return [...outside, ...strangers, ...lockedErrors(presets, bond, path)];
}

/** The first problem of the pair of a bond, if any: unknown, self or repeated. */
function pairError(input: CastInput, bond: BondSpec, index: number): CastError | undefined {
  const path = `bonds.${index}`;
  const count = input.characters.length;
  if (bond.a >= count || bond.b >= count) {
    return castError("UNKNOWN_CHARACTER", path, `the cast has characters 0..${count - 1}`);
  }
  if (bond.a === bond.b) {
    return castError("SELF_BOND", path, "a bond joins two different characters");
  }
  const key = pairKey(bond.a, bond.b);
  const repeated = input.bonds.slice(0, index).some((other) => pairKey(other.a, other.b) === key);
  return repeated
    ? castError("DUPLICATE_BOND", path, `the pair ${key} already has a bond`)
    : undefined;
}

function bondErrors(presets: Presets, input: CastInput): CastError[] {
  return input.bonds.flatMap((bond, index) => {
    const problem = pairError(input, bond, index);
    return problem === undefined ? eventErrors(presets, bond, `bonds.${index}`) : [problem];
  });
}

/**
 * Validates a cast input and plans its pairs.
 *
 * @returns the input with defaults filled in and every pair with a bond, or all
 * the problems found at the first stage that has any (schema, bonds, graph).
 */
export function planCast(presets: Presets, input: unknown): Result<CastPlan, readonly CastError[]> {
  const parsed = castInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      parsed.error.issues.map((issue) =>
        castError("INVALID_INPUT", issue.path.map(String).join("."), issue.message),
      ),
    );
  }
  const data: CastInput = parsed.data;
  const problems = bondErrors(presets, data);
  const graph = problems.length > 0 ? problems : graphErrors(data.bonds);
  if (graph.length > 0) {
    return err(graph);
  }
  const sides = (id: string) => {
    const archetype = presetById(presets.bondArchetypes, id);
    return [archetype.aToB.label, archetype.bToA.label] as const;
  };
  return ok({ input: data, pairs: pairPlans(data.bonds, sides) });
}

/**
 * Validates a cast input, generated or made by hand (presets §10.1): unknown
 * archetypes, impossible locked values and incoherent graphs are rejected.
 *
 * @example
 * const checked = validateCast(presets, { characters: [{ archetype: "elder", identity: { name: "Ana" } }] });
 * if (!checked.ok) showErrors(checked.error); // each with a code and a path
 */
export function validateCast(
  presets: Presets,
  input: unknown,
): Result<CastInput, readonly CastError[]> {
  const planned = planCast(presets, input);
  return planned.ok ? ok(planned.value.input) : planned;
}
