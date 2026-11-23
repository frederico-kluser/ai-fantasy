/**
 * Version of the preset catalogs (presets §1 and §11). It goes into the header
 * of every recorded session (SOC-05), since a replay needs the same presets.
 * Every change in the data changes it: the MINOR part when the simulation
 * changes (numbers, lists, grids, new presets), the PATCH part when only display
 * texts do. `version.test.ts` keeps the hash of the catalogs of each version.
 */
export const PRESETS_VERSION = "0.1.0";
