import { describe, expect, it } from "vitest";
import { commandExitCode, headlessCapabilities } from "../src/commands.js";

describe("commandExitCode", () => {
  it("preserves deterministic lint failures", () => {
    expect(commandExitCode("lint", 0, 2)).toBe(1);
  });

  it("preserves agent failures and successful non-lint commands", () => {
    expect(commandExitCode("lint", 1, 0)).toBe(1);
    expect(commandExitCode("query", 0, 4)).toBe(0);
  });
});

describe("headlessCapabilities", () => {
  it("keeps query and ordinary lint read-only", () => {
    expect(headlessCapabilities("query", new Set())).toEqual({
      allowEdits: false,
      allowExec: false,
    });
    expect(headlessCapabilities("lint", new Set())).toEqual({
      allowEdits: false,
      allowExec: false,
    });
  });

  it("allows known writes and requires explicit execution opt-in", () => {
    expect(headlessCapabilities("ingest", new Set(["allow-exec"]))).toEqual({
      allowEdits: true,
      allowExec: true,
    });
    expect(headlessCapabilities("lint", new Set(["fix"]))).toEqual({
      allowEdits: true,
      allowExec: false,
    });
  });
});
