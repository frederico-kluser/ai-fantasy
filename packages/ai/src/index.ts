/**
 * Public API of the pure part of `@ai-fantasy/ai`: ports, prompts, validation and
 * canned lines, with no network (overview §4). The OpenRouter adapters live in
 * `@ai-fantasy/ai/openrouter` and only the server may import them.
 *
 * This file only re-exports; code lives in the modules next to it.
 */
export { AI_ROLES, type AiRole } from "./roles.ts";
