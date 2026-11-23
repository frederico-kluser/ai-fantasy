import { describe, expect, it } from "vitest";

import { ROUTES, routeOf } from "./routes.ts";

describe("routes (overview §6)", () => {
  it.each(["", "#", "#/"])(
    "given the hash %j when reading the route then it is the playground",
    (hash) => {
      expect(routeOf(hash)).toBe("playground");
    },
  );

  it.each([
    ["#/playground", "playground"],
    ["#/scene", "scene"],
    ["#/sessions", "sessions"],
    ["#/evaluation", "evaluation"],
  ] as const)("given %s when reading the route then it is %s", (hash, route) => {
    expect(routeOf(hash)).toBe(route);
  });

  it.each(["#/nowhere", "#/scene/extra", "#scene"])(
    "given the unknown hash %s when reading then it is notFound",
    (hash) => {
      expect(routeOf(hash)).toBe("notFound");
    },
  );

  it("given the routes when listing then the order and labels follow the screens of the site", () => {
    expect(ROUTES.map(({ hash, label }) => [hash, label])).toStrictEqual([
      ["#/playground", "Playground"],
      ["#/scene", "Cena"],
      ["#/sessions", "Sessões"],
      ["#/evaluation", "Avaliação"],
    ]);
  });
});
