/**
 * OAuth + API-key credential management for AI providers.
 *
 * Lifted from mastracode (Apache-2.0; see NOTICE). Only the Anthropic (Claude
 * Max) and OpenAI Codex providers are wired up; the storage layer, PKCE,
 * device-code (RFC-8628), and paste-code login flows are taken verbatim.
 */
export * from "./types.js";
export * from "./storage.js";
export { anthropicOAuthProvider } from "./providers/anthropic.js";
export { openaiCodexOAuthProvider } from "./providers/openai-codex.js";
