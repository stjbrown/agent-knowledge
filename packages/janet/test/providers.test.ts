import { describe, expect, it } from "vitest";
import {
  CODEX_MODELS,
  availableModels,
  normalizeModelSelection,
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
