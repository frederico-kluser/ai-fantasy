/**
 * Saved sessions on disk (overview §8): `campaigns/<id>/campaign.json` and
 * `campaigns/<id>/slices/<sliceId>.jsonl` inside the data folder. Ids reach the
 * store already validated; every path is still checked to stay inside the data
 * folder (defense in depth). Writes are atomic: a temporary file in the same
 * folder, then a rename.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { PlatformPath } from "node:path";

import { sessionId, type SessionId } from "./session-format.ts";

/** A campaign with its slices, as `GET /api/sessions/campaigns` lists it. */
export interface CampaignSummary {
  readonly id: string;
  /** Slice ids in lexicographic order. */
  readonly sliceIds: readonly string[];
}

/** Reads and writes campaigns and slices in one data folder. */
export interface SessionStore {
  /** Campaigns that have a `campaign.json`, with their slices, in lexicographic order. */
  readonly listCampaigns: () => Promise<CampaignSummary[]>;
  /** Whether the campaign was saved (its `campaign.json` exists). */
  readonly hasCampaign: (campaignId: SessionId) => Promise<boolean>;
  /** The saved `campaign.json`, or `undefined` when there is none. */
  readonly readCampaign: (campaignId: SessionId) => Promise<Buffer | undefined>;
  /** Saves `campaign.json` atomically, creating the campaign folder. */
  readonly writeCampaign: (campaignId: SessionId, content: string) => Promise<void>;
  /** The saved slice, byte for byte, or `undefined` when there is none. */
  readonly readSlice: (campaignId: SessionId, sliceId: SessionId) => Promise<Buffer | undefined>;
  /** Saves the slice atomically and exactly as given, creating the slices folder. */
  readonly writeSlice: (
    campaignId: SessionId,
    sliceId: SessionId,
    content: Buffer,
  ) => Promise<void>;
}

/** The path functions {@link resolveInside} needs; tests pass `posix` or `win32`. */
export type PathFunctions = Pick<PlatformPath, "resolve" | "relative" | "isAbsolute" | "sep">;

const PLATFORM_PATHS: PathFunctions = { resolve, relative, isAbsolute, sep };

const CAMPAIGNS = "campaigns";
const CAMPAIGN_FILE = "campaign.json";
const SLICES = "slices";
const SLICE_SUFFIX = ".jsonl";

/**
 * Resolves `segments` under `root` and checks the result is strictly inside it.
 *
 * @throws Error when the path would leave `root` (or be `root` itself). Ids are
 *   validated before they get here, so this is an invariant violation, not an
 *   expected failure.
 */
export function resolveInside(
  root: string,
  segments: readonly string[],
  paths: PathFunctions = PLATFORM_PATHS,
): string {
  const target = paths.resolve(root, ...segments);
  const fromRoot = paths.relative(root, target);
  const outside =
    fromRoot === "" || paths.isAbsolute(fromRoot) || fromRoot.split(paths.sep)[0] === "..";
  if (outside) {
    throw new Error("Invariant violated: a session path would leave the data folder.");
  }
  return target;
}

/**
 * Writes `content` to `path` atomically: first to a temporary file in the same
 * folder (flushed to disk), then renamed over `path`. Readers see the old file
 * or the new one, never half of it. On failure the temporary file is removed and
 * the error is raised.
 */
export async function writeFileAtomically(path: string, content: string | Buffer): Promise<void> {
  const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  await writeFile(temporary, content, { flag: "wx", flush: true });
  try {
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/** `fallback` when `promise` fails because a file or folder does not exist. */
async function unlessMissing<T, F>(promise: Promise<T>, fallback: F): Promise<T | F> {
  try {
    return await promise;
  } catch (error) {
    if (isMissing(error)) {
      return fallback;
    }
    throw error;
  }
}

function isSessionId(value: unknown): value is SessionId {
  return sessionId.safeParse(value).success;
}

function sliceIdOf(fileName: string): string | undefined {
  return fileName.endsWith(SLICE_SUFFIX) ? fileName.slice(0, -SLICE_SUFFIX.length) : undefined;
}

/** Names of the entries of `folder` that `keep` accepts; none when the folder is missing. */
async function entryNames(
  folder: string,
  keep: (entry: { isFile: () => boolean; isDirectory: () => boolean }) => boolean,
): Promise<string[]> {
  const entries = await unlessMissing(readdir(folder, { withFileTypes: true }), []);
  return entries.filter(keep).map((entry) => entry.name);
}

/** Where each thing lives inside the data folder (overview §8). */
function sessionPaths(dataDir: string) {
  return {
    campaigns: () => resolveInside(dataDir, [CAMPAIGNS]),
    campaignDir: (campaignId: string) => resolveInside(dataDir, [CAMPAIGNS, campaignId]),
    campaignFile: (campaignId: string) =>
      resolveInside(dataDir, [CAMPAIGNS, campaignId, CAMPAIGN_FILE]),
    slicesDir: (campaignId: string) => resolveInside(dataDir, [CAMPAIGNS, campaignId, SLICES]),
    sliceFile: (campaignId: string, sliceId: string) =>
      resolveInside(dataDir, [CAMPAIGNS, campaignId, SLICES, `${sliceId}${SLICE_SUFFIX}`]),
  };
}

/** The campaigns of the data folder, with their slices, in lexicographic order. */
async function listCampaigns(paths: ReturnType<typeof sessionPaths>): Promise<CampaignSummary[]> {
  const summary = async (campaignId: string): Promise<CampaignSummary | undefined> => {
    if (!(await isFile(paths.campaignFile(campaignId)))) {
      return undefined;
    }
    const files = await entryNames(paths.slicesDir(campaignId), (entry) => entry.isFile());
    return { id: campaignId, sliceIds: files.map(sliceIdOf).filter(isSessionId).sort() };
  };
  const folders = await entryNames(paths.campaigns(), (entry) => entry.isDirectory());
  const summaries = await Promise.all(folders.filter(isSessionId).sort().map(summary));
  return summaries.filter((entry) => entry !== undefined);
}

async function isFile(path: string): Promise<boolean> {
  return unlessMissing(
    stat(path).then((stats) => stats.isFile()),
    false,
  );
}

/** The store of the data folder `dataDir` (absolute). */
export function createSessionStore(dataDir: string): SessionStore {
  const paths = sessionPaths(dataDir);
  const { campaignDir, campaignFile, slicesDir, sliceFile } = paths;
  return {
    listCampaigns: async () => listCampaigns(paths),
    hasCampaign: async (campaignId) => isFile(campaignFile(campaignId)),
    readCampaign: async (campaignId) =>
      unlessMissing(readFile(campaignFile(campaignId)), undefined),
    writeCampaign: async (campaignId, content) => {
      await mkdir(campaignDir(campaignId), { recursive: true });
      await writeFileAtomically(campaignFile(campaignId), content);
    },
    readSlice: async (campaignId, sliceId) =>
      unlessMissing(readFile(sliceFile(campaignId, sliceId)), undefined),
    writeSlice: async (campaignId, sliceId, content) => {
      await mkdir(slicesDir(campaignId), { recursive: true });
      await writeFileAtomically(sliceFile(campaignId, sliceId), content);
    },
  };
}
