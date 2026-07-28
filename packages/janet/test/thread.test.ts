import { describe, expect, it, vi } from "vitest";
import { clearConversation } from "../src/tui/thread.js";

describe("clearConversation", () => {
  it("rotates to a blank thread without deleting the previous one", async () => {
    const create = vi.fn().mockResolvedValue({ id: "thread-new" });

    await expect(
      clearConversation({
        getId: () => "thread-old",
        create,
      }),
    ).resolves.toEqual({
      previousThreadId: "thread-old",
      threadId: "thread-new",
    });

    expect(create).toHaveBeenCalledWith({ title: "Janet conversation" });
  });

  it("leaves errors to the caller so the existing transcript can stay visible", async () => {
    const error = new Error("storage unavailable");

    await expect(
      clearConversation({
        getId: () => "thread-old",
        create: vi.fn().mockRejectedValue(error),
      }),
    ).rejects.toBe(error);
  });
});
