/**
 * The version of the prompts and question sets (ai-integration §7). Change it
 * whenever an instruction, a rubric, a ruler or a fallback line changes: it
 * goes in the text cache key and in the record of every call, and a change
 * means running the golden scenes again (evaluation).
 */
export const PROMPT_VERSION = "2026-11-23.2";
