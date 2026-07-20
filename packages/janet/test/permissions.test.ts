import { describe, expect, it, vi } from "vitest";
import { permissionRulesFor, resumeThread } from "../src/agent/controller.js";
import { janetToolCategory } from "../src/agent/permissions.js";

describe("Janet permission policy", () => {
  it("fails closed for read-only headless runs", () => {
    const rules = permissionRulesFor({ interactive: false });
    expect(rules.categories).toEqual({
      read: "allow",
      edit: "deny",
      execute: "deny",
      mcp: "deny",
      other: "deny",
    });
  });

  it("requires explicit opt-in for headless execution", () => {
    const rules = permissionRulesFor({
      interactive: false,
      allowHeadlessEdits: true,
      allowHeadlessExec: true,
    });
    expect(rules.categories.edit).toBe("allow");
    expect(rules.categories.execute).toBe("allow");
  });

  it("asks interactively for unknown and access-escalation tools", () => {
    const rules = permissionRulesFor({ interactive: true });
    expect(rules.categories.other).toBe("ask");
    expect(janetToolCategory("future_mutating_tool")).toBe("other");
    expect(janetToolCategory("request_access")).toBe("other");
  });
});

describe("resumeThread", () => {
  it("uses the hydrating thread switch API", async () => {
    const switchThread = vi.fn(async () => {});
    await resumeThread({ thread: { switch: switchThread } }, "thread-123");
    expect(switchThread).toHaveBeenCalledWith({ threadId: "thread-123" });
  });
});
