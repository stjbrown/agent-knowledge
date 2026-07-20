import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/headless/flags.js";

describe("parseArgs", () => {
  it("parses command, paths, thread, and safety flags", () => {
    const parsed = parseArgs([
      "--dir",
      "/project",
      "--bundle=docs/kb",
      "--thread",
      "thread-1",
      "--allow-exec",
      "ingest",
      "notes.md",
    ]);

    expect(parsed.subcommand).toBe("ingest");
    expect(parsed.positionals).toEqual(["notes.md"]);
    expect(parsed.values).toMatchObject({
      dir: "/project",
      bundle: "docs/kb",
      thread: "thread-1",
    });
    expect(parsed.flags.has("allow-exec")).toBe(true);
  });
});
