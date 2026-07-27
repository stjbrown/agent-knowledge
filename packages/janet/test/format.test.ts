import { describe, expect, it } from "vitest";
import { messageText, messageToolNames } from "../src/headless/format.js";

describe("controller message formatting", () => {
  it("reads Mastra 1.51 array content", () => {
    const message = {
      role: "assistant",
      content: [
        { type: "thinking", thinking: "hmm" },
        { type: "text", text: "Hello" },
        { type: "text", text: " there" },
        { type: "tool_call", name: "kb_query" },
      ],
    };

    expect(messageText(message)).toBe("Hello there");
    expect(messageToolNames(message)).toEqual(["kb_query"]);
  });

  it("reads Mastra 1.52 DB-native content", () => {
    const message = {
      role: "assistant",
      content: {
        format: 2,
        parts: [
          { type: "reasoning", reasoning: "hmm" },
          { type: "text", text: "Hello from v2" },
          {
            type: "tool-invocation",
            toolInvocation: { toolName: "kb_ingest" },
          },
        ],
      },
    };

    expect(messageText(message)).toBe("Hello from v2");
    expect(messageToolNames(message)).toEqual(["kb_ingest"]);
  });

  it("handles legacy strings and malformed content without throwing", () => {
    expect(messageText({ role: "assistant", content: "Legacy text" })).toBe("Legacy text");
    expect(messageText({ role: "assistant", content: null })).toBe("");
    expect(messageText({ role: "user", content: [{ type: "text", text: "No echo" }] })).toBe("");
    expect(messageToolNames({ role: "assistant", content: { unexpected: true } })).toEqual([]);
  });
});
