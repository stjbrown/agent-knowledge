import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkConformance } from "../src/conformance.js";

const roots: string[] = [];

function bundleWith(name: string, contents: string): string {
  const root = mkdtempSync(join(tmpdir(), "kb-conformance-"));
  roots.push(root);
  const bundle = join(root, name);
  mkdirSync(bundle);
  writeFileSync(join(bundle, "item.md"), contents, "utf-8");
  return bundle;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("conformance YAML parsing", () => {
  it("rejects malformed YAML", () => {
    const report = checkConformance(bundleWith("bad", "---\ntype: [unterminated\n---\n# Bad\n"));
    expect(report.errors).toEqual(["item.md: concept has no parseable frontmatter"]);
  });

  it("rejects semantically empty and non-string type values", () => {
    const empty = checkConformance(bundleWith("empty", '---\ntype: ""\n---\n# Empty\n'));
    const list = checkConformance(bundleWith("list", "---\ntype: []\n---\n# List\n"));
    expect(empty.errors).toEqual(["item.md: missing or empty required 'type'"]);
    expect(list.errors).toEqual(["item.md: missing or empty required 'type'"]);
  });

  it("accepts valid CRLF frontmatter", () => {
    const report = checkConformance(bundleWith("crlf", "---\r\ntype: Concept\r\n---\r\n# Valid\r\n"));
    expect(report.errors).toEqual([]);
  });

  it("does not mistake a mention of okf_version for the root declaration", () => {
    const root = mkdtempSync(join(tmpdir(), "kb-conformance-index-"));
    roots.push(root);
    writeFileSync(join(root, "index.md"), "---\nnote: mentions okf_version only\n---\n# Index\n", "utf-8");
    expect(checkConformance(root).errors).toEqual([
      "index.md: reserved file must not carry frontmatter",
    ]);
  });
});
