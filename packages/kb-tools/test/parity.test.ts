import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkConformance } from "../src/conformance.js";
import { extractGraph } from "../src/graph.js";
import { pythonJson } from "../src/shared.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const bundle = resolve(repoRoot, "knowledge");
const fixtures = resolve(here, "fixtures");

// Golden snapshots were generated from the TS output and byte-verified against
// the original Python (conformance.py / graph.py) before those were retired.
// They are the permanent parity oracle. Regenerate intentionally with:
//   node skills/kb-lint/scripts/conformance.mjs knowledge --json > .../conformance.golden.json
//   node skills/kb-visualize/scripts/graph.mjs knowledge          > .../graph.golden.json
const confGolden = resolve(fixtures, "conformance.golden.json");
const graphGolden = resolve(fixtures, "graph.golden.json");

// If the Python originals still exist (they shouldn't after retirement), also
// cross-check against them as an extra guard.
const confPy = resolve(repoRoot, "skills/kb-lint/scripts/conformance.py");
const graphPy = resolve(repoRoot, "skills/kb-visualize/scripts/graph.py");

function pythonRaw(script: string, args: string[]): string {
  return execFileSync("python3", [script, ...args], { encoding: "utf-8" });
}

// The report/graph embeds the bundle path we passed. Normalize it to a stable
// token so goldens are portable across machines (CI has a different repoRoot).
function normalize(json: string): string {
  return json.replace(/"bundle": "[^"]*"/, '"bundle": "<bundle>"');
}

describe("conformance parity", () => {
  it("byte-matches the golden snapshot on knowledge/", () => {
    const out = normalize(pythonJson(checkConformance(bundle)) + "\n");
    expect(out).toEqual(normalize(readFileSync(confGolden, "utf-8")));
  });

  it("cross-checks the retired Python (only if still present)", () => {
    if (!existsSync(confPy)) return;
    expect(pythonJson(checkConformance(bundle)) + "\n").toEqual(pythonRaw(confPy, [bundle, "--json"]));
  });
});

describe("graph parity", () => {
  it("byte-matches the golden snapshot on knowledge/", () => {
    const out = normalize(pythonJson(extractGraph(bundle)) + "\n");
    expect(out).toEqual(normalize(readFileSync(graphGolden, "utf-8")));
  });

  it("cross-checks the retired Python (only if still present)", () => {
    if (!existsSync(graphPy)) return;
    expect(pythonJson(extractGraph(bundle)) + "\n").toEqual(pythonRaw(graphPy, [bundle]));
  });
});
