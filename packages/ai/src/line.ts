/**
 * Validation of what the text model returns (ai-integration §5.2 and §5.3):
 * `{ fala, gesto }`, within the sizes, with no mechanics numbers and no
 * unknown names. A rejected line takes the alternative path (one retry, then
 * the fallback line). The checks are deliberately simple and testable; their
 * limits are written in ai-integration §5.3.
 */
import { err, ok, type Result } from "@ai-fantasy/engine";
import { z } from "zod";

/** Longest speech, in characters (code points). */
export const MAX_FALA_LENGTH = 400;

/** Longest gesture, in characters (code points). */
export const MAX_GESTO_LENGTH = 120;

/**
 * Capitalized words that are not names: forms of address and "Deus". They pass
 * the unknown-name check anywhere in a sentence.
 */
export const CAPITALIZED_EXCEPTIONS: ReadonlySet<string> = new Set([
  "Deus",
  "Senhor",
  "Senhora",
  "Dona",
  "Dom",
  "Seu",
  "Sr",
  "Sra",
  "Doutor",
  "Doutora",
  "Mestre",
]);

const lineSchema = z.strictObject({ fala: z.string(), gesto: z.string() });

/** A validated line: speech and gesture, trimmed; either may be empty, not both. */
export type RenderedLine = z.output<typeof lineSchema>;

/** Why a line was rejected. */
export type LineErrorCode = "SCHEMA" | "EMPTY" | "TOO_LONG" | "MECHANICS" | "UNKNOWN_NAME";

/** The problem found and its detail: the field too long, the word or sign at fault, or `""`. */
export interface LineError {
  readonly code: LineErrorCode;
  readonly detail: string;
}

/** Digits of any script, the percent sign and the engine words `bp` and `tick(s)`. */
const MECHANICS = /\p{N}|%|\bbp\b|\bticks?\b/iu;

/** A word: a letter, then letters, marks, apostrophes or hyphens. */
const WORD = /\p{L}[\p{L}\p{M}'’-]*/gu;

/** Signs that may stand between the end of a sentence and the next word. */
const WRAPPERS = /[\s"“”‘’'«»()—–-]+$/u;

/** Signs that end a sentence (or open a quoted one, after `:`). */
const SENTENCE_END = /[.!?…:]$/u;

function lengthOf(text: string): number {
  return Array.from(text).length; // code points, the unit of the limits
}

function opensSentence(text: string, index: number): boolean {
  const before = text.slice(0, index).replace(WRAPPERS, "");
  return before === "" || SENTENCE_END.test(before);
}

function isShouted(word: string): boolean {
  return lengthOf(word) > 1 && word === word.toUpperCase();
}

function knownWords(names: readonly string[]): Set<string> {
  return new Set(names.flatMap((name) => name.split(/\s+/u)));
}

function unknownName(text: string, known: ReadonlySet<string>): string | undefined {
  for (const match of text.matchAll(WORD)) {
    const word = match[0];
    const passes =
      !/^\p{Lu}/u.test(word) ||
      opensSentence(text, match.index) ||
      isShouted(word) ||
      CAPITALIZED_EXCEPTIONS.has(word) ||
      known.has(word);
    if (!passes) {
      return word;
    }
  }
  return undefined;
}

function contentProblem(line: RenderedLine, knownNames: readonly string[]): LineError | undefined {
  const known = knownWords(knownNames);
  for (const text of [line.fala, line.gesto]) {
    const mechanics = MECHANICS.exec(text);
    if (mechanics !== null) {
      return { code: "MECHANICS", detail: mechanics[0] };
    }
    const name = unknownName(text, known);
    if (name !== undefined) {
      return { code: "UNKNOWN_NAME", detail: name };
    }
  }
  return undefined;
}

function sizeProblem(line: RenderedLine): LineError | undefined {
  if (line.fala === "" && line.gesto === "") {
    return { code: "EMPTY", detail: "" };
  }
  if (lengthOf(line.fala) > MAX_FALA_LENGTH) {
    return { code: "TOO_LONG", detail: "fala" };
  }
  return lengthOf(line.gesto) > MAX_GESTO_LENGTH
    ? { code: "TOO_LONG", detail: "gesto" }
    : undefined;
}

/**
 * Validates a line from the text model.
 *
 * @param knownNames names the speaker may say: who is present and who is in the
 *   known facts. Each word of a name counts on its own ("Maria Clara" lets
 *   "Clara" pass).
 * @returns the trimmed line, or the first problem found.
 */
export function validateLine(
  raw: unknown,
  knownNames: readonly string[],
): Result<RenderedLine, LineError> {
  const parsed = lineSchema.safeParse(raw);
  if (!parsed.success) {
    return err({ code: "SCHEMA", detail: "" });
  }
  const line = { fala: parsed.data.fala.trim(), gesto: parsed.data.gesto.trim() };
  const problem = sizeProblem(line) ?? contentProblem(line, knownNames);
  return problem === undefined ? ok(line) : err(problem);
}
