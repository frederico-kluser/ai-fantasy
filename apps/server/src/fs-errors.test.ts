import { describe, expect, it } from "vitest";

import { fileError } from "../test/support.ts";
import { errorCodeOf, hasErrorCode, unlessMissing } from "./fs-errors.ts";

describe("file system error codes", () => {
  it.each([
    ["ENOENT", ["ENOENT"], true],
    ["EPERM", ["EPERM", "EACCES", "EBUSY"], true],
    ["EBUSY", ["EPERM", "EACCES", "EBUSY"], true],
    ["EISDIR", ["EPERM", "EACCES", "EBUSY"], false],
    ["ENOENT", [], false],
  ] as const)(
    "given an error with code %s when checking it against %j then the answer is %s",
    (code, codes, expected) => {
      expect(hasErrorCode(fileError(code), codes)).toBe(expected);
    },
  );

  it.each([
    ["an error without a code", new Error("no code")],
    ["a string", "ENOENT"],
    ["undefined", undefined],
    ["a code that is not text", { code: 2 }],
  ])("given %s when checking its code then it has none", (_case, error) => {
    expect(hasErrorCode(error, ["ENOENT", "2"])).toBe(false);
  });
});

describe("reading the code of an error", () => {
  it("given an error with a code when reading it then the code comes back", () => {
    expect(errorCodeOf(fileError("EADDRINUSE"))).toBe("EADDRINUSE");
  });

  it.each([new Error("no code"), "EADDRINUSE", { code: 7 }, null])(
    "given %j when reading its code then there is none",
    (error) => {
      expect(errorCodeOf(error)).toBeUndefined();
    },
  );
});

describe("fallback when a file or folder is missing", () => {
  it("given a promise that resolves when waiting then its value comes back", async () => {
    await expect(unlessMissing(Promise.resolve("value"), "fallback")).resolves.toBe("value");
  });

  it("given a promise that fails because the file is missing when waiting then the fallback comes back", async () => {
    await expect(unlessMissing(Promise.reject(fileError("ENOENT")), "fallback")).resolves.toBe(
      "fallback",
    );
  });

  it("given a promise that fails for another reason when waiting then the error is raised", async () => {
    await expect(unlessMissing(Promise.reject(fileError("EISDIR")), "fallback")).rejects.toThrow(
      "file error EISDIR",
    );
  });
});
