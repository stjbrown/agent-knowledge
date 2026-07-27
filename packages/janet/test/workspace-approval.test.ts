import { describe, expect, it } from "vitest";
import { RequestContext } from "@mastra/core/request-context";
import {
  createWorkspaceTools,
  WORKSPACE_TOOLS,
} from "@mastra/core/workspace";
import {
  createWorkspace,
  editToolsEnabled,
  executionToolsEnabled,
  requiresExecutionApproval,
} from "../src/agent/workspace.js";

function context(
  execute: "allow" | "ask" | "deny",
  edit: "allow" | "ask" | "deny" = "deny",
) {
  return {
    args: {},
    workspace: {},
    requestContext: {
      controller: {
        state: {
          permissionRules: {
            categories: { edit, execute },
          },
        },
      },
    },
  };
}

describe("workspace execution approval", () => {
  it("asks in an interactive session", () => {
    expect(executionToolsEnabled(context("ask", "allow"))).toBe(true);
    expect(editToolsEnabled(context("ask", "allow"))).toBe(true);
    expect(requiresExecutionApproval(context("ask", "allow"))).toBe(true);
  });

  it("runs without suspension after explicit headless opt-in", () => {
    expect(executionToolsEnabled(context("allow"))).toBe(true);
    expect(requiresExecutionApproval(context("allow"))).toBe(false);
  });

  it("fails closed when policy context is absent", () => {
    const missing = { args: {}, workspace: {}, requestContext: {} };
    expect(executionToolsEnabled(missing)).toBe(false);
    expect(editToolsEnabled(missing)).toBe(false);
    expect(requiresExecutionApproval(missing)).toBe(true);
  });

  it("removes denied headless capabilities from the tool list", () => {
    expect(executionToolsEnabled(context("deny"))).toBe(false);
    expect(editToolsEnabled(context("deny"))).toBe(false);
  });

  it("applies the policy to the actual Mastra workspace tool set", async () => {
    const workspace = createWorkspace({
      projectPath: process.cwd(),
      skills: {
        relativeRoot: ".agent-knowledge/skills",
        allowedPaths: [],
      },
    });

    const deniedContext = context("deny", "deny").requestContext;
    const deniedTools = await createWorkspaceTools(workspace, {
      requestContext: deniedContext,
      workspace,
    });
    expect(deniedTools[WORKSPACE_TOOLS.FILESYSTEM.READ_FILE]).toBeDefined();
    expect(deniedTools[WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]).toBeUndefined();
    expect(deniedTools[WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]).toBeUndefined();

    const interactiveContext = context("ask", "allow").requestContext;
    const interactiveTools = await createWorkspaceTools(workspace, {
      requestContext: interactiveContext,
      workspace,
    });
    const executeTool =
      interactiveTools[WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND];
    expect(interactiveTools[WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]).toBeDefined();
    expect(executeTool).toBeDefined();
    expect(executeTool.requireApproval).toBe(true);

    const requestContext = new RequestContext(
      Object.entries(interactiveContext),
    );
    expect(
      await executeTool.needsApprovalFn({}, { requestContext, workspace }),
    ).toBe(true);
  });
});
