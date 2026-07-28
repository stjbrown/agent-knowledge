import { afterEach, describe, expect, it, vi } from "vitest";
import {
  JANET_OBSERVATION_THRESHOLD,
  JANET_REFLECTION_THRESHOLD,
  defaultMemoryModelFor,
  getJanetMemoryModel,
  janetObservationalMemoryOptions,
} from "../src/memory/index.js";

function requestContextFor(modelId?: string) {
  return {
    get: vi.fn((key: string) =>
      key === "controller" ? { session: { modelId } } : undefined,
    ),
  };
}

describe("Janet observational memory", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses Mastra Code's proven thread-scoped buffering defaults", () => {
    const options = janetObservationalMemoryOptions();

    expect(options).toMatchObject({
      enabled: true,
      temporalMarkers: true,
      retrieval: true,
      scope: "thread",
      activateAfterIdle: "auto",
      activateOnProviderChange: true,
      observation: {
        messageTokens: JANET_OBSERVATION_THRESHOLD,
        bufferTokens: 1 / 5,
        bufferActivation: 2_000,
        blockAfter: 2,
        previousObserverTokens: 1_000,
        threadTitle: true,
      },
      reflection: {
        observationTokens: JANET_REFLECTION_THRESHOLD,
        bufferActivation: 1 / 2,
        blockAfter: 1.1,
      },
    });
  });

  it("chooses a fast memory model within the selected provider", () => {
    expect(defaultMemoryModelFor("vertex/claude-opus-5")).toBe(
      "vertex/gemini-2.5-flash",
    );
    expect(defaultMemoryModelFor("anthropic/claude-opus-5")).toBe(
      "anthropic/claude-haiku-4-5",
    );
    expect(defaultMemoryModelFor("openai/gpt-5.6-sol")).toBe(
      "openai/gpt-5.4-mini",
    );
    expect(
      defaultMemoryModelFor(
        "amazon-bedrock/anthropic.claude-opus-4-1-20250805-v1:0",
      ),
    ).toBe(
      "amazon-bedrock/anthropic.claude-haiku-4-5-20251001-v1:0",
    );
  });

  it("falls back to the exact model for providers without a safe default", () => {
    expect(defaultMemoryModelFor("groq/llama-3.3-70b-versatile")).toBe(
      "groq/llama-3.3-70b-versatile",
    );
    expect(defaultMemoryModelFor("openrouter/~openai/gpt-latest")).toBe(
      "openrouter/~openai/gpt-latest",
    );
  });

  it("resolves the provider-aware default through Janet's auth path", () => {
    const requestContext = requestContextFor("openai/gpt-5.6-sol");
    expect(
      getJanetMemoryModel("observer", {
        requestContext: requestContext as never,
      }),
    ).toBe("openai/gpt-5.4-mini");
  });

  it("allows shared and role-specific memory model overrides", () => {
    vi.stubEnv("JANET_MEMORY_MODEL", "deepseek/deepseek-reasoner");
    vi.stubEnv("JANET_REFLECTOR_MODEL", "xai/grok-4-1-fast");
    const requestContext = requestContextFor("openai/gpt-5-mini");

    expect(
      getJanetMemoryModel("observer", {
        requestContext: requestContext as never,
      }),
    ).toBe("deepseek/deepseek-reasoner");
    expect(
      getJanetMemoryModel("reflector", {
        requestContext: requestContext as never,
      }),
    ).toBe("xai/grok-4-1-fast");
  });

  it("requires either a selected model or an explicit memory model", () => {
    const requestContext = requestContextFor();
    expect(() =>
      getJanetMemoryModel("observer", {
        requestContext: requestContext as never,
      }),
    ).toThrow("No observer model is available");
  });
});
