import { expect, it } from "vitest";

import { describeSign } from "./sample.ts";

it("given a positive number when describing the sign then it is positive", () => {
  expect(describeSign(1)).toBe("positive");
});
