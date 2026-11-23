/**
 * The two AI roles, named by what they do and never by vendor (ai-integration §9):
 * `systemOne` turns free text into labels; `textModel` voices a resolved act.
 */
export const AI_ROLES = ["systemOne", "textModel"] as const;

/** One of the AI roles. */
export type AiRole = (typeof AI_ROLES)[number];
