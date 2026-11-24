/**
 * The engine presets as the site uses them: the default catalogs, loaded and
 * validated once (presets §1). The worker and the forms read the same data.
 */
import { loadPresets, type PresetError, type Presets, type Result } from "@ai-fantasy/engine";

/**
 * The presets of a load, or an error that says what to do: the default
 * catalogs always load, so a failure is a broken build, not a user mistake.
 *
 * @throws Error when the catalogs do not load.
 */
export function presetsOrThrow(loaded: Result<Presets, readonly PresetError[]>): Presets {
  if (!loaded.ok) {
    const first = loaded.error[0]?.message ?? "";
    throw new Error(
      `Erro: os catálogos de presets não carregam (${first}) — Solução: rode npm run test -w @ai-fantasy/engine e corrija o catálogo.`,
    );
  }
  return loaded.value;
}

/** The default presets of the engine (version `PRESETS_VERSION`). */
export const PRESETS: Presets = presetsOrThrow(loadPresets());
