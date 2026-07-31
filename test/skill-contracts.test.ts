import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function skill(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("kb-ingest behavioral contract", () => {
  it("reads the trust model before planning and exhaustively propagates source changes", () => {
    const ingest = skill("skills/kb-ingest/SKILL.md");

    expect(ingest).toContain("read it before\nplanning every ingest");
    expect(ingest).toContain("**Impact sweep**");
    expect(ingest).toContain("every dependent\nfound by the impact sweep");
    expect(ingest).toContain("current comparisons, and current roll-ups");
  });

  it("does not turn normal ingest mechanics into unnecessary user choices", () => {
    const ingest = skill("skills/kb-ingest/SKILL.md");

    expect(ingest).toContain("authorizes the complete normal procedure");
    expect(ingest).toContain("Do not turn those mechanics into a scope menu");
  });

  it("uses the v0.2 lifecycle while preserving successor extensions", () => {
    const trust = skill("skills/kb/references/trust-model.md");

    expect(trust).toContain("status: deprecated");
    expect(trust).toContain("supersedes: <concept-id>");
    expect(trust).toContain("superseded_by: <concept-id>");
    expect(trust).toMatch(/not an OKF\s+conformance requirement/);
  });
});

describe("kb-visualize freshness contract", () => {
  it("renders and verifies the model extracted in the current run", () => {
    const visualize = skill("skills/kb-visualize/SKILL.md");

    expect(visualize).toContain("this extractor invocation");
    expect(visualize).toContain("Do not reuse a\nprevious run's cached graph JSON");
    expect(visualize).toContain("node/edge counts and changed\nconcept IDs match");
  });
});
