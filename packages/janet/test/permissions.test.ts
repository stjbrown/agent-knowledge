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

  it("always allows orchestration tools without widening unknown categories", () => {
    const interactive = permissionRulesFor({ interactive: true });
    const headless = permissionRulesFor({ interactive: false });

    for (const toolName of ["skill", "ask_user", "submit_plan", "task_write"]) {
      expect(interactive.tools[toolName]).toBe("allow");
      expect(headless.tools[toolName]).toBe("allow");
      expect(janetToolCategory(toolName)).toBeNull();
    }
    expect(interactive.tools.future_mutating_tool).toBeUndefined();
  });

  it("asks interactively for unknown and access-escalation tools", () => {
    const rules = permissionRulesFor({ interactive: true });
    expect(rules.categories.other).toBe("ask");
    expect(janetToolCategory("future_mutating_tool")).toBe("other");
    expect(janetToolCategory("request_access")).toBe("other");
  });

  it("classifies bounded PDF extraction as a read operation", () => {
    expect(janetToolCategory("janet_read_pdf")).toBe("read");
    expect(janetToolCategory("janet_read_pdf_chunk")).toBe("read");
  });

  it("classifies bounded web extraction as a read operation", () => {
    expect(janetToolCategory("janet_web_fetch")).toBe("read");
    expect(janetToolCategory("janet_web_fetch_chunk")).toBe("read");
  });

  it("classifies observational-memory recall as a read operation", () => {
    expect(janetToolCategory("recall")).toBe("read");
  });
});

describe("resumeThread", () => {
  it("uses the hydrating thread switch API", async () => {
    const switchThread = vi.fn(async () => {});
    await resumeThread({ thread: { switch: switchThread } }, "thread-123");
    expect(switchThread).toHaveBeenCalledWith({ threadId: "thread-123" });
  });
});
