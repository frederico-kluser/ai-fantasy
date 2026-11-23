import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { setImmediate as nextTurn } from "node:timers/promises";
import { join, posix, win32 } from "node:path";

import { describe, expect, it } from "vitest";

import { gate, renameFailing, temporaryFolder, writeTree } from "../test/support.ts";
import { NODE_IO, type AtomicWriteIo } from "./atomic-write.ts";
import { sessionId } from "./session-format.ts";
import { createSessionStore, resolveInside } from "./session-store.ts";

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
    ["posix", posix, "/data", ["/outside/x"]],
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

describe("session store (data/campaigns/<id>/campaign.json and slices/<id>.jsonl)", () => {
  it("given no data folder when listing campaigns then the list is empty", async () => {
    const store = createSessionStore(join(temporaryFolder(), "missing"));

    await expect(store.listCampaigns()).resolves.toEqual([]);
  });

  it("given a saved campaign when reading it then the saved text comes back and it exists", async () => {
    const dataDir = temporaryFolder();
    const store = createSessionStore(dataDir);

    const written = await store.writeCampaign(id("tavern"), '{"formatVersion":1}\n');

    expect({
      written,
      file: readFileSync(join(dataDir, "campaigns", "tavern", "campaign.json"), "utf8"),
      read: (await store.readCampaign(id("tavern")))?.toString("utf8"),
      exists: await store.hasCampaign(id("tavern")),
    }).toEqual({
      written: { ok: true, value: undefined },
      file: '{"formatVersion":1}\n',
      read: '{"formatVersion":1}\n',
      exists: true,
    });
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

describe("saves under contention (Windows readers, simultaneous saves)", () => {
  it("given a slice that stays busy on every attempt when saving it then the store reports busy and the old slice stays", async () => {
    const dataDir = temporaryFolder();
    writeTree(dataDir, "campaigns/tavern/slices/1.jsonl", '{"formatVersion":1}\n');
    const { renameStub } = renameFailing("EPERM", 99);
    const io: AtomicWriteIo = { ...NODE_IO, rename: renameStub, wait: () => Promise.resolve() };
    const store = createSessionStore(dataDir, io);

    const result = await store.writeSlice(
      id("tavern"),
      id("1"),
      Buffer.from('{"formatVersion":2}\n'),
    );

    expect({
      result,
      slice: readFileSync(join(dataDir, "campaigns", "tavern", "slices", "1.jsonl"), "utf8"),
      files: readdirSync(join(dataDir, "campaigns", "tavern", "slices")),
    }).toEqual({
      result: { ok: false, error: "busy" },
      slice: '{"formatVersion":1}\n',
      files: ["1.jsonl"],
    });
  });

  it("given two saves of the same slice at the same time when they run then the second starts only after the first is renamed", async () => {
    const firstRename = gate();
    const steps: string[] = [];
    const io = recordingIo(steps, firstRename);
    const store = createSessionStore(temporaryFolder(), io);

    const first = store.writeSlice(id("tavern"), id("1"), Buffer.from("a"));
    const second = store.writeSlice(id("tavern"), id("1"), Buffer.from("b"));
    await nextTurn();
    const whileFirstWaits = [...steps];
    firstRename.open();
    await Promise.all([first, second]);

    expect({ whileFirstWaits, steps }).toEqual({
      whileFirstWaits: ["write a", "rename"],
      steps: ["write a", "rename", "write b", "rename"],
    });
  });

  it("given a read of a slice while its save is renaming when both run then the read waits and gets the new slice", async () => {
    const dataDir = temporaryFolder();
    writeTree(dataDir, "campaigns/tavern/slices/1.jsonl", "old\n");
    const rename = gate();
    const io: AtomicWriteIo = {
      ...NODE_IO,
      rename: async (from, to) => {
        await rename.opened;
        await NODE_IO.rename(from, to);
      },
    };
    const store = createSessionStore(dataDir, io);
    const progress: string[] = [];

    const save = store.writeSlice(id("tavern"), id("1"), Buffer.from("new\n"));
    const read = store.readSlice(id("tavern"), id("1")).then((slice) => {
      progress.push("read done");
      return slice?.toString("utf8");
    });
    await nextTurn();
    const whileSaving = [...progress];
    rename.open();
    await save;

    expect({ whileSaving, read: await read }).toEqual({ whileSaving: [], read: "new\n" });
  });

  it("given saves of two different slices at the same time when they run then neither waits for the other", async () => {
    const firstRename = gate();
    const steps: string[] = [];
    const store = createSessionStore(temporaryFolder(), recordingIo(steps, firstRename));

    const first = store.writeSlice(id("tavern"), id("1"), Buffer.from("a"));
    const second = store.writeSlice(id("tavern"), id("2"), Buffer.from("b"));
    await nextTurn();
    const beforeAnyRename = [...steps];
    firstRename.open();
    await Promise.all([first, second]);

    expect(beforeAnyRename).toEqual(["write a", "write b", "rename", "rename"]);
  });
});

/**
 * File operations that touch no disk: writes and renames are recorded in
 * `steps`, and every rename waits for `renames` to open.
 */
function recordingIo(steps: string[], renames: { readonly opened: Promise<void> }): AtomicWriteIo {
  return {
    ...NODE_IO,
    makeFolder: () => Promise.resolve(),
    writeFile: (_path, content) => {
      steps.push(`write ${content.toString()}`);
      return Promise.resolve();
    },
    rename: async () => {
      steps.push("rename");
      await renames.opened;
    },
    remove: () => Promise.resolve(),
  };
}
