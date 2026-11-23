/**
 * The catalog data the signal rules read (simulation-model §7): the signal
 * presets, taken from the loaded presets by the caller. Tables stay data: no
 * rule branches on a signal id.
 */
import type { Presets } from "../presets/catalogs.ts";

/** The signals the rules read: pass `presets.signals` of the loaded presets. */
export type SignalRules = Presets["signals"];

/** A signal preset as loaded. */
export type SignalRule = SignalRules[number];

/** The channel of a signal: seen (`VISUAL`) or heard (`VOCAL`). */
export type SignalChannel = SignalRule["channel"];
