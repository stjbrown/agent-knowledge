import { describe, expect, it } from "vitest";
import { toolActivityLabel } from "../src/tui/activity.js";

describe("TUI activity labels", () => {
  it("turns internal tool names into quiet user-facing status", () => {
    expect(toolActivityLabel("skill")).toBe("Janet is reading the playbook…");
    expect(toolActivityLabel("mastra_workspace_list_files")).toBe(
      "Janet is checking the workspace…",
    );
    expect(toolActivityLabel("mastra_workspace_write_file")).toBe(
      "Janet is updating the bundle…",
    );
    expect(toolActivityLabel("mastra_workspace_mkdir")).toBe(
      "Janet is updating the bundle…",
    );
    expect(toolActivityLabel("mastra_workspace_kill_process")).toBe(
      "Janet is running a check…",
    );
    expect(toolActivityLabel("unknown_tool")).toBe("Janet is working…");
  });
});
