import { describe, expect, it } from "vitest";
import { formatTraceTree, traceStatus } from "../src/tui/traces.js";

const startedAt = new Date("2026-07-27T20:00:00.000Z");

describe("local trace formatting", () => {
  it("renders a flat trace as an ordered tree without content payloads", () => {
    const lines = formatTraceTree([
      {
        spanId: "tool",
        parentSpanId: "model",
        name: "web_fetch",
        spanType: "tool_call",
        startedAt: new Date(startedAt.getTime() + 20),
        endedAt: new Date(startedAt.getTime() + 50),
      },
      {
        spanId: "root",
        name: "Janet turn",
        spanType: "agent_run",
        startedAt,
        endedAt: new Date(startedAt.getTime() + 100),
      },
      {
        spanId: "model",
        parentSpanId: "root",
        name: "Claude",
        spanType: "model_generation",
        startedAt: new Date(startedAt.getTime() + 10),
        endedAt: new Date(startedAt.getTime() + 90),
      },
    ]);

    expect(lines).toEqual([
      "✓ Janet turn · agent_run · 100ms",
      "  ✓ Claude · model_generation · 80ms",
      "    ✓ web_fetch · tool_call · 30ms",
    ]);
  });

  it("distinguishes failed and active spans", () => {
    expect(
      traceStatus({
        spanId: "failed",
        name: "fetch",
        spanType: "tool_call",
        startedAt,
        endedAt: new Date(),
        error: { message: "blocked" },
      }),
    ).toBe("error");
    expect(
      traceStatus({
        spanId: "active",
        name: "fetch",
        spanType: "tool_call",
        startedAt,
      }),
    ).toBe("running");
  });
});
