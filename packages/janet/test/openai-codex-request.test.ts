import { describe, expect, it } from "vitest";
import {
  DEFAULT_CODEX_THINKING_LEVEL,
  summarizeCodexRequest,
} from "../src/gateways/oauth/openai-codex.js";

describe("Codex request diagnostics", () => {
  it("uses the latency-oriented reasoning default", () => {
    expect(DEFAULT_CODEX_THINKING_LEVEL).toBe("low");
  });

  it("shows continuation structure without exposing content", () => {
    expect(
      summarizeCodexRequest({
        model: "gpt-5.6-sol",
        store: false,
        include: ["reasoning.encrypted_content"],
        input: [
          { role: "user", content: [{ type: "input_text", text: "secret prompt" }] },
          {
            type: "reasoning",
            encrypted_content: "secret encrypted reasoning",
            summary: [],
          },
          {
            type: "function_call",
            name: "skill",
            call_id: "call_1",
            arguments: '{"name":"kb-init"}',
          },
          {
            type: "function_call_output",
            call_id: "call_1",
            output: "secret skill body",
          },
        ],
      }),
    ).toEqual({
      model: "gpt-5.6-sol",
      store: false,
      include: ["reasoning.encrypted_content"],
      input: [
        { role: "user", contentTypes: ["input_text"] },
        { type: "reasoning", hasEncryptedContent: true },
        { type: "function_call", name: "skill", callId: "call_1" },
        { type: "function_call_output", callId: "call_1" },
      ],
    });
  });
});
