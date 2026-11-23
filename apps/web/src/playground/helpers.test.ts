import { describe, expect, it } from "vitest";

import { PRESETS } from "../engine/presets.ts";
import { withEvent } from "./BondFields.tsx";
import { associationOf } from "./CastFields.tsx";
import { oneOf } from "./fields.tsx";
import { gridOf, gridRows, standingCells } from "./grid.ts";
import { displayName, nameIn, withOther } from "./labels.ts";
import { cellOf } from "./PositionFields.tsx";

describe("form helpers", () => {
  it.each([
    ["FEAR:water", { tag: "water", kind: "FEAR" }],
    ["ATTACHMENT:fire", { tag: "fire", kind: "ATTACHMENT" }],
    ["", null],
    ["FEAR:lava", null],
    ["LOVE:fire", null],
    ["FEAR", null],
  ])("given the association value %j when reading then it is %j", (value, association) => {
    expect(associationOf(value)).toStrictEqual(association);
  });

  it.each([
    ["3,4", { x: 3, y: 4 }],
    ["0,0", { x: 0, y: 0 }],
    ["12,3", { x: 12, y: 3 }],
    ["3,12", { x: 3, y: 12 }],
    ["", null],
    ["3", null],
    ["a,b", null],
    ["3,4,5", null],
    [" 3,4", null],
  ])("given the cell value %j when reading then it is %j", (value, cell) => {
    expect(cellOf(value)).toStrictEqual(cell);
  });

  it("given an empty list when setting the first event then it is the only one", () => {
    expect(withEvent([], 0, "stole", 1)).toStrictEqual([{ event: "stole", author: 1 }]);
  });

  it("given one event when setting the second slot then both stay in order", () => {
    expect(withEvent([{ event: "stole", author: 0 }], 1, "forgave", 1)).toStrictEqual([
      { event: "stole", author: 0 },
      { event: "forgave", author: 1 },
    ]);
  });

  it("given two events when emptying the first then the second closes up", () => {
    const events = [
      { event: "stole", author: 0 },
      { event: "forgave", author: 1 },
    ] as const;

    expect(withEvent(events, 0, null, 0)).toStrictEqual([{ event: "forgave", author: 1 }]);
  });

  it("given an id in the list when picking then it comes back; otherwise undefined", () => {
    expect([oneOf(["a", "b"], "b"), oneOf(["a", "b"], "c")]).toStrictEqual(["b", undefined]);
  });

  it("given a catalog when naming then the name comes back; an unknown id stays as it is", () => {
    expect([nameIn(PRESETS.weathers, "fog"), nameIn(PRESETS.weathers, "acid")]).toStrictEqual([
      "neblina",
      "acid",
    ]);
  });

  it.each([
    ["medo de B", "medo de Joca"],
    ["traiu B com outra pessoa, às escondidas", "traiu Joca com outra pessoa, às escondidas"],
    ["Bia e B", "Bia e Joca"],
    ["B e B", "Joca e Joca"],
    ["afeto", "afeto"],
  ])("given the catalog name %j when naming the other person then it reads %j", (text, named) => {
    expect(withOther(text, "Joca")).toBe(named);
  });

  it("given a name or none when displaying then the name or the place in the cast shows", () => {
    expect([displayName(" Ana ", 0), displayName("  ", 2)]).toStrictEqual(["Ana", "Personagem 3"]);
  });

  it("given the vehicle when listing where to stand then the passable cells come in index order", () => {
    const grid = gridOf(PRESETS, "vehicle");

    expect(
      standingCells(grid ?? { width: 0, height: 0, cells: [], exits: [], roofed: [] }).slice(0, 3),
    ).toStrictEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
  });

  it("given presets without the place when reading its grid then there is none", () => {
    expect(gridOf({ ...PRESETS, places: [] }, "home")).toBeNull();
  });

  it("given a broken template when reading its grid then there is none", () => {
    const place = PRESETS.places[0];
    const broken = {
      ...PRESETS,
      places: [{ ...place, id: "home", grid: { rows: [], exits: [], roofed: "ALL", starts: [] } }],
    };

    // A broken catalog is only possible by hand: the loader refuses it.
    expect(gridOf(broken as typeof PRESETS, "home")).toBeNull();
  });

  it("given positions when drawing the rows then each placed character shows its number", () => {
    expect(gridRows(["...", "..."], [{ x: 1, y: 0 }, null, { x: 2, y: 1 }])).toStrictEqual([
      ".1.",
      "..3",
    ]);
  });
});
