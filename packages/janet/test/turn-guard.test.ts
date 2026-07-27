import { describe, expect, it } from "vitest";
import { createSkillTurnGuard } from "../src/agent/turn-guard.js";

describe("per-turn skill guard", () => {
  it("short-circuits a duplicate skill load in the same turn", () => {
    const guard = createSkillTurnGuard();
    const requestContext = {};
    const context = { requestContext };
    const input = { name: "kb-init" };

    expect(guard.beforeToolCall("skill", input, context)).toBeUndefined();
    expect(guard.beforeToolCall("skill", input, context)).toEqual({
      proceed: false,
      output:
        "This skill procedure is already loaded for the current turn. Continue from the procedure already in context.",
    });
  });

  it("scopes loader state to one request context", () => {
    const guard = createSkillTurnGuard();
    const input = { name: "kb-init" };

    guard.beforeToolCall("skill", input, { requestContext: {} });

    expect(
      guard.beforeToolCall("skill", input, { requestContext: {} }),
    ).toBeUndefined();
  });

  it("allows a different procedure to be chained", () => {
    const guard = createSkillTurnGuard();
    const context = { requestContext: {} };

    guard.beforeToolCall("skill", { name: "kb-init" }, context);

    expect(
      guard.beforeToolCall("skill", { name: "kb-lint" }, context),
    ).toBeUndefined();
  });

  it("blocks rereading the main procedure through skill_read", () => {
    const guard = createSkillTurnGuard();
    const context = { requestContext: {} };

    guard.beforeToolCall("skill", { name: "kb-init" }, context);

    expect(
      guard.beforeToolCall(
        "skill_read",
        { skillName: "kb-init", path: "SKILL.md" },
        context,
      ),
    ).toEqual({
      proceed: false,
      output:
        "This skill procedure is already loaded for the current turn. Continue from the procedure already in context.",
    });
  });

  it("allows a loaded skill to read a referenced file", () => {
    const guard = createSkillTurnGuard();
    const context = { requestContext: {} };

    guard.beforeToolCall("skill", { name: "kb-init" }, context);

    expect(
      guard.beforeToolCall(
        "skill_read",
        { skillName: "kb-init", path: "references/schema.md" },
        context,
      ),
    ).toBeUndefined();
  });

  it("allows a retry when a skill load fails", () => {
    const guard = createSkillTurnGuard();
    const context = { requestContext: {} };
    const input = { name: "kb-init" };

    guard.beforeToolCall("skill", input, context);
    guard.afterToolCall("skill", input, context, new Error("load failed"));

    expect(guard.beforeToolCall("skill", input, context)).toBeUndefined();
  });
});
