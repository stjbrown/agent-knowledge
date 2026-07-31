import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkConformance } from "../src/conformance.js";
import { extractGraph } from "../src/graph.js";

const roots: string[] = [];

function freshBundle(version = "0.2"): string {
  const bundle = mkdtempSync(join(tmpdir(), "kb-v02-"));
  roots.push(bundle);
  writeFileSync(
    join(bundle, "index.md"),
    `---\nokf_version: "${version}"\n---\n\n# Test Bundle\n`,
    "utf8",
  );
  return bundle;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("OKF v0.2 producer profile", () => {
  it("ships a warning-free v0.2 example bundle", () => {
    const report = checkConformance(resolve("skills/kb/example-bundle"));
    expect(report.okf_version).toBe("0.2");
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it("accepts structured provenance, keyed footnotes, actors, lifecycle, and attested computation", () => {
    const bundle = freshBundle();
    mkdirSync(join(bundle, "references"));
    writeFileSync(
      join(bundle, "references", "policy.md"),
      `---
type: Reference
title: Policy
resource: https://example.com/policy
generated: { by: process:test-fixture, at: 2026-07-31T12:00:00Z }
---

# Policy
`,
      "utf8",
    );
    writeFileSync(
      join(bundle, "metric.md"),
      `---
type: Metric
title: Revenue
generated: { by: janet/0.1.0-beta.4, at: 2026-07-31T12:00:00Z }
verified: { by: human:reviewer, at: 2026-07-31T13:00:00Z }
status: stable
sources:
  - id: policy
    resource: /references/policy.md
    title: Policy
---

Revenue follows the policy.[^policy]

[^policy]: Policy
`,
      "utf8",
    );
    writeFileSync(
      join(bundle, "compute.md"),
      `---
type: Attested Computation
runtime: bigquery
parameters:
  - { name: year, type: integer, required: true }
generated: { by: janet/0.1.0-beta.4, at: 2026-07-31T12:00:00Z }
---

# Computation

    SELECT @year
`,
      "utf8",
    );

    const report = checkConformance(bundle);
    expect(report.okf_version).toBe("0.2");
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it("keeps malformed optional families as warnings rather than conformance errors", () => {
    const bundle = freshBundle();
    writeFileSync(
      join(bundle, "bad.md"),
      `---
type: Attested Computation
generated: { by: janet/0.1.0-beta.4, at: yesterday }
verified: []
status: active
stale_after: someday
sources: [not-a-mapping]
---

Unsupported claim.[^missing]
`,
      "utf8",
    );

    const report = checkConformance(bundle);
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual(expect.arrayContaining([
      "bad.md: sources[0] requires non-empty 'resource'",
      "bad.md: footnote 'missing' has no matching sources[].id",
      "bad.md: generated.at must be an ISO 8601 datetime",
      "bad.md: verified must be a mapping or non-empty list of mappings",
      "bad.md: status must be draft, stable, or deprecated",
      "bad.md: stale_after must be an ISO 8601 YYYY-MM-DD date",
      "bad.md: Attested Computation requires non-empty 'runtime'",
      "bad.md: Attested Computation must use exactly one computation path or body section",
    ]));
  });

  it("enforces reserved-file structure as hard conformance", () => {
    const bundle = freshBundle();
    writeFileSync(
      join(bundle, "index.md"),
      `---\nokf_version: "0.2"\ndocumented_revision: abc\n---\n# Invalid root\n`,
      "utf8",
    );
    writeFileSync(join(bundle, "log.md"), "# Log\n\n## someday\n\n* Update\n", "utf8");

    expect(checkConformance(bundle).errors).toEqual([
      "index.md: reserved file must not carry frontmatter",
      "log.md: log date heading not ISO 8601: 'someday'",
    ]);
  });

  it("requires okf_version to be a quoted major.minor string", () => {
    const bundle = freshBundle();
    writeFileSync(
      join(bundle, "index.md"),
      "---\nokf_version: 0.2\n---\n\n# Invalid version type\n",
      "utf8",
    );

    expect(checkConformance(bundle).errors).toEqual([
      "index.md: okf_version must be a string in <major>.<minor> form",
    ]);
  });
});

describe("OKF v0.1 compatibility", () => {
  it("consumes declared v0.1 timestamp and citation conventions without v0.2 warnings", () => {
    const bundle = freshBundle("0.1");
    writeFileSync(
      join(bundle, "legacy.md"),
      `---\ntype: Concept\ntimestamp: 2026-01-01T00:00:00Z\n---\n\n# Legacy\n\n# Citations\n\n1. Example\n`,
      "utf8",
    );

    const report = checkConformance(bundle);
    expect(report.okf_version).toBe("0.1");
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });
});

describe("OKF v0.2 graph consumption", () => {
  it("derives trust, freshness, last-change, and provenance edges from v0.2 fields", () => {
    const bundle = freshBundle();
    mkdirSync(join(bundle, "references"));
    writeFileSync(
      join(bundle, "references", "source.md"),
      "---\ntype: Reference\n---\n\n# Source\n",
      "utf8",
    );
    writeFileSync(
      join(bundle, "item.md"),
      `---
type: Concept
generated: { by: janet/0.1.0-beta.4, at: 2026-07-31T12:00:00Z }
verified: { by: human:reviewer, at: 2026-07-31T13:00:00Z }
stale_after: 2020-01-01
sources:
  - id: source
    resource: /references/source.md
---

# Item
`,
      "utf8",
    );

    const graph = extractGraph(bundle);
    const item = graph.nodes.find((node) => node.id === "item")!;
    expect(item.status).toBe("stable");
    expect(item.trust_tier).toBe("human-reviewed");
    expect(item.last_changed).toBe("2026-07-31T12:00:00Z");
    expect(item.is_stale).toBe(true);
    expect(item.links).toContain("references/source");
    expect(graph.edges).toContainEqual({ source: "item", target: "references/source" });
  });
});
