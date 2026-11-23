/**
 * Atomic file writes (overview §8): a new temporary file in the same folder,
 * created exclusively and flushed to disk, then renamed over the target. Readers
 * see the old file or the new one, never half of it.
 *
 * On Windows, renaming over a file that another handle has open (a reader of
 * the same slice, an antivirus) fails for a moment with `EPERM`, `EACCES` or
 * `EBUSY`. The rename is then retried after short, growing waits; when the file
 * stays busy the write is reported as `busy` (a value, not an exception) and
 * the old file is left as it was.
 */
import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { hasErrorCode, unlessMissing } from "./fs-errors.ts";
import type { Result } from "./result.ts";

/** Waits before each new rename attempt, in milliseconds: about 2.3 s in all. */
export const RENAME_RETRY_DELAYS_MS: readonly number[] = [10, 20, 40, 80, 160, 320, 640, 1000];

/** Rename failures that mean "the target is in use right now" (Windows). */
const BUSY_CODES = ["EPERM", "EACCES", "EBUSY"];

/** The file operations of an atomic write; tests replace them to inject failures and waits. */
export interface AtomicWriteIo {
  readonly temporaryPathFor: (path: string) => string;
  /** Creates a folder and its parents; nothing happens when it exists. */
  readonly makeFolder: (path: string) => Promise<void>;
  readonly writeFile: (
    path: string,
    content: string | Buffer,
    options: { readonly flag: string; readonly flush: boolean },
  ) => Promise<void>;
  readonly rename: (from: string, to: string) => Promise<void>;
  readonly remove: (path: string) => Promise<void>;
  readonly wait: (milliseconds: number) => Promise<void>;
}

/** The real file operations. */
export const NODE_IO: AtomicWriteIo = {
  // `.<name>.<uuid>.tmp` is never a valid session file name, so listings skip it.
  temporaryPathFor: (path) => join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`),
  makeFolder: async (path) => {
    await mkdir(path, { recursive: true });
  },
  writeFile: async (path, content, options) => {
    await writeFile(path, content, options);
  },
  rename,
  remove: async (path) => {
    await rm(path);
  },
  wait: async (milliseconds) => {
    await sleep(milliseconds);
  },
};

/** Written, or `busy`: the target stayed in use through every retry. */
export type AtomicWriteResult = Result<undefined, "busy">;

async function removeIfPresent(path: string, io: AtomicWriteIo): Promise<void> {
  await unlessMissing(io.remove(path), undefined);
}

/** Writes the temporary file; on failure removes it, unless it already existed (not ours). */
async function writeTemporary(
  temporary: string,
  content: string | Buffer,
  io: AtomicWriteIo,
): Promise<void> {
  try {
    await io.writeFile(temporary, content, { flag: "wx", flush: true });
  } catch (error) {
    if (!hasErrorCode(error, ["EEXIST"])) {
      await removeIfPresent(temporary, io);
    }
    throw error;
  }
}

/** One rename attempt: `true` when done, `false` when the target is busy. */
async function renamed(from: string, to: string, io: AtomicWriteIo): Promise<boolean> {
  try {
    await io.rename(from, to);
    return true;
  } catch (error) {
    if (hasErrorCode(error, BUSY_CODES)) {
      return false;
    }
    throw error;
  }
}

/** Renames, retrying while the target is busy; `false` when it stayed busy. */
async function renameWhenFree(from: string, to: string, io: AtomicWriteIo): Promise<boolean> {
  for (const delay of RENAME_RETRY_DELAYS_MS) {
    if (await renamed(from, to, io)) {
      return true;
    }
    await io.wait(delay);
  }
  return renamed(from, to, io);
}

/**
 * Writes `content` to `path` atomically, creating its folder first. Any failure
 * removes the temporary file (an existing file at the temporary path is never
 * touched) and is raised.
 *
 * @returns `{ ok: true }` when written, or `{ ok: false, error: "busy" }` when
 *   the target stayed in use through every retry; the old file is kept then.
 */
export async function writeFileAtomically(
  path: string,
  content: string | Buffer,
  io: AtomicWriteIo = NODE_IO,
): Promise<AtomicWriteResult> {
  const temporary = io.temporaryPathFor(path);
  await io.makeFolder(dirname(path));
  await writeTemporary(temporary, content, io);
  const done = await renameWhenFree(temporary, path, io).catch(async (error: unknown) => {
    await removeIfPresent(temporary, io);
    throw error;
  });
  if (!done) {
    await removeIfPresent(temporary, io);
    return { ok: false, error: "busy" };
  }
  return { ok: true, value: undefined };
}
