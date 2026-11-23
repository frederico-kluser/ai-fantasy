import { setImmediate as nextTurn } from "node:timers/promises";

import { describe, expect, it } from "vitest";

import { gate } from "../test/support.ts";
import { createKeyedQueue } from "./keyed-queue.ts";

describe("keyed queue (one write at a time per file)", () => {
  it("given two tasks with the same key when both are queued then the second starts only after the first ends", async () => {
    const run = createKeyedQueue();
    const first = gate();
    const order: string[] = [];

    const a = run("slice-1", async () => {
      order.push("a starts");
      await first.opened;
      order.push("a ends");
    });
    const b = run("slice-1", async () => {
      order.push("b starts");
      await Promise.resolve();
    });
    await nextTurn();
    const whileFirstRuns = [...order];
    first.open();
    await Promise.all([a, b]);

    expect({ whileFirstRuns, order }).toEqual({
      whileFirstRuns: ["a starts"],
      order: ["a starts", "a ends", "b starts"],
    });
  });

  it("given two tasks with different keys when both are queued then they run at the same time", async () => {
    const run = createKeyedQueue();
    const first = gate();
    const order: string[] = [];

    const a = run("slice-1", async () => {
      order.push("a starts");
      await first.opened;
    });
    const b = run("slice-2", async () => {
      order.push("b runs");
      await Promise.resolve();
    });
    await b;
    const beforeFirstEnds = [...order];
    first.open();
    await a;

    expect(beforeFirstEnds).toEqual(["a starts", "b runs"]);
  });

  it("given a task that fails when the next one with the same key runs then it still runs and each gets its own outcome", async () => {
    const run = createKeyedQueue();

    const failed = run("slice-1", () => Promise.reject(new Error("first failed")));
    const next = run("slice-1", () => Promise.resolve("second value"));

    await expect(failed).rejects.toThrow("first failed");
    await expect(next).resolves.toBe("second value");
  });

  it("given three tasks with the same key when the first ends then the third still waits for the second", async () => {
    const run = createKeyedQueue();
    const first = gate();
    const second = gate();
    const order: string[] = [];

    const a = run("k", async () => {
      await first.opened;
      order.push("a");
    });
    const b = run("k", async () => {
      order.push("b starts");
      await second.opened;
      order.push("b ends");
    });
    first.open();
    await a;
    await nextTurn();
    const c = run("k", async () => {
      order.push("c");
      await Promise.resolve();
    });
    await nextTurn();
    const whileSecondRuns = [...order];
    second.open();
    await Promise.all([b, c]);

    expect({ whileSecondRuns, order }).toEqual({
      whileSecondRuns: ["a", "b starts"],
      order: ["a", "b starts", "b ends", "c"],
    });
  });
});
