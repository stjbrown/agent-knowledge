import type { AgentControllerEvent } from "@mastra/core/agent-controller";
import { bootJanet } from "../agent/controller.js";
import { messageText } from "./format.js";

export interface HeadlessOptions {
  /** The directive/message to send to Janet. */
  message: string;
  dir?: string;
  bundle?: string;
  /** Model id to switch to before the turn (from --model / JANET_MODEL). */
  modelId?: string;
  /** Resume an existing thread. */
  threadId?: string;
}

export interface HeadlessResult {
  exitCode: number;
  /** Final assistant text (also streamed to stdout as it arrives). */
  text: string;
}

/**
 * Headless one-shot: boot a session, auto-approve tool calls, stream assistant
 * text to stdout, and resolve on `agent_end`. Pattern from mastracode's
 * `sdk/src/headless/`.
 */
export async function runHeadless(opts: HeadlessOptions): Promise<HeadlessResult> {
  const { controller, session } = await bootJanet({
    dir: opts.dir,
    bundle: opts.bundle,
    interactive: false,
  });

  if (opts.threadId) {
    await session.thread.set({ threadId: opts.threadId });
  }
  // Expose the active thread id so a supervisor (e.g. Herdr) can reattach with
  // `janet --thread <id>` after a restart.
  const activeThreadId = session.thread.getId();
  if (activeThreadId && process.env["JANET_PRINT_THREAD"]) {
    process.stderr.write(`janet:thread ${activeThreadId}\n`);
  }

  if (opts.modelId) {
    await session.model.switch({ modelId: opts.modelId });
  }
  if (!session.model.hasSelection()) {
    process.stderr.write(
      "No model selected. Pass --model 'provider/model' or set JANET_MODEL, " +
        "or run `janet` once to onboard. Checked: JANET_MODEL, and any persisted selection.\n",
    );
    await controller.destroy();
    return { exitCode: 2, text: "" };
  }

  let finalText = "";
  let lastStreamed = "";
  let currentMessageId = "";
  let exitCode = 0;

  const debug = !!process.env["JANET_DEBUG"];
  await new Promise<void>((resolve) => {
    // Headless one-shots cannot answer questions: skills that would normally
    // ask the user (e.g. kb-init's domain questions) must proceed on their own.
    const nonInteractiveNote =
      "\n\n(Non-interactive run: you cannot ask the user questions. Make reasonable " +
      "assumptions from the workspace contents, state them briefly, and complete the " +
      "task end-to-end in this single turn.)";

    const unsubscribe = session.subscribe((event: AgentControllerEvent) => {
      if (debug) {
        const extra =
          event.type === "tool_start"
            ? ` ${event.toolName} ${JSON.stringify(event.args).slice(0, 100)}`
            : event.type === "tool_end"
              ? ` isError=${event.isError} ${String(event.result).slice(0, 80)}`
              : event.type === "message_end" && event.message.role === "assistant"
                ? ` toolCalls=${JSON.stringify(event.message.content.filter((c) => c.type === "tool_call").map((c) => (c as { name: string }).name))}`
                : event.type === "agent_end"
                  ? ` reason=${event.reason}`
                  : event.type === "error"
                    ? ` ${event.errorType} ${String(event.error?.message ?? "").slice(0, 120)}`
                    : "";
        process.stderr.write(`[dbg] ${event.type}${extra}\n`);
      }
      switch (event.type) {
        case "message_update":
        case "message_end": {
          if (event.message.role !== "assistant") break;
          // Only reset the streamed-prefix tracker when a genuinely NEW message
          // starts (the same message keeps growing across tool calls).
          if (event.message.id !== currentMessageId) {
            currentMessageId = event.message.id;
            if (lastStreamed.length > 0) process.stdout.write("\n");
            lastStreamed = "";
          }
          const text = messageText(event.message);
          if (text.length > lastStreamed.length && text.startsWith(lastStreamed)) {
            process.stdout.write(text.slice(lastStreamed.length));
            lastStreamed = text;
          }
          if (event.type === "message_end" && text.length > 0) {
            finalText = text;
          }
          break;
        }
        case "tool_approval_required":
          // Headless policy: auto-approve everything.
          void session.respondToToolApproval({ decision: "approve", toolCallId: event.toolCallId });
          break;
        case "error": {
          const err = event.error as Error & { statusCode?: number; responseBody?: string };
          const detail = [
            err?.message,
            err?.statusCode ? `HTTP ${err.statusCode}` : "",
            err?.responseBody?.slice(0, 400) ?? "",
          ]
            .filter(Boolean)
            .join(" — ");
          process.stderr.write(`\nJanet hit a snag: ${detail || "unknown error"}\n`);
          exitCode = 1;
          break;
        }
        case "agent_end":
          if (event.reason === "error" || event.reason === "aborted") exitCode = 1;
          unsubscribe();
          resolve();
          break;
      }
    });

    void session.sendMessage({ content: opts.message + nonInteractiveNote });
  });

  process.stdout.write("\n");
  await controller.destroy();
  return { exitCode, text: finalText };
}
