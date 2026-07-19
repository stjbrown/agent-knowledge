import { spawn } from "node:child_process";
import type { AgentControllerEvent } from "@mastra/core/agent-controller";

type Session = {
  subscribe: (listener: (event: AgentControllerEvent) => void) => () => void;
  thread: { getId: () => string | null };
};

type HerdrState = "idle" | "working" | "blocked" | "unknown";

const SOURCE = "janet";
const AGENT = "janet";

/**
 * Report Janet's lifecycle to a Herdr pane, natively — no hook file needed
 * because we own the event loop. When running inside a Herdr-managed pane
 * (`HERDR_PANE_ID` set), map AgentController events to Herdr agent-status and
 * push them via `herdr pane report-agent`, and register the thread id so Herdr
 * can restore the pane later with `janet --thread <id>`.
 *
 * All reporting is fire-and-forget (detached, stdio ignored) so a missing or
 * slow `herdr` binary never blocks or breaks a turn. Returns a detach function
 * that unsubscribes and releases the agent from the pane.
 */
export function attachHerdrReporter(session: Session, opts: { projectPath: string }): () => void {
  const pane = process.env["HERDR_PANE_ID"];
  if (!pane) return () => {};

  let seq = 0;
  let reported: HerdrState | null = null;

  const run = (args: string[]): void => {
    try {
      spawn("herdr", args, { stdio: "ignore", detached: true }).on("error", () => {}).unref();
    } catch {
      // herdr not on PATH or spawn failed — reporting is best-effort.
    }
  };

  const report = (state: HerdrState): void => {
    if (state === reported) return;
    reported = state;
    const threadId = session.thread.getId();
    const sessionArgs = threadId
      ? ["--agent-session-id", threadId, "--agent-session-path", opts.projectPath]
      : [];
    run([
      "pane",
      "report-agent",
      pane,
      "--source",
      SOURCE,
      "--agent",
      AGENT,
      "--state",
      state,
      "--seq",
      String(seq++),
      ...sessionArgs,
    ]);
  };

  // Agent at the prompt.
  report("idle");

  const unsubscribe = session.subscribe((event: AgentControllerEvent) => {
    switch (event.type) {
      case "agent_start":
        report("working");
        break;
      case "tool_approval_required":
      case "tool_suspended":
        report("blocked");
        break;
      // Any activity after a block means the turn resumed.
      case "message_update":
      case "message_end":
      case "tool_start":
      case "tool_end":
        report("working");
        break;
      case "agent_end":
      case "error":
        report("idle");
        break;
    }
  });

  return () => {
    unsubscribe();
    run(["pane", "release-agent", pane, "--source", SOURCE, "--agent", AGENT, "--seq", String(seq++)]);
  };
}
