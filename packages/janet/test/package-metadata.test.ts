import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("published package metadata", () => {
  it("pins runtime dependencies for reproducible global and npx installs", () => {
    const metadata = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { dependencies: Record<string, string> };

    for (const [name, version] of Object.entries(metadata.dependencies)) {
      expect(version, `${name} must use an exact version`).toMatch(
        /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/,
      );
    }
  });
});
