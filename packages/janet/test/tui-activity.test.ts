import { describe, expect, it } from "vitest";
import {
  toolActivityLabel,
  toolErrorLabel,
} from "../src/tui/activity.js";

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
    expect(toolActivityLabel("janet_read_pdf")).toBe(
      "Janet is reading the document…",
    );
    expect(toolActivityLabel("janet_web_fetch")).toBe(
      "Janet is reading the page…",
    );
    expect(toolActivityLabel("unknown_tool")).toBe("Janet is working…");
  });

  it("explains read-before-write recovery without leaking an internal exception", () => {
    expect(
      toolErrorLabel(
        'Error: File "knowledge/spec/types.md" has not been read. You must read a file before writing to it.',
      ),
    ).toBe(
      'Update paused: Janet needs to re-read "knowledge/spec/types.md" first.',
    );
    expect(toolErrorLabel("network unavailable")).toBe(
      "Tool error: network unavailable",
    );
  });
});
