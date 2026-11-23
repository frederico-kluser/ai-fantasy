import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { aDrawer, aLabel, forcing, ids } from "../../test/support/acts.ts";
import { openGrid } from "../../test/support/context.ts";
import { arbitraryTwoCells, cellAt, gridOf, idOf } from "../../test/support/space.ts";
import { toBp } from "../domain/bp.ts";
import { cellDistance } from "../space/grid.ts";
import { perceiveAct, type PerspectiveInput } from "./perspectives.ts";

const GRID = openGrid(25);
/** Daylight, no noise: normal speech reaches 8 cells, sight 20. */
const DAY = { noise: toBp(0), vision: 20 };

/** Author 1 at cell 0 of the 25 × 25 grid; the others at the cells given, by id. */
function scene(overrides: Partial<PerspectiveInput>, cells: Readonly<Record<number, number>>) {
  const others = Object.entries(cells).map(([id, cell]) => ({ id: idOf(Number(id)), cell }));
  return {
    grid: GRID,
    now: DAY,
    author: { id: idOf(1), cell: 0 },
    label: aLabel(),
    speech: true,
    others,
    ...overrides,
  };
}

const WHISPER = aLabel({ volume: "WHISPER" });

describe("perceiveAct: speech (simulation-model §8.2)", () => {
  it("given a whisper when resolving then a listener at distance 2 gets at most a FRAGMENT", () => {
    const drawer = aDrawer([forcing("HEAR_FRAGMENT", 1, 2)]);

    expect(perceiveAct(drawer, scene({ label: WHISPER }, { 2: 2 }))).toStrictEqual([
      { id: 2, perspective: "FRAGMENT" },
    ]);
  });

  it("given a whisper when a listener is at distance 2 then the fragment chance is 5000", () => {
    const drawer = aDrawer();
    perceiveAct(drawer, scene({ label: WHISPER }, { 2: 2 }));

    expect(drawer.finish().records).toMatchObject([
      { stream: "perception", purpose: "HEAR_FRAGMENT", target: 2, p: 5000 },
    ]);
  });

  it("given normal speech when a listener is beyond the range but within twice it then the fragment chance is 3000", () => {
    const drawer = aDrawer();
    perceiveAct(drawer, scene({ now: { ...DAY, vision: 0 } }, { 2: 12 }));

    expect(drawer.finish().records).toMatchObject([{ purpose: "HEAR_FRAGMENT", p: 3000 }]);
  });

  it("given a listener in range when resolving then it is DIRECT and nothing is drawn", () => {
    const drawer = aDrawer();

    expect(perceiveAct(drawer, scene({}, { 2: 8 }))).toStrictEqual([
      { id: 2, perspective: "DIRECT" },
    ]);
    expect(drawer.finish().records).toStrictEqual([]);
  });

  it("given a failed fragment for someone who sees the author when resolving then it is SEEN", () => {
    const drawer = aDrawer([forcing("HEAR_FRAGMENT", 0, 2)]);

    expect(perceiveAct(drawer, scene({}, { 2: 12 }))).toStrictEqual([
      { id: 2, perspective: "SEEN" },
    ]);
  });

  it("given a failed fragment for someone who does not see the author when resolving then it perceives nothing", () => {
    const drawer = aDrawer([forcing("HEAR_FRAGMENT", 0, 2)]);

    expect(perceiveAct(drawer, scene({ now: { ...DAY, vision: 3 } }, { 2: 12 }))).toStrictEqual([]);
  });

  it("given someone beyond twice the range who sees the author when resolving then it is SEEN without a draw", () => {
    const drawer = aDrawer();

    expect(perceiveAct(drawer, scene({}, { 2: 20 }))).toStrictEqual([
      { id: 2, perspective: "SEEN" },
    ]);
    expect(drawer.finish().records).toStrictEqual([]);
  });

  it("given listeners listed out of order when resolving then they come and draw in increasing id order", () => {
    const drawer = aDrawer();
    const result = perceiveAct(drawer, scene({}, { 5: 12, 3: 13, 4: 1 }));

    expect(drawer.finish().records.map((record) => record.target)).toStrictEqual(ids(3, 5));
    expect(result.map((seen) => seen.id)).toStrictEqual(ids(3, 4, 5));
  });

  it("given a wall between when speaking normally then the listener behind it does not hear", () => {
    const grid = gridOf(["..#.."]);
    const drawer = aDrawer();

    expect(
      perceiveAct(drawer, { ...scene({}, { 2: 4 }), grid, now: { ...DAY, vision: 20 } }),
    ).toStrictEqual([]);
  });
});

describe("perceiveAct: acts without speech (simulation-model §8.2)", () => {
  const TOUCH = aLabel({ act: "TOUCH", targets: ids(2), topic: { type: "NONE" } });

  it("given a TOUCH in the dark when resolving then the target is DIRECT and the others perceive nothing", () => {
    const drawer = aDrawer();

    expect(
      perceiveAct(
        drawer,
        scene({ label: TOUCH, speech: false, now: { ...DAY, vision: 0 } }, { 2: 1, 3: 2 }),
      ),
    ).toStrictEqual([{ id: 2, perspective: "DIRECT" }]);
  });

  it("given a TOUCH in daylight when resolving then whoever sees the author is DIRECT too", () => {
    const drawer = aDrawer();

    expect(
      perceiveAct(drawer, scene({ label: TOUCH, speech: false }, { 2: 1, 3: 15, 4: 24 })),
    ).toStrictEqual([
      { id: 2, perspective: "DIRECT" },
      { id: 3, perspective: "DIRECT" },
    ]);
    expect(drawer.finish().records).toStrictEqual([]);
  });

  it("given a LEAVE to nobody when resolving then only who sees the author perceives it", () => {
    const leave = aLabel({ act: "LEAVE", topic: { type: "NONE" } });

    expect(
      perceiveAct(aDrawer(), scene({ label: leave, speech: false }, { 2: cellAt(GRID, 0, 21) })),
    ).toStrictEqual([]);
  });
});

describe("invariant 5 (simulation-model §18)", () => {
  it("given any grid and two cells when whispering then nobody beyond 1 cell hears it as DIRECT", () => {
    fc.assert(
      fc.property(arbitraryTwoCells(8), fc.boolean(), ({ grid, from, to }, fragment) => {
        const drawer = aDrawer([forcing("HEAR_FRAGMENT", Number(fragment), 2)]);
        const direct = perceiveAct(drawer, {
          ...scene({ label: WHISPER }, {}),
          grid,
          author: { id: idOf(1), cell: from },
          others: [{ id: idOf(2), cell: to }],
        }).filter((seen) => seen.perspective === "DIRECT");

        expect(direct.length).toBeLessThanOrEqual(Number(cellDistance(grid, from, to) <= 1));
      }),
    );
  });
});
