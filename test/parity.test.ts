import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkConformance } from "../src/conformance.js";
import { extractGraph } from "../src/graph.js";
import { pythonJson } from "../src/shared.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const bundle = resolve(repoRoot, "knowledge");
const fixtures = resolve(here, "fixtures");

// Golden snapshots lock the public JSON shape of the v0.2-aware TypeScript tools.
// Regenerate intentionally with:
//   node skills/kb-lint/scripts/conformance.mjs knowledge --json > .../conformance.golden.json
//   node skills/kb-visualize/scripts/graph.mjs knowledge          > .../graph.golden.json
const confGolden = resolve(fixtures, "conformance.golden.json");
const graphGolden = resolve(fixtures, "graph.golden.json");

// The report/graph embeds the bundle path we passed. Normalize it to a stable
// token so goldens are portable across machines (CI has a different repoRoot).
function normalize(json: string): string {
  return json.replace(/"bundle": "[^"]*"/, '"bundle": "<bundle>"');
}

describe("conformance golden output", () => {
  it("byte-matches the golden snapshot on knowledge/", () => {
    const out = normalize(pythonJson(checkConformance(bundle)) + "\n");
    expect(out).toEqual(normalize(readFileSync(confGolden, "utf-8")));
  });
});

describe("graph golden output", () => {
  it("byte-matches the golden snapshot on knowledge/", () => {
    const out = normalize(pythonJson(extractGraph(bundle)) + "\n");
    expect(out).toEqual(normalize(readFileSync(graphGolden, "utf-8")));
  });
});
