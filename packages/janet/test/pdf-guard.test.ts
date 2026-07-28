import { describe, expect, it } from "vitest";
import { guardPdfWorkspaceRead } from "../src/tools/pdf-guard.js";

describe("PDF workspace read guard", () => {
  it("blocks PDFs from the generic media-aware reader", () => {
    expect(
      guardPdfWorkspaceRead("mastra_workspace_read_file", {
        path: "raw/Quarterly Report.PDF",
      }),
    ).toEqual({
      proceed: false,
      output: expect.stringContaining("janet_read_pdf"),
    });
  });

  it("blocks unbounded generic reads of cached PDF artifacts", () => {
    const hash = "a".repeat(64);
    expect(
      guardPdfWorkspaceRead("mastra_workspace_read_file", {
        path: `.agent-knowledge/cache/pdf/${hash}.md`,
      }),
    ).toEqual({
      proceed: false,
      output: expect.stringContaining("janet_read_pdf_chunk"),
    });
  });

  it("does not interfere with normal workspace reads", () => {
    expect(
      guardPdfWorkspaceRead("mastra_workspace_read_file", {
        path: "knowledge/index.md",
      }),
    ).toBeUndefined();
    expect(
      guardPdfWorkspaceRead("mastra_workspace_file_stat", {
        path: "raw/source.pdf",
      }),
    ).toBeUndefined();
  });
});
