import { getModelCapabilities } from "@ai-sdk/anthropic/internal";
import { createVertexAnthropic } from "@ai-sdk/google-vertex/anthropic";
import { describe, expect, it } from "vitest";

describe("Anthropic provider compatibility", () => {
  it("recognizes Claude Opus 5 instead of applying the unknown-model fallback", () => {
    expect(getModelCapabilities("claude-opus-5")).toMatchObject({
      isKnownModel: true,
      maxOutputTokens: 128_000,
      supportsStructuredOutput: true,
    });
  });

  it("sends Vertex Claude Opus 5 its native output ceiling", async () => {
    let requestBody: { max_tokens?: number } | undefined;
    const provider = createVertexAnthropic({
      project: "janet-provider-test",
      location: "global",
      generateAuthToken: async () => "test-token",
      fetch: async (_url, init) => {
        requestBody = JSON.parse(String(init?.body)) as { max_tokens?: number };
        return new Response(
          JSON.stringify({
            id: "msg_test",
            type: "message",
            role: "assistant",
            model: "claude-opus-5",
            content: [{ type: "text", text: "ok" }],
            stop_reason: "end_turn",
            stop_sequence: null,
            usage: { input_tokens: 1, output_tokens: 1 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });
    const model = provider("claude-opus-5");

    await model.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
    });

    expect(model.specificationVersion).toBe("v3");
    expect(requestBody?.max_tokens).toBe(128_000);
  });
});
