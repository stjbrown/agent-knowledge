import { describe, expect, it, vi } from "vitest";
import { compactConversation } from "../src/memory/compact.js";

function status(pendingTokens: number, shouldReflect = false) {
  return {
    pendingTokens,
    shouldReflect,
    record: { observationTokenCount: 250 },
  };
}

describe("compactConversation", () => {
  it("buffers and activates the unobserved tail into OM", async () => {
    const getStatus = vi
      .fn()
      .mockResolvedValueOnce(status(12_000))
      .mockResolvedValueOnce(status(0))
      .mockResolvedValueOnce(status(0));
    const om = {
      waitForBuffering: vi.fn().mockResolvedValue(undefined),
      getStatus,
      buffer: vi.fn().mockResolvedValue({ buffered: true }),
      activate: vi.fn().mockResolvedValue({
        activated: true,
        record: { observationTokenCount: 720 },
      }),
      reflect: vi.fn(),
    };

    const result = await compactConversation({
      memory: { omEngine: Promise.resolve(om) } as never,
      agent: {} as never,
      threadId: "thread-1",
      resourceId: "resource-1",
      requestContext: {} as never,
    });

    expect(om.buffer).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: "thread-1",
        resourceId: "resource-1",
        pendingTokens: 12_000,
        skipMinimumTokenCheck: true,
      }),
    );
    expect(om.activate).toHaveBeenCalledWith({
      threadId: "thread-1",
      resourceId: "resource-1",
      checkThreshold: false,
    });
    expect(result).toEqual({
      pendingTokensBefore: 12_000,
      pendingTokensAfter: 0,
      observationTokens: 720,
      buffered: true,
      activated: true,
      reflected: false,
    });
  });

  it("reflects when the activated observation window crossed its threshold", async () => {
    const om = {
      waitForBuffering: vi.fn().mockResolvedValue(undefined),
      getStatus: vi
        .fn()
        .mockResolvedValueOnce(status(5_000))
        .mockResolvedValueOnce(status(0, true))
        .mockResolvedValueOnce(status(0)),
      buffer: vi.fn().mockResolvedValue({ buffered: true }),
      activate: vi.fn().mockResolvedValue({
        activated: true,
        record: { observationTokenCount: 41_000 },
      }),
      reflect: vi.fn().mockResolvedValue({
        reflected: true,
        record: { observationTokenCount: 9_000 },
      }),
    };

    const result = await compactConversation({
      memory: { omEngine: Promise.resolve(om) } as never,
      agent: {} as never,
      threadId: "thread-1",
      resourceId: "resource-1",
      requestContext: {} as never,
    });

    expect(om.reflect).toHaveBeenCalled();
    expect(result.observationTokens).toBe(9_000);
    expect(result.reflected).toBe(true);
  });

  it("reports when the configured storage cannot run OM", async () => {
    await expect(
      compactConversation({
        memory: { omEngine: Promise.resolve(null) } as never,
        agent: {} as never,
        threadId: "thread-1",
        resourceId: "resource-1",
        requestContext: {} as never,
      }),
    ).rejects.toThrow("Observational Memory is unavailable");
  });
});
