import { describe, expect, it } from "vitest";
import { guardWebWorkspaceRead } from "../src/tools/web-guard.js";

describe("web workspace read guard", () => {
  it("blocks unbounded generic reads of cached web artifacts", () => {
    const hash = "a".repeat(64);
    expect(
      guardWebWorkspaceRead("mastra_workspace_read_file", {
        path: `.agent-knowledge/cache/web/${hash}.md`,
      }),
    ).toEqual({
      proceed: false,
      output: expect.stringContaining("janet_web_fetch_chunk"),
    });
  });

  it("does not interfere with normal workspace reads or stats", () => {
    expect(
      guardWebWorkspaceRead("mastra_workspace_read_file", {
        path: "knowledge/index.md",
      }),
    ).toBeUndefined();
    expect(
      guardWebWorkspaceRead("mastra_workspace_file_stat", {
        path: `.agent-knowledge/cache/web/${"a".repeat(64)}.md`,
      }),
    ).toBeUndefined();
  });
});
