import { hasGoogleCredentials } from "../gateways/vertex.js";
import { hasAwsCredentials } from "../gateways/bedrock.js";
import { getAuthStorage } from "../gateways/oauth/claude-max.js";

export interface ModelChoice {
  /** Full model id, e.g. "vertex/claude-opus-4-8". */
  id: string;
  /** Short human label, e.g. "Claude Opus 4.8". */
  label: string;
  /** How this provider is reached, e.g. "Vertex AI (ADC)". */
  via: string;
}

/**
 * Models offered when signed in to a ChatGPT/Codex subscription (OAuth). The
 * Codex `responses` backend accepts the model id verbatim, so this is a
 * convenience lineup — ANY id also works via `/model openai/<id>`. Edit here as
 * OpenAI's Codex catalog changes.
 */
const CODEX_MODELS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "gpt-5.5-codex", label: "GPT-5.5 Codex" },
  { id: "gpt-5.5", label: "GPT-5.5" },
  { id: "gpt-5.1-codex", label: "GPT-5.1 Codex" },
  { id: "gpt-5.1", label: "GPT-5.1" },
  { id: "gpt-5-codex", label: "GPT-5 Codex" },
  { id: "gpt-5", label: "GPT-5" },
  { id: "codex-mini-latest", label: "Codex Mini" },
];

function hasOAuth(provider: string): boolean {
  try {
    const s = getAuthStorage();
    s.reload();
    return s.get(provider)?.type === "oauth";
  } catch {
    return false;
  }
}

function hasEnv(...vars: string[]): boolean {
  return vars.some((v) => !!process.env[v]);
}

/**
 * Enumerate concrete model choices from the providers that are actually
 * reachable on this machine right now (env keys, ADC, AWS chain, stored OAuth).
 * Ordered best-first. Empty when nothing is configured.
 */
export function availableModels(): ModelChoice[] {
  const out: ModelChoice[] = [];

  if (hasGoogleCredentials()) {
    const via = "Vertex AI (ADC)";
    out.push(
      { id: "vertex/claude-opus-4-8", label: "Claude Opus 4.8", via },
      { id: "vertex/claude-sonnet-4-5", label: "Claude Sonnet 4.5", via },
      { id: "vertex/gemini-2.5-pro", label: "Gemini 2.5 Pro", via },
    );
  }
  if (hasEnv("ANTHROPIC_API_KEY") || hasOAuth("anthropic")) {
    const via = hasOAuth("anthropic") ? "Anthropic (Claude Max)" : "Anthropic (API key)";
    out.push(
      { id: "anthropic/claude-opus-4-6", label: "Claude Opus 4.6", via },
      { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5", via },
    );
  }
  if (hasOAuth("openai-codex")) {
    // Signed in to a ChatGPT/Codex subscription — offer the full Codex lineup.
    const via = "OpenAI (ChatGPT/Codex)";
    for (const m of CODEX_MODELS) out.push({ id: `openai/${m.id}`, label: m.label, via });
  } else if (hasEnv("OPENAI_API_KEY")) {
    out.push({ id: "openai/gpt-5.5", label: "GPT-5.5", via: "OpenAI (API key)" });
  }
  if (hasAwsCredentials()) {
    const via = "Amazon Bedrock (AWS)";
    out.push(
      { id: "amazon-bedrock/anthropic.claude-opus-4-1-20250805-v1:0", label: "Claude Opus 4.1", via },
      { id: "amazon-bedrock/anthropic.claude-sonnet-4-20250514-v1:0", label: "Claude Sonnet 4", via },
    );
  }
  if (hasEnv("GOOGLE_GENERATIVE_AI_API_KEY")) {
    out.push({ id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", via: "Google (API key)" });
  }

  return out;
}
