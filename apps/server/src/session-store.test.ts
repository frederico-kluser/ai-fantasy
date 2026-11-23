import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, posix, win32 } from "node:path";

import { describe, expect, it } from "vitest";

import { temporaryFolder, writeTree } from "../test/support.ts";
import { sessionId } from "./session-format.ts";
import { createSessionStore, resolveInside, writeFileAtomically } from "./session-store.ts";

const OUTSIDE = "Invariant violated: a session path would leave the data folder.";

/** A validated id, as the routes hand it to the store. */
function id(value: string) {
  return sessionId.parse(value);
}

describe("paths stay inside the data folder (overview §8, defense in depth)", () => {
  it.each([
    [
      "posix",
      posix,
      "/data",
      ["campaigns", "a", "campaign.json"],
      "/data/campaigns/a/campaign.json",
    ],
    ["win32", win32, "C:\\data", ["campaigns", "a"], "C:\\data\\campaigns\\a"],
    ["win32 at a drive root", win32, "D:\\", ["campaigns"], "D:\\campaigns"],
  ])(
    "given %s segments inside the root when resolving then the path is returned",
    (_os, paths, root, segments, expected) => {
      expect(resolveInside(root, segments, paths)).toBe(expected);
    },
  );

  it.each([
    ["posix", posix, "/data", [".."]],
    ["posix", posix, "/data", ["campaigns", "..", "..", "etc"]],
    ["posix", posix, "/data", ["../data-other/x"]],
    ["posix", posix, "/data", ["/etc/passwd"]],
    ["posix", posix, "/data", []],
    ["posix", posix, "/data", ["campaigns", ".."]],
    ["win32", win32, "C:\\data", ["..\\x"]],
    ["win32", win32, "C:\\data", ["D:\\x"]],
    ["win32", win32, "C:\\data", ["."]],
  ])(
    "given %s segments %j that leave the root when resolving then it is an invariant error",
    (_os, paths, root, segments) => {
      expect(() => resolveInside(root, segments, paths)).toThrow(OUTSIDE);
    },
  );

  it("given the platform paths when resolving inside a real folder then the platform path is returned", () => {
    const root = temporaryFolder();

    expect(resolveInside(root, ["campaigns", "a"])).toBe(join(root, "campaigns", "a"));
  });
});

describe("atomic writes (temporary file in the same folder, then rename)", () => {
  it("given a new file when writing it then it holds the content and no temporary file is left", async () => {
    const folder = temporaryFolder();
    const path = join(folder, "campaign.json");

    await writeFileAtomically(path, '{"formatVersion":1}\n');

    expect({ content: readFileSync(path, "utf8"), files: readdirSync(folder) }).toEqual({
      content: '{"formatVersion":1}\n',
      files: ["campaign.json"],
    });
  });

  it("given an existing file when writing it again then the content is replaced", async () => {
    const folder = temporaryFolder();
    const path = writeTree(folder, "1.jsonl", "old\n");

    await writeFileAtomically(path, Buffer.from("new\n"));

    expect({ content: readFileSync(path, "utf8"), files: readdirSync(folder) }).toEqual({
      content: "new\n",
      files: ["1.jsonl"],
    });
  });

  it("given a temporary path that already exists when writing then nothing is overwritten and the error is raised", async () => {
    const folder = temporaryFolder();
    const temporary = writeTree(folder, ".campaign.json.taken.tmp", "someone else's file");

    await expect(
      writeFileAtomically(join(folder, "campaign.json"), "{}\n", temporary),
    ).rejects.toThrow();
    expect({ files: readdirSync(folder), kept: readFileSync(temporary, "utf8") }).toEqual({
      files: [".campaign.json.taken.tmp"],
      kept: "someone else's file",
    });
  });

  it("given a target that cannot be replaced when writing then the error is raised and no temporary file is left", async () => {
    const folder = temporaryFolder();
    writeTree(folder, "campaign.json/inside.txt", "a folder where the file should be");

    await expect(writeFileAtomically(join(folder, "campaign.json"), "{}\n")).rejects.toThrow();
    expect(readdirSync(folder)).toEqual(["campaign.json"]);
  });
});

describe("session store (data/campaigns/<id>/campaign.json and slices/<id>.jsonl)", () => {
  it("given no data folder when listing campaigns then the list is empty", async () => {
    const store = createSessionStore(join(temporaryFolder(), "missing"));

    await expect(store.listCampaigns()).resolves.toEqual([]);
  });

  it("given a saved campaign when reading it then the saved text comes back and it exists", async () => {
    const dataDir = temporaryFolder();
    const store = createSessionStore(dataDir);

    await store.writeCampaign(id("tavern"), '{"formatVersion":1}\n');

    expect({
      file: readFileSync(join(dataDir, "campaigns", "tavern", "campaign.json"), "utf8"),
      read: (await store.readCampaign(id("tavern")))?.toString("utf8"),
      exists: await store.hasCampaign(id("tavern")),
    }).toEqual({ file: '{"formatVersion":1}\n', read: '{"formatVersion":1}\n', exists: true });
  });

  it("given no campaign when reading it then nothing comes back and it does not exist", async () => {
    const store = createSessionStore(temporaryFolder());

    expect({
      read: await store.readCampaign(id("missing")),
      exists: await store.hasCampaign(id("missing")),
    }).toEqual({ read: undefined, exists: false });
  });

  it("given a campaign folder whose campaign.json is a folder when checking it then it does not exist", async () => {
    const dataDir = temporaryFolder();
    mkdirSync(join(dataDir, "campaigns", "odd", "campaign.json"), { recursive: true });

    await expect(createSessionStore(dataDir).hasCampaign(id("odd"))).resolves.toBe(false);
  });

  it("given a campaign.json that cannot be read when reading it then the error is raised", async () => {
    const dataDir = temporaryFolder();
    mkdirSync(join(dataDir, "campaigns", "odd", "campaign.json"), { recursive: true });

    await expect(createSessionStore(dataDir).readCampaign(id("odd"))).rejects.toThrow();
  });

  it("given a saved slice when reading it then the bytes are identical", async () => {
    const dataDir = temporaryFolder();
    const store = createSessionStore(dataDir);
    const slice = Buffer.from('{"formatVersion":1}\n{"line":"Olá ☕"}\r\n', "utf8");

    await store.writeSlice(id("tavern"), id("2-b"), slice);

    expect({
      file: readFileSync(join(dataDir, "campaigns", "tavern", "slices", "2-b.jsonl")),
      read: await store.readSlice(id("tavern"), id("2-b")),
    }).toEqual({ file: slice, read: slice });
  });

  it("given no slice when reading it then nothing comes back", async () => {
    await expect(createSessionStore(temporaryFolder()).readSlice(id("a"), id("1"))).resolves.toBe(
      undefined,
    );
  });

  it("given campaigns, slices and stray entries when listing then only valid ones come, in lexicographic order", async () => {
    const dataDir = temporaryFolder();
    const campaigns = join(dataDir, "campaigns");
    ["b", "a", "a-2", "Upper", ".hidden"].map((name) =>
      writeTree(campaigns, join(name, "campaign.json"), '{"formatVersion":1}\n'),
    );
    mkdirSync(join(campaigns, "no-campaign-file", "slices"), { recursive: true });
    writeFileSync(join(campaigns, "stray.txt"), "not a campaign");
    [
      "2.jsonl",
      "10.jsonl",
      "1.jsonl",
      "2-b.jsonl",
      ".1.jsonl.0f9e.tmp",
      "notes.txt",
      "Bad.jsonl",
    ].map((name) => writeTree(campaigns, join("a", "slices", name), '{"formatVersion":1}\n'));
    mkdirSync(join(campaigns, "a", "slices", "3.jsonl"));

    await expect(createSessionStore(dataDir).listCampaigns()).resolves.toEqual([
      { id: "a", sliceIds: ["1", "10", "2", "2-b"] },
      { id: "a-2", sliceIds: [] },
      { id: "b", sliceIds: [] },
    ]);
  });
});
