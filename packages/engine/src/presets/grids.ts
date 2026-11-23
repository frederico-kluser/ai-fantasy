/**
 * The default grid template of each place (presets §2 and §2.1). Legend: `.`
 * floor, `,` rough, `d` open door, `D` closed door, `=` window, `o` low
 * obstacle, `#` wall; masks mark roofed cells with `r`. Every start is floor
 * and reaches an exit walking in the four directions (tested apart).
 */
import type { GridTemplateInput } from "./grid.ts";

/** Writes positions compactly: `cells([1, 2], [3, 4])` is `[{ x: 1, y: 2 }, { x: 3, y: 4 }]`. */
function cells(...pairs: readonly (readonly [number, number])[]): { x: number; y: number }[] {
  return pairs.map(([x, y]) => ({ x, y }));
}

/** `home`, 12 × 10: one closed door, windows, a bed, a cupboard and a table. */
export const HOME_GRID: GridTemplateInput = {
  rows: [
    "#####==#####",
    "#..........#",
    "#.oo....o..#",
    "#.oo....o..#",
    "=..........=",
    "#..........#",
    "#....oo....#",
    "#....oo....#",
    "#..........#",
    "#####D######",
  ],
  exits: cells([5, 9]),
  roofed: "ALL",
  starts: cells([1, 1], [4, 1], [7, 1], [10, 1], [1, 5], [10, 5], [2, 8], [9, 8]),
};

/** `social_interior`, 16 × 12: a counter, four tables and an open double door. */
export const SOCIAL_INTERIOR_GRID: GridTemplateInput = {
  rows: [
    "################",
    "#..............#",
    "#.oooooo.......#",
    "#..............#",
    "#..............=",
    "#...oo....oo...#",
    "#...oo....oo...#",
    "=..............#",
    "#...oo....oo...#",
    "#...oo....oo...#",
    "#..............#",
    "#######dd#######",
  ],
  exits: cells([7, 11], [8, 11]),
  roofed: "ALL",
  starts: cells([3, 1], [10, 1], [2, 5], [7, 5], [13, 5], [2, 8], [7, 8], [13, 8]),
};

/** `workplace`, 14 × 10: four workbenches and a closed door. */
export const WORKPLACE_GRID: GridTemplateInput = {
  rows: [
    "##############",
    "#............#",
    "#.oooo..oooo.#",
    "#............#",
    "=............=",
    "#............#",
    "#.oooo..oooo.#",
    "#............#",
    "#............#",
    "######D#######",
  ],
  exits: cells([6, 9]),
  roofed: "ALL",
  starts: cells([1, 1], [6, 1], [12, 1], [1, 3], [12, 3], [3, 5], [10, 5], [6, 8]),
};

/** `market`, 20 × 14: rows of stalls under awnings, streets on the four sides. */
export const MARKET_GRID: GridTemplateInput = {
  rows: [
    "#########..#########",
    "#..................#",
    "#..ooo..ooo..ooo...#",
    "#..................#",
    "#..................#",
    "#..ooo..ooo..ooo...#",
    "....................",
    "....................",
    "#..ooo..ooo..ooo...#",
    "#..................#",
    "#..................#",
    "#..ooo..ooo..ooo...#",
    "#..................#",
    "#########..#########",
  ],
  exits: cells([9, 0], [10, 0], [0, 6], [0, 7], [19, 6], [19, 7], [9, 13], [10, 13]),
  roofed: [
    "....................",
    "....................",
    "...rrr..rrr..rrr....",
    "...rrr..rrr..rrr....",
    "....................",
    "...rrr..rrr..rrr....",
    "...rrr..rrr..rrr....",
    "....................",
    "...rrr..rrr..rrr....",
    "...rrr..rrr..rrr....",
    "....................",
    "...rrr..rrr..rrr....",
    "...rrr..rrr..rrr....",
    "....................",
  ],
  starts: cells([4, 3], [9, 3], [14, 3], [4, 6], [14, 6], [4, 9], [9, 9], [14, 9]),
};

/** `public_square`, 24 × 18: open, with a fountain, benches and four streets. */
export const PUBLIC_SQUARE_GRID: GridTemplateInput = {
  rows: [
    "###########..###########",
    "#......................#",
    "#......................#",
    "#...oo............oo...#",
    "#......................#",
    "#......................#",
    "#......................#",
    "#.........oooo.........#",
    "..........oooo..........",
    "..........oooo..........",
    "#.........oooo.........#",
    "#......................#",
    "#......................#",
    "#......................#",
    "#...oo............oo...#",
    "#......................#",
    "#......................#",
    "###########..###########",
  ],
  exits: cells([11, 0], [12, 0], [0, 8], [0, 9], [23, 8], [23, 9], [11, 17], [12, 17]),
  roofed: "NONE",
  starts: cells([5, 5], [11, 5], [18, 5], [8, 8], [15, 8], [6, 11], [17, 11], [11, 12]),
};

/** `wilderness`, 24 × 24: trees (`#`), rocks and undergrowth around a clearing and two trails. */
export const WILDERNESS_GRID: GridTemplateInput = {
  rows: [
    "#,,,,,,,,,,..#,,,#,,,,,,",
    ",,,,##,,,,,..,,,,,#,,#,,",
    ",,,,,,,,#,#..,,,,,,,,,,#",
    ",,#,,,,,,,,..,,#,,,,,,,,",
    ",,,,,,,#,,,..,,,#,o,#,,,",
    ",,,#,,,,,,,..,,,,,,,#,,,",
    ",,,,o,,#,,,..,,,,#,,,,,,",
    ",,,,,,,,,#,..,,,,,,,,,#,",
    ",#,,,,,,........,,,,,,,,",
    ",,#,,,#,......o.,,,#,,,,",
    ",,,,,,#,.o......,,,,,,,#",
    "........................",
    "........................",
    "##,,,,,,........,,#,,,,,",
    ",,,,,#,,..o.....,,#,,,#,",
    ",,,,,,,,........,,,,,,,#",
    ",,#,,,,,,,,..#,#,,,,,,,,",
    "#,,,,,,#,,,..,,,,#,o#,,,",
    ",,,,#,,,,,,..,,,,,,,,#,,",
    ",,,,#,o,#,,..,,,,#,,,,,,",
    ",,,,,,,,,#,..,,,,,,,,,#,",
    ",#,,,,,,,,,..,#,#,,,,,,,",
    ",,,#,,#,,,,..,,,,,,##,,,",
    ",,,,,,,#,,,..,,,,,,,,,,,",
  ],
  exits: cells([11, 0], [12, 0], [0, 11], [0, 12], [23, 11], [23, 12], [11, 23], [12, 23]),
  roofed: "NONE",
  starts: cells([8, 9], [10, 8], [13, 8], [15, 10], [8, 14], [10, 15], [13, 15], [15, 13]),
};

/** `dangerous_place`, 16 × 16: a ruin with rubble, broken walls and two roofed corners. */
export const DANGEROUS_PLACE_GRID: GridTemplateInput = {
  rows: [
    "######..########",
    "#,,....,,.#....#",
    "#.o....,,.#....#",
    "#...##.....,o..#",
    "#...#....o.....#",
    "##.....,,......#",
    ",.....o.....##.#",
    ",..,,.......#..#",
    "#..,,..o....#..#",
    "#......,,......#",
    "#.o.....,,..o..,",
    "##..##.........,",
    "#....#..o.,,...#",
    "#.,,.#.........#",
    "#.,,....,,..o..#",
    "######..########",
  ],
  exits: cells([6, 0], [7, 0], [0, 6], [0, 7], [15, 10], [15, 11], [6, 15], [7, 15]),
  roofed: [
    "..........rrrrrr",
    "..........rrrrrr",
    "..........rrrrrr",
    "..........rrrrrr",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "rrrrrr..........",
    "rrrrrr..........",
    "rrrrrr..........",
    "rrrrrr..........",
    "rrrrrr..........",
  ],
  starts: cells([4, 1], [12, 2], [6, 4], [2, 7], [10, 7], [14, 8], [3, 12], [10, 13]),
};

/** `solemn_place`, 18 × 14: an altar, rows of benches and an open double door. */
export const SOLEMN_PLACE_GRID: GridTemplateInput = {
  rows: [
    "##################",
    "#......oooo......#",
    "#................#",
    "=................=",
    "#..oooo....oooo..#",
    "#................#",
    "#..oooo....oooo..#",
    "=................=",
    "#..oooo....oooo..#",
    "#................#",
    "#..oooo....oooo..#",
    "#................#",
    "#................#",
    "########dd########",
  ],
  exits: cells([8, 13], [9, 13]),
  roofed: "ALL",
  starts: cells([8, 2], [2, 5], [8, 5], [15, 5], [2, 9], [8, 9], [15, 9], [8, 12]),
};

/** `vehicle`, 10 × 4: a covered cabin with windows, an open platform and a door at each end. */
export const VEHICLE_GRID: GridTemplateInput = {
  rows: ["#==####==#", "d........#", "#........d", "#==####==#"],
  exits: cells([0, 1], [9, 2]),
  roofed: ["rrrrrrr...", "rrrrrrr...", "rrrrrrr...", "rrrrrrr..."],
  starts: cells([2, 1], [4, 1], [6, 1], [8, 1], [1, 2], [3, 2], [5, 2], [7, 2]),
};

/** `makeshift_shelter`, 12 × 12: an open camp with a fire pit, crates and four paths. */
export const MAKESHIFT_SHELTER_GRID: GridTemplateInput = {
  rows: [
    ",,,,,..,,,,,",
    ",o,,,..,,,o,",
    ",,........,,",
    ",..........,",
    ",..o....o..,",
    "......oo....",
    "......oo....",
    ",..o....o..,",
    ",..........,",
    ",,........,,",
    ",o,,,..,,,o,",
    ",,,,,..,,,,,",
  ],
  exits: cells([5, 0], [6, 0], [0, 5], [0, 6], [11, 5], [11, 6], [5, 11], [6, 11]),
  roofed: "NONE",
  starts: cells([4, 3], [7, 3], [2, 4], [9, 4], [2, 7], [9, 7], [4, 8], [7, 8]),
};
