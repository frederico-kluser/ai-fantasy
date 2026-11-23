/**
 * Saved sessions on disk (overview §8): `campaigns/<id>/campaign.json` and
 * `campaigns/<id>/slices/<sliceId>.jsonl` inside the data folder. Ids reach the
 * store already validated; every path is still checked to stay inside the data
 * folder (defense in depth). Writes are atomic (`atomic-write.ts`) and queued
 * per file, so two saves of the same file never race.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { PlatformPath } from "node:path";

import {
  NODE_IO,
  writeFileAtomically,
  type AtomicWriteIo,
  type AtomicWriteResult,
} from "./atomic-write.ts";
import { unlessMissing } from "./fs-errors.ts";
import { createKeyedQueue } from "./keyed-queue.ts";
import { sortedSessionIds, type SessionId } from "./session-format.ts";

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
  /** Saves `campaign.json` atomically, creating the campaign folder; `busy` if it stayed in use. */
  readonly writeCampaign: (campaignId: SessionId, content: string) => Promise<AtomicWriteResult>;
  /** The saved slice, byte for byte, or `undefined` when there is none. */
  readonly readSlice: (campaignId: SessionId, sliceId: SessionId) => Promise<Buffer | undefined>;
  /** Saves the slice atomically and exactly as given; `busy` if it stayed in use. */
  readonly writeSlice: (
    campaignId: SessionId,
    sliceId: SessionId,
    content: Buffer,
  ) => Promise<AtomicWriteResult>;
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

async function isFile(path: string): Promise<boolean> {
  return unlessMissing(
    stat(path).then((stats) => stats.isFile()),
    false,
  );
}

/** Where each thing lives inside the data folder (overview §8). */
function sessionPaths(dataDir: string) {
  return {
    campaigns: () => resolveInside(dataDir, [CAMPAIGNS]),
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
    return { id: campaignId, sliceIds: sortedSessionIds(files.map(sliceIdOf)) };
  };
  const folders = await entryNames(paths.campaigns(), (entry) => entry.isDirectory());
  const summaries = await Promise.all(sortedSessionIds(folders).map(summary));
  return summaries.filter((entry) => entry !== undefined);
}

/**
 * The store of the data folder `dataDir` (absolute). `io` is the file layer of
 * the atomic writes; tests replace it to simulate busy files.
 *
 * Reads and saves of the same file share one queue: a reader of this server
 * never holds a file open while its save renames over it (on Windows that
 * rename would fail). Other programs can still hold it; the save retries then.
 */
export function createSessionStore(dataDir: string, io: AtomicWriteIo = NODE_IO): SessionStore {
  const paths = sessionPaths(dataDir);
  const { campaignFile, sliceFile } = paths;
  const queued = createKeyedQueue();
  const read = (file: string) => queued(file, () => unlessMissing(readFile(file), undefined));
  const save = (file: string, content: string | Buffer) =>
    queued(file, () => writeFileAtomically(file, content, io));
  return {
    listCampaigns: async () => listCampaigns(paths),
    hasCampaign: async (campaignId) => isFile(campaignFile(campaignId)),
    readCampaign: async (campaignId) => read(campaignFile(campaignId)),
    writeCampaign: async (campaignId, content) => save(campaignFile(campaignId), content),
    readSlice: async (campaignId, sliceId) => read(sliceFile(campaignId, sliceId)),
    writeSlice: async (campaignId, sliceId, content) =>
      save(sliceFile(campaignId, sliceId), content),
  };
}
