/**
 * Formats of the saved sessions (overview §8): the ids of campaigns and slices,
 * the campaign document and the slice JSONL. Everything here is checked before
 * anything touches the disk.
 */
import { isUtf8 } from "node:buffer";

import { z } from "zod";

import type { Result } from "./result.ts";

/**
 * Ids of campaigns and slices: 1 to 64 characters of `a-z`, `0-9` and `-`,
 * starting with a letter or a digit (slices: `1`, `2`, `2-b` for a branch).
 * No dot, slash or backslash, so an id never leaves its folder.
 */
export const SESSION_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * Device names Windows reserves, with or without an extension (`nul.jsonl`
 * too): many tools cannot open such files, so they are never ids.
 */
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/;

/**
 * A campaign id or a slice id: matches {@link SESSION_ID_PATTERN} and is not a
 * Windows reserved device name.
 */
export const sessionId = z
  .string()
  .regex(SESSION_ID_PATTERN)
  .refine((id) => !WINDOWS_RESERVED_NAME.test(id))
  .brand<"SessionId">();

/** A validated campaign id or slice id. */
export type SessionId = z.infer<typeof sessionId>;

function isSessionId(value: unknown): value is SessionId {
  return sessionId.safeParse(value).success;
}

/**
 * The valid session ids among `names`, in lexicographic order (by UTF-16 code
 * unit, never by locale: `"1" < "10" < "2"`). Folder listings come in whatever
 * order the file system gives, so the store always sorts them here.
 */
export function sortedSessionIds(names: readonly (string | undefined)[]): SessionId[] {
  return names.filter(isSessionId).sort();
}

/** A JSON object whose `formatVersion` is an integer ≥ 1; other fields are kept as they are. */
const versionedDocument = z.looseObject({ formatVersion: z.int().min(1) });

/** The campaign document (`campaign.json`): a {@link versionedDocument}. */
export const campaignDocument = versionedDocument;

const jsonObject = z.looseObject({});

const NOT_UTF8 = "Fatia inválida: o corpo não é texto UTF-8.";
const NO_FINAL_NEWLINE = "Fatia inválida: o JSONL tem de terminar com uma quebra de linha (\\n).";
const BAD_HEADER =
  "Fatia inválida: a primeira linha precisa de formatVersion inteiro maior ou igual a 1.";

function parseJsonLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

/**
 * Checks a slice body (JSONL): UTF-8 bytes ending with `\n`, one JSON object per
 * line, and a first line (the header) with an integer `formatVersion` ≥ 1.
 *
 * @returns the same bytes, untouched, so the slice is saved exactly as received;
 *   or the first problem found, in Portuguese, for the error response.
 */
export function validateSlice(body: unknown): Result<Buffer> {
  if (!(body instanceof Buffer) || !isUtf8(body)) {
    return { ok: false, error: NOT_UTF8 };
  }
  const text = body.toString("utf8");
  if (!text.endsWith("\n")) {
    return { ok: false, error: NO_FINAL_NEWLINE };
  }
  const lines = text.slice(0, -1).split("\n").map(parseJsonLine);
  const invalid = lines.findIndex((line) => !jsonObject.safeParse(line).success);
  if (invalid >= 0) {
    return { ok: false, error: `Fatia inválida: a linha ${invalid + 1} não é um objeto JSON.` };
  }
  if (!versionedDocument.safeParse(lines[0]).success) {
    return { ok: false, error: BAD_HEADER };
  }
  return { ok: true, value: body };
}
