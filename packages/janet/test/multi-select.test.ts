import { describe, expect, it, vi } from "vitest";
import stripAnsi from "strip-ansi";
import { MultiSelectList } from "../src/tui/multi-select.js";

const theme = {
  selectedPrefix: (text: string) => text,
  selectedText: (text: string) => text,
  description: (text: string) => text,
  scrollInfo: (text: string) => text,
  noMatch: (text: string) => text,
};

describe("MultiSelectList", () => {
  it("renders initial checkboxes and toggles more than one option", () => {
    const select = new MultiSelectList(
      [
        { value: "vertex", label: "Google Vertex AI" },
        { value: "amazon-bedrock", label: "Amazon Bedrock" },
      ],
      5,
      theme,
      ["vertex"],
    );

    expect(stripAnsi(select.render(80).join("\n"))).toContain(
      "→ [x] Google Vertex AI",
    );
    select.handleInput("\u001b[B");
    select.handleInput(" ");

    expect(select.getSelectedItems().map((item) => item.value)).toEqual([
      "vertex",
      "amazon-bedrock",
    ]);

    select.handleInput("\u001b[A");
    select.handleInput(" ");
    expect(select.getSelectedItems().map((item) => item.value)).toEqual([
      "amazon-bedrock",
    ]);
  });

  it("confirms the complete checked set and supports cancellation", () => {
    const confirm = vi.fn();
    const cancel = vi.fn();
    const select = new MultiSelectList(
      [
        { value: "vertex", label: "Google Vertex AI" },
        { value: "amazon-bedrock", label: "Amazon Bedrock" },
      ],
      5,
      theme,
      ["vertex", "amazon-bedrock"],
    );
    select.onConfirm = confirm;
    select.onCancel = cancel;

    select.handleInput("\r");
    select.handleInput("\u001b");

    expect(confirm).toHaveBeenCalledWith([
      { value: "vertex", label: "Google Vertex AI" },
      { value: "amazon-bedrock", label: "Amazon Bedrock" },
    ]);
    expect(cancel).toHaveBeenCalledOnce();
  });
});
