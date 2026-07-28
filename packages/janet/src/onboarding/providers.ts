import { hasGoogleCredentials } from "../gateways/vertex.js";
import { hasAwsCredentials } from "../gateways/bedrock.js";
import { getAuthStorage } from "../gateways/oauth/claude-max.js";
import { loadSettings } from "./settings.js";

export type ProviderAuthRoute = "api-key" | "oauth";

export interface ModelChoice {
  /** Full model id, e.g. "vertex/claude-opus-5". */
  id: string;
  /** Short human label, e.g. "Claude Opus 5". */
  label: string;
  /** How this provider is reached, e.g. "Vertex AI (ADC)". */
  via: string;
}

export interface ProviderModelGroup {
  /** Mastra model-router provider prefix. */
  id: string;
  /** Human-readable provider name. */
  label: string;
  /** Authentication routes represented by the group's models. */
  via: string;
  models: ModelChoice[];
}

export interface NativeCatalogModel {
  id: string;
  provider: string;
  modelName: string;
  hasApiKey: boolean;
  apiKeyEnvVar?: string;
}

interface NativeProviderDefinition {
  id: string;
  label: string;
  envVars: readonly string[];
  /** Small offline fallback; the live catalog supplies the complete model list. */
  fallbackModels: ReadonlyArray<{ id: string; label: string }>;
}

/**
 * The first provider cohort Janet advertises explicitly. These all resolve
 * through Mastra's native models.dev gateway; no Janet gateway or provider
 * package is required. The live catalog can still expose any other configured
 * Mastra-native provider automatically.
 */
export const NATIVE_PROVIDER_DEFINITIONS: readonly NativeProviderDefinition[] = [
  {
    id: "openai",
    label: "OpenAI",
    envVars: ["OPENAI_API_KEY"],
    fallbackModels: [
      { id: "gpt-5.5", label: "GPT-5.5" },
      { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    envVars: ["ANTHROPIC_API_KEY"],
    fallbackModels: [
      { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    ],
  },
  {
    id: "google",
    label: "Google AI Studio",
    envVars: ["GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
    fallbackModels: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    ],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    envVars: ["DEEPSEEK_API_KEY"],
    fallbackModels: [{ id: "deepseek-chat", label: "DeepSeek Chat" }],
  },
  {
    id: "groq",
    label: "Groq",
    envVars: ["GROQ_API_KEY"],
    fallbackModels: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
    ],
  },
  {
    id: "mistral",
    label: "Mistral",
    envVars: ["MISTRAL_API_KEY"],
    fallbackModels: [{ id: "mistral-large-latest", label: "Mistral Large" }],
  },
  {
    id: "xai",
    label: "xAI",
    envVars: ["XAI_API_KEY"],
    fallbackModels: [{ id: "grok-4.3", label: "Grok 4.3" }],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    envVars: ["OPENROUTER_API_KEY"],
    fallbackModels: [{ id: "~openai/gpt-latest", label: "OpenAI GPT Latest" }],
  },
  {
    id: "togetherai",
    label: "Together AI",
    envVars: ["TOGETHER_API_KEY"],
    fallbackModels: [
      {
        id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        label: "Llama 3.3 70B Instruct Turbo",
      },
    ],
  },
  {
    id: "fireworks-ai",
    label: "Fireworks AI",
    envVars: ["FIREWORKS_API_KEY"],
    fallbackModels: [
      {
        id: "accounts/fireworks/models/deepseek-v4-flash",
        label: "DeepSeek V4 Flash",
      },
    ],
  },
  {
    id: "cerebras",
    label: "Cerebras",
    envVars: ["CEREBRAS_API_KEY"],
    fallbackModels: [{ id: "gpt-oss-120b", label: "GPT OSS 120B" }],
  },
] as const;

const NATIVE_PROVIDERS_BY_ID = new Map(
  NATIVE_PROVIDER_DEFINITIONS.map((provider) => [provider.id, provider]),
);

/**
 * Models offered when signed in to a ChatGPT/Codex subscription (OAuth). The
 * Codex `responses` backend accepts the model id verbatim, so this is a
 * convenience lineup — ANY id also works via `/model openai/<id>`. Edit here as
 * OpenAI's Codex catalog changes.
 */
export const CODEX_MODELS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
  { id: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
  { id: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
  { id: "gpt-5.5", label: "GPT-5.5" },
  { id: "gpt-5.4", label: "GPT-5.4" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
];

const LEGACY_CODEX_MODEL_IDS: Readonly<Record<string, string>> = {
  "gpt-5.6-codex": "openai/gpt-5.6-sol",
  "openai/gpt-5.6-codex": "openai/gpt-5.6-sol",
  "gpt-5.5-codex": "openai/gpt-5.5",
  "openai/gpt-5.5-codex": "openai/gpt-5.5",
};

/**
 * Resolve a hand-typed or previously persisted model name to Mastra's required
 * `provider/model` form when the active provider catalog makes it unambiguous.
 * Also migrates the invalid Codex aliases Janet advertised before v0.1.0.
 */
export function normalizeModelSelection(
  modelId: string,
  choices: ReadonlyArray<ModelChoice>,
): string {
  const id = modelId.trim();
  const legacy = LEGACY_CODEX_MODEL_IDS[id];
  if (legacy) return legacy;
  if (!id || id.includes("/")) return id;

  const matches = choices.filter((choice) => choice.id.endsWith(`/${id}`));
  return matches.length === 1 ? matches[0]!.id : id;
}

function hasOAuth(provider: string): boolean {
  try {
    const s = getAuthStorage();
    s.reload();
    return s.get(provider)?.type === "oauth";
  } catch {
    return false;
  }
}

export function environmentApiKeyConfigured(
  providerId: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return NATIVE_PROVIDERS_BY_ID.get(providerId)?.envVars.some((name) => !!env[name]) ?? false;
}

/**
 * Environment variables are an explicit per-process choice, so they win over a
 * stored subscription credential. Unset the key to return to OAuth.
 */
export function providerAuthRoute(
  providerId: string,
  oauthConfigured: boolean,
  env: NodeJS.ProcessEnv = process.env,
): ProviderAuthRoute | undefined {
  if (environmentApiKeyConfigured(providerId, env)) return "api-key";
  return oauthConfigured ? "oauth" : undefined;
}

export function providerDisplayName(providerId: string): string {
  if (providerId === "vertex") return "Google Vertex AI";
  if (providerId === "amazon-bedrock") return "Amazon Bedrock";
  const known = NATIVE_PROVIDERS_BY_ID.get(providerId);
  if (known) return known.label;
  return providerId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function catalogModelVia(model: NativeCatalogModel): string {
  if (model.provider === "vertex") return "Vertex AI (ADC)";
  if (model.provider === "amazon-bedrock") return "Amazon Bedrock (AWS)";
  return `${providerDisplayName(model.provider)} (API key)`;
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
      { id: "vertex/claude-opus-5", label: "Claude Opus 5", via },
      { id: "vertex/claude-opus-4-8", label: "Claude Opus 4.8", via },
      { id: "vertex/claude-sonnet-4-5", label: "Claude Sonnet 4.5", via },
      { id: "vertex/gemini-2.5-pro", label: "Gemini 2.5 Pro", via },
    );
  }

  const anthropicOAuth = hasOAuth("anthropic");
  const openaiOAuth = hasOAuth("openai-codex");
  for (const provider of NATIVE_PROVIDER_DEFINITIONS) {
    if (environmentApiKeyConfigured(provider.id)) {
      const via = `${provider.label} (API key)`;
      for (const model of provider.fallbackModels) {
        out.push({
          id: `${provider.id}/${model.id}`,
          label: model.label,
          via,
        });
      }
      continue;
    }
    if (provider.id === "anthropic" && anthropicOAuth) {
      const via = "Anthropic (Claude Max)";
      out.push(
        { id: "anthropic/claude-opus-4-6", label: "Claude Opus 4.6", via },
        { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5", via },
      );
    }
  }

  if (providerAuthRoute("openai", openaiOAuth) === "oauth") {
    // Signed in to a ChatGPT/Codex subscription — offer the full Codex lineup.
    const via = "OpenAI (ChatGPT/Codex)";
    for (const m of CODEX_MODELS) out.push({ id: `openai/${m.id}`, label: m.label, via });
  }

  if (hasAwsCredentials()) {
    const via = "Amazon Bedrock (AWS)";
    out.push(
      {
        id: "amazon-bedrock/anthropic.claude-haiku-4-5-20251001-v1:0",
        label: "Claude Haiku 4.5",
        via,
      },
      { id: "amazon-bedrock/anthropic.claude-opus-4-1-20250805-v1:0", label: "Claude Opus 4.1", via },
      { id: "amazon-bedrock/anthropic.claude-sonnet-4-20250514-v1:0", label: "Claude Sonnet 4", via },
    );
  }

  // Models the user has used directly (via /model or --model) that aren't
  // already listed — keeps the picker current as providers ship new models.
  const known = new Set(out.map((m) => m.id));
  for (const savedId of loadSettings().customModels ?? []) {
    const id = normalizeModelSelection(savedId, out);
    if (!known.has(id)) {
      out.push({ id, label: id.split("/").pop() ?? id, via: "saved" });
      known.add(id);
    }
  }

  return out;
}

/**
 * Merge Janet's credential-aware local fallback with Mastra's live model
 * catalog. Only authenticated catalog providers are shown. If models.dev is
 * unavailable, the local choices and saved model IDs remain usable.
 */
export async function discoverAvailableModels(
  loadCatalog: () => Promise<ReadonlyArray<NativeCatalogModel>>,
  timeoutMs = 5_000,
): Promise<ModelChoice[]> {
  const choices = new Map(availableModels().map((choice) => [choice.id, choice]));
  try {
    const catalog = await new Promise<ReadonlyArray<NativeCatalogModel>>(
      (resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Provider catalog timed out")),
          timeoutMs,
        );
        void Promise.resolve()
          .then(loadCatalog)
          .then(
            (models) => {
              clearTimeout(timer);
              resolve(models);
            },
            (error: unknown) => {
              clearTimeout(timer);
              reject(error);
            },
          );
      },
    );
    for (const model of catalog) {
      if (!model.hasApiKey) continue;
      const choice: ModelChoice = {
        id: model.id,
        label: model.modelName,
        via: catalogModelVia(model),
      };
      const existing = choices.get(model.id);
      if (!existing || existing.via === "saved") choices.set(model.id, choice);
    }
  } catch {
    // Catalog discovery is a convenience. Model resolution and saved/manual
    // selections must continue to work while offline.
  }
  return [...choices.values()];
}

export function groupModelsByProvider(
  choices: ReadonlyArray<ModelChoice>,
): ProviderModelGroup[] {
  const groups = new Map<string, ProviderModelGroup>();
  for (const choice of choices) {
    const slash = choice.id.indexOf("/");
    if (slash <= 0) continue;
    const providerId = choice.id.slice(0, slash);
    let group = groups.get(providerId);
    if (!group) {
      group = {
        id: providerId,
        label: providerDisplayName(providerId),
        via: choice.via,
        models: [],
      };
      groups.set(providerId, group);
    } else if (!group.via.split(" / ").includes(choice.via)) {
      group.via += ` / ${choice.via}`;
    }
    group.models.push(choice);
  }
  return [...groups.values()];
}
