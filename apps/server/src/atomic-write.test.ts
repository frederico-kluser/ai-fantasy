import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { renameFailing, temporaryFolder, writeTree } from "../test/support.ts";
import {
  NODE_IO,
  RENAME_RETRY_DELAYS_MS,
  writeFileAtomically,
  type AtomicWriteIo,
} from "./atomic-write.ts";

const WRITTEN = { ok: true, value: undefined };
/** `.<name>.<uuid>.tmp` for the target `1.jsonl`. */
const TEMPORARY_NAME = /^\.1\.jsonl\.[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.tmp$/;
const BUSY = { ok: false, error: "busy" };

/** Real file operations with instant waits that are recorded, plus the given overrides. */
function ioWith(overrides: Partial<AtomicWriteIo> = {}): { io: AtomicWriteIo; waits: number[] } {
  const waits: number[] = [];
  const io: AtomicWriteIo = {
    ...NODE_IO,
    wait: async (milliseconds) => {
      waits.push(milliseconds);
      await Promise.resolve();
    },
    ...overrides,
  };
  return { io, waits };
}

describe("atomic write (overview §8)", () => {
  it("given a new file when writing it then it holds the content and no temporary file is left", async () => {
    const folder = temporaryFolder();
    const path = join(folder, "campaign.json");

    const result = await writeFileAtomically(path, '{"formatVersion":1}\n', ioWith().io);

    expect({ result, content: readFileSync(path, "utf8"), files: readdirSync(folder) }).toEqual({
      result: WRITTEN,
      content: '{"formatVersion":1}\n',
      files: ["campaign.json"],
    });
  });

  it("given an existing file when writing it again then the content is replaced", async () => {
    const folder = temporaryFolder();
    const path = writeTree(folder, "1.jsonl", "old\n");

    await writeFileAtomically(path, Buffer.from("new\n"), ioWith().io);

    expect({ content: readFileSync(path, "utf8"), files: readdirSync(folder) }).toEqual({
      content: "new\n",
      files: ["1.jsonl"],
    });
  });

  it("given a target in folders that do not exist yet when writing then the folders are created", async () => {
    const folder = temporaryFolder();
    const path = join(folder, "campaigns", "tavern", "slices", "1.jsonl");

    const result = await writeFileAtomically(path, "{}\n", ioWith().io);

    expect({ result, content: readFileSync(path, "utf8") }).toEqual({
      result: WRITTEN,
      content: "{}\n",
    });
  });

  it("given the node file operations when naming a temporary file then it sits next to the target as .<name>.<uuid>.tmp", () => {
    const path = join(temporaryFolder(), "1.jsonl");

    const temporary = NODE_IO.temporaryPathFor(path);

    expect({
      folder: dirname(temporary),
      named: TEMPORARY_NAME.test(basename(temporary)),
    }).toEqual({ folder: dirname(path), named: true });
  });

  it("given the node file operations when waiting then the wait ends", async () => {
    await expect(NODE_IO.wait(1)).resolves.toBeUndefined();
  });
});

describe("temporary file never left behind or overwritten", () => {
  it("given a temporary path that already exists when writing then nothing is overwritten and the error is raised", async () => {
    const folder = temporaryFolder();
    const temporary = writeTree(folder, ".campaign.json.taken.tmp", "someone else's file");
    const { io } = ioWith({ temporaryPathFor: () => temporary });

    await expect(writeFileAtomically(join(folder, "campaign.json"), "{}\n", io)).rejects.toThrow();
    expect({ files: readdirSync(folder), kept: readFileSync(temporary, "utf8") }).toEqual({
      files: [".campaign.json.taken.tmp"],
      kept: "someone else's file",
    });
  });

  it("given a write of the temporary file that fails halfway when writing then the error is raised and no temporary file is left", async () => {
    const folder = temporaryFolder();
    const { io } = ioWith({
      writeFile: async (path) => {
        writeFileSync(path, "half of it");
        await Promise.reject(new Error("disk full"));
      },
    });

    await expect(writeFileAtomically(join(folder, "1.jsonl"), "{}\n", io)).rejects.toThrow(
      "disk full",
    );
    expect(readdirSync(folder)).toEqual([]);
  });

  it("given a rename that fails for a reason other than a busy file when writing then the error is raised at once and no temporary file is left", async () => {
    const folder = temporaryFolder();
    const { renameStub, calls } = renameFailing("EXDEV", 9);
    const { io, waits } = ioWith({ rename: renameStub });

    await expect(writeFileAtomically(join(folder, "1.jsonl"), "{}\n", io)).rejects.toThrow(
      "file error EXDEV",
    );
    expect({ calls, waits, files: readdirSync(folder) }).toEqual({
      calls: ["EXDEV"],
      waits: [],
      files: [],
    });
  });
});

describe("busy target (Windows: a reader holds the file open)", () => {
  it.each(["EPERM", "EACCES", "EBUSY"])(
    "given a rename that fails with %s twice when writing then it is retried after short waits and the file is written",
    async (code) => {
      const folder = temporaryFolder();
      const path = writeTree(folder, "1.jsonl", "old\n");
      const { renameStub, calls } = renameFailing(code, 2);
      const { io, waits } = ioWith({ rename: renameStub });

      const result = await writeFileAtomically(path, "new\n", io);

      expect({
        result,
        attempts: calls.length,
        waits,
        content: readFileSync(path, "utf8"),
        files: readdirSync(folder),
      }).toEqual({
        result: WRITTEN,
        attempts: 3,
        waits: [10, 20],
        content: "new\n",
        files: ["1.jsonl"],
      });
    },
  );

  it("given a target that stays busy on every attempt when writing then the write is reported busy, the old file stays and no temporary file is left", async () => {
    const folder = temporaryFolder();
    const path = writeTree(folder, "1.jsonl", "old\n");
    const { renameStub, calls } = renameFailing("EPERM", 99);
    const { io, waits } = ioWith({ rename: renameStub });

    const result = await writeFileAtomically(path, "new\n", io);

    expect({
      result,
      attempts: calls.length,
      waits,
      content: readFileSync(path, "utf8"),
      files: readdirSync(folder),
    }).toEqual({
      result: BUSY,
      attempts: RENAME_RETRY_DELAYS_MS.length + 1,
      waits: [10, 20, 40, 80, 160, 320, 640, 1000],
      content: "old\n",
      files: ["1.jsonl"],
    });
  });
});
