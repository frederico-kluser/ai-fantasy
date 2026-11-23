import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { writeBenchReport } from "./run.ts";

const outDir = mkdtempSync(join(tmpdir(), "ai-fantasy-bench-"));

afterAll(() => {
  rmSync(outDir, { recursive: true, force: true });
});

describe("engine benchmark placeholder (testing-strategy §11)", () => {
  it("given no benchmark yet when writing the report then it says the benchmark arrives with SOC-05", () => {
    const file = join(outDir, "reports", "bench.md");

    writeBenchReport(file);

    expect(readFileSync(file, "utf8")).toContain("SOC-05");
  });
});
