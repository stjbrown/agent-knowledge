import { describe, expect, it } from "vitest";
import {
  CODEX_MODELS,
  NATIVE_PROVIDER_DEFINITIONS,
  availableModels,
  discoverAvailableModels,
  environmentApiKeyConfigured,
  groupModelsByProvider,
  normalizeModelSelection,
  providerAuthRoute,
  type ModelChoice,
} from "../src/onboarding/providers.js";

const codexChoices: ModelChoice[] = CODEX_MODELS.map((model) => ({
  id: `openai/${model.id}`,
  label: model.label,
  via: "OpenAI (ChatGPT/Codex)",
}));

describe("OpenAI Codex model selection", () => {
  it("matches the current Codex subscription catalog", () => {
    expect(CODEX_MODELS.map((model) => model.id)).toEqual([
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-5.6-luna",
      "gpt-5.5",
      "gpt-5.4",
      "gpt-5.4-mini",
    ]);
  });

  it("qualifies an unambiguous bare model id", () => {
    expect(normalizeModelSelection("gpt-5.6-sol", codexChoices)).toBe(
      "openai/gpt-5.6-sol",
    );
  });

  it("preserves an already qualified model id", () => {
    expect(normalizeModelSelection("openai/gpt-5.6-terra", codexChoices)).toBe(
      "openai/gpt-5.6-terra",
    );
  });

  it("migrates model ids advertised by the stale picker", () => {
    expect(normalizeModelSelection("openai/gpt-5.6-codex", codexChoices)).toBe(
      "openai/gpt-5.6-sol",
    );
    expect(normalizeModelSelection("gpt-5.5-codex", codexChoices)).toBe(
      "openai/gpt-5.5",
    );
  });

  it("does not guess when a bare id is unknown or ambiguous", () => {
    expect(normalizeModelSelection("custom-model", codexChoices)).toBe("custom-model");
    expect(
      normalizeModelSelection("shared", [
        { id: "one/shared", label: "One", via: "test" },
        { id: "two/shared", label: "Two", via: "test" },
      ]),
    ).toBe("shared");
  });
});

describe("Vertex model selection", () => {
  it("offers Claude Opus 5 when Vertex credentials are available", () => {
    const previousProject = process.env.GOOGLE_VERTEX_PROJECT;
    process.env.GOOGLE_VERTEX_PROJECT = "janet-provider-test";

    try {
      expect(availableModels()).toContainEqual({
        id: "vertex/claude-opus-5",
        label: "Claude Opus 5",
        via: "Vertex AI (ADC)",
      });
    } finally {
      if (previousProject === undefined) {
        delete process.env.GOOGLE_VERTEX_PROJECT;
      } else {
        process.env.GOOGLE_VERTEX_PROJECT = previousProject;
      }
    }
  });
});

describe("Mastra-native provider discovery", () => {
  it("advertises the initial native provider cohort and environment variables", () => {
    expect(NATIVE_PROVIDER_DEFINITIONS.map((provider) => provider.id)).toEqual([
      "openai",
      "anthropic",
      "google",
      "deepseek",
      "groq",
      "mistral",
      "xai",
      "openrouter",
      "togetherai",
      "fireworks-ai",
      "cerebras",
    ]);
    expect(
      NATIVE_PROVIDER_DEFINITIONS.find((provider) => provider.id === "google")
        ?.envVars,
    ).toEqual(["GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]);
  });

  it("gives an explicit environment key precedence over stored OAuth", () => {
    expect(providerAuthRoute("openai", true, {})).toBe("oauth");
    expect(
      providerAuthRoute("openai", true, { OPENAI_API_KEY: "configured" }),
    ).toBe("api-key");
    expect(
      providerAuthRoute("anthropic", true, {
        ANTHROPIC_API_KEY: "configured",
      }),
    ).toBe("api-key");
  });

  it("recognizes both Google API-key environment variables", () => {
    expect(
      environmentApiKeyConfigured("google", { GOOGLE_API_KEY: "configured" }),
    ).toBe(true);
    expect(
      environmentApiKeyConfigured("google", {
        GOOGLE_GENERATIVE_AI_API_KEY: "configured",
      }),
    ).toBe(true);
  });

  it("merges authenticated live catalog models and excludes unavailable providers", async () => {
    const choices = await discoverAvailableModels(async () => [
      {
        id: "groq/llama-3.3-70b-versatile",
        provider: "groq",
        modelName: "llama-3.3-70b-versatile",
        hasApiKey: true,
        apiKeyEnvVar: "GROQ_API_KEY",
      },
      {
        id: "unconfigured/test-model",
        provider: "unconfigured",
        modelName: "test-model",
        hasApiKey: false,
        apiKeyEnvVar: "UNCONFIGURED_API_KEY",
      },
    ]);

    expect(choices).toContainEqual({
      id: "groq/llama-3.3-70b-versatile",
      label: "llama-3.3-70b-versatile",
      via: "Groq (API key)",
    });
    expect(choices.some((choice) => choice.id === "unconfigured/test-model")).toBe(
      false,
    );
  });

  it("keeps local provider fallbacks when catalog discovery fails", async () => {
    const previous = process.env.CEREBRAS_API_KEY;
    process.env.CEREBRAS_API_KEY = "configured";
    try {
      const choices = await discoverAvailableModels(async () => {
        throw new Error("offline");
      });
      expect(choices).toContainEqual({
        id: "cerebras/gpt-oss-120b",
        label: "GPT OSS 120B",
        via: "Cerebras (API key)",
      });
    } finally {
      if (previous === undefined) delete process.env.CEREBRAS_API_KEY;
      else process.env.CEREBRAS_API_KEY = previous;
    }
  });

  it("bounds live catalog discovery so offline startup still completes", async () => {
    const startedAt = Date.now();
    await discoverAvailableModels(
      () => new Promise(() => {}),
      5,
    );
    expect(Date.now() - startedAt).toBeLessThan(1_000);
  });

  it("groups nested model IDs by their Mastra provider prefix", () => {
    const groups = groupModelsByProvider([
      {
        id: "openrouter/anthropic/claude-opus-5",
        label: "Claude Opus 5",
        via: "OpenRouter (API key)",
      },
      {
        id: "openrouter/google/gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
        via: "OpenRouter (API key)",
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.id).toBe("openrouter");
    expect(groups[0]?.models).toHaveLength(2);
  });
});
