import { inspect } from "node:util";

import { describe, expect, it } from "vitest";

import { REDACTED, Secret } from "./secret.ts";

/** A recognizable fake key: it must never show up where it does not belong. */
const FAKE_KEY = "sk-or-v1-TEST-ONLY-secret-wrapper-0123456789";

describe("Secret (development-rules §11: the key never reaches logs or responses)", () => {
  it("given a secret when revealing it then its value comes back", () => {
    expect(new Secret(FAKE_KEY).reveal()).toBe(FAKE_KEY);
  });

  it("given the redaction text when reading it then it is [redacted]", () => {
    expect(REDACTED).toBe("[redacted]");
  });

  it.each([
    ["String()", (secret: Secret) => String(secret)],
    ["a template literal", (secret: Secret) => `${secret.toString()}|${String(secret)}`],
    ["concatenation", (secret: Secret) => "key: " + secret.toString()],
  ])("given a secret when converting it with %s then the value is redacted", (_how, convert) => {
    const text = convert(new Secret(FAKE_KEY));

    expect({ hasKey: text.includes(FAKE_KEY), hasRedacted: text.includes(REDACTED) }).toEqual({
      hasKey: false,
      hasRedacted: true,
    });
  });

  it("given a secret inside an object when serializing to JSON then the value is redacted", () => {
    const json = JSON.stringify({ config: { aiApiKey: new Secret(FAKE_KEY) } });

    expect(json).toBe('{"config":{"aiApiKey":"[redacted]"}}');
  });

  it("given a secret inside an object when inspecting it then the value is redacted", () => {
    const text = inspect({ config: { aiApiKey: new Secret(FAKE_KEY) } }, { depth: 5 });

    expect(text).toBe("{ config: { aiApiKey: [redacted] } }");
  });

  it("given a secret when listing its own properties then the value is not one of them", () => {
    const secret = new Secret(FAKE_KEY);

    expect({
      keys: Object.keys(secret),
      names: Object.getOwnPropertyNames(secret),
      entries: Object.entries(secret),
    }).toEqual({ keys: [], names: [], entries: [] });
  });
});
