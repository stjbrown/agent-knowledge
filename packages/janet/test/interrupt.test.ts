import { describe, expect, it, vi } from "vitest";
import {
  createInterruptController,
  type InterruptResult,
} from "../src/tui/interrupt.js";

function harness() {
  let running = false;
  let input = "";
  let now = 1_000;
  const abortRun = vi.fn();
  const exit = vi.fn();
  const notifications: InterruptResult[] = [];
  const controller = createInterruptController(
    {
      isRunning: () => running,
      hasInput: () => input.length > 0,
      abortRun,
      clearInput: () => {
        input = "";
      },
      exit,
      notify: (result) => notifications.push(result),
    },
    { now: () => now },
  );

  return {
    controller,
    abortRun,
    exit,
    notifications,
    setRunning(value: boolean) {
      running = value;
    },
    setInput(value: string) {
      input = value;
    },
    getInput() {
      return input;
    },
    advance(ms: number) {
      now += ms;
    },
  };
}

describe("TUI interrupt controller", () => {
  it("cancels an active run with Ctrl+C", () => {
    const h = harness();
    h.setRunning(true);

    expect(h.controller.handleCtrlC()).toBe("cancelled");
    expect(h.abortRun).toHaveBeenCalledOnce();
    expect(h.notifications).toEqual(["cancelled"]);
  });

  it("force exits when a cancelled run ignores a second Ctrl+C", () => {
    const h = harness();
    h.setRunning(true);

    expect(h.controller.handleCtrlC()).toBe("cancelled");
    h.advance(200);
    expect(h.controller.handleCtrlC()).toBe("exit");
    expect(h.abortRun).toHaveBeenCalledOnce();
    expect(h.exit).toHaveBeenCalledOnce();
  });

  it("cancels an active run with Escape", () => {
    const h = harness();
    h.setRunning(true);

    expect(h.controller.handleEscape()).toBe("cancelled");
    expect(h.abortRun).toHaveBeenCalledOnce();
  });

  it("does not consume Escape while idle", () => {
    const h = harness();

    expect(h.controller.handleEscape()).toBe("ignored");
    expect(h.abortRun).not.toHaveBeenCalled();
  });

  it("exits on a second Ctrl+C inside the double-press window", () => {
    const h = harness();

    expect(h.controller.handleCtrlC()).toBe("exit-hint");
    h.advance(200);
    expect(h.controller.handleCtrlC()).toBe("exit");
    expect(h.exit).toHaveBeenCalledOnce();
  });

  it("clears editor input on a single idle Ctrl+C", () => {
    const h = harness();
    h.setInput("unfinished prompt");

    expect(h.controller.handleCtrlC()).toBe("cleared");
    expect(h.getInput()).toBe("");
    expect(h.exit).not.toHaveBeenCalled();
  });

  it("requires a fresh double press after the window expires", () => {
    const h = harness();

    expect(h.controller.handleCtrlC()).toBe("exit-hint");
    h.advance(900);
    expect(h.controller.handleCtrlC()).toBe("exit-hint");
    expect(h.exit).not.toHaveBeenCalled();
  });
});
