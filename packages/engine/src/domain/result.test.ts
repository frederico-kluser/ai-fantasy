import { describe, expect, it } from "vitest";

import { err, ok } from "./result.ts";

describe("Result (development-rules §4)", () => {
  it("given a value when wrapping it with ok then the result is ok and carries the value", () => {
    expect(ok(7)).toStrictEqual({ ok: true, value: 7 });
  });

  it("given an error when wrapping it with err then the result is not ok and carries the error", () => {
    expect(err("INVALID_ID")).toStrictEqual({ ok: false, error: "INVALID_ID" });
  });
});
