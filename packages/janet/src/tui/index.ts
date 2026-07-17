/**
 * Janet's interactive TUI — a minimal pi-tui chat.
 *
 * One screen: chat transcript (streaming markdown per assistant message, dim
 * one-liners for tool activity), an editor, and a status line showing the
 * current model and run state. Tool approvals are handled inline: the next
 * editor submit answers y/n, so there is exactly one focusable component and
 * zero focus juggling.
 */
import {
  Container,
  Editor,
  Loader,
  Markdown,
  ProcessTerminal,
  Spacer,
  TUI,
  Text,
} from "@earendil-works/pi-tui";
import type { AgentControllerEvent } from "@mastra/core/agent-controller";
import { bootJanet, type BootOptions } from "../agent/controller.js";
import { messageText } from "../headless/format.js";
import { GREETING } from "../agent/persona.js";
import { c, editorTheme, markdownTheme } from "./theme.js";

/** Editor with a Ctrl+C hook (raw-mode terminals deliver it as input \x03). */
class JanetEditor extends Editor {
  onCtrlC?: () => void;
  override handleInput(data: string): void {
    if (data === "\x03") {
      this.onCtrlC?.();
      return;
    }
    super.handleInput(data);
  }
}

const HELP_TEXT = `Commands:
  /model <provider/id>   Switch model (e.g. /model vertex/claude-opus-4-1)
  /models                List models for configured providers
  /help                  This help
  /quit                  Exit (double Ctrl+C also works)

Anything else is a message to Janet.`;

interface PendingApproval {
  toolCallId: string;
  toolName: string;
}

export async function runTui(opts: Omit<BootOptions, "interactive">): Promise<number> {
  const { controller, session, paths } = await bootJanet({ ...opts, interactive: true });

  // Model preselection from env when nothing persisted.
  const envModel = process.env["JANET_MODEL"];
  if (!session.model.hasSelection() && envModel) {
    await session.model.switch({ modelId: envModel });
  }

  const terminal = new ProcessTerminal();
  const ui = new TUI(terminal);
  const chat = new Container();
  const status = new Text("", 1, 0);
  const editor = new JanetEditor(ui, editorTheme);
  const loader = new Loader(ui, c.accent, c.dim, "Janet is thinking…");

  ui.addChild(chat);
  ui.addChild(new Spacer(1));
  ui.addChild(editor);
  ui.addChild(status);

  let running = false;
  let loaderMounted = false;
  let pendingApproval: PendingApproval | null = null;
  // One Markdown component per assistant message id, updated as text streams.
  const messageComponents = new Map<string, Markdown>();

  const updateStatus = (): void => {
    const model = session.model.hasSelection() ? session.model.get() : "no model — /model <id>";
    const state = pendingApproval ? "awaiting approval (y/n)" : running ? "working" : "idle";
    status.setText(
      c.dim(`${paths.projectPath}  ·  `) + c.accent(model) + c.dim(`  ·  ${state}`),
    );
    ui.requestRender();
  };

  const addLine = (text: string): void => {
    chat.addChild(new Text(text, 1, 0));
    ui.requestRender();
  };

  const setLoader = (on: boolean): void => {
    if (on && !loaderMounted) {
      chat.addChild(loader);
      loader.start();
      loaderMounted = true;
    } else if (!on && loaderMounted) {
      loader.stop();
      chat.removeChild(loader);
      loaderMounted = false;
    }
    ui.requestRender();
  };

  const onEvent = (event: AgentControllerEvent): void => {
    switch (event.type) {
      case "agent_start":
        running = true;
        setLoader(true);
        updateStatus();
        break;
      case "message_update":
      case "message_end": {
        if (event.message.role !== "assistant") break;
        const text = messageText(event.message);
        if (!text) break;
        let md = messageComponents.get(event.message.id);
        if (!md) {
          md = new Markdown(text, 1, 0, markdownTheme);
          messageComponents.set(event.message.id, md);
          // Keep the loader visually last while streaming.
          if (loaderMounted) chat.removeChild(loader);
          chat.addChild(md);
          if (loaderMounted) chat.addChild(loader);
        } else {
          md.setText(text);
        }
        ui.requestRender();
        break;
      }
      case "tool_start":
        addLine(c.dim(`  ⚙ ${event.toolName}`));
        break;
      case "tool_end":
        if (event.isError) addLine(c.warn(`  ⚠ tool error: ${String(event.result).slice(0, 120)}`));
        break;
      case "tool_approval_required":
        pendingApproval = { toolCallId: event.toolCallId, toolName: event.toolName };
        addLine(
          c.warn(`  Janet wants to run ${c.bold(event.toolName)}.`) +
            c.dim("  Approve? Type y (yes) or n (no) and press enter."),
        );
        updateStatus();
        break;
      case "error": {
        const err = event.error as Error & { responseBody?: string };
        addLine(c.error(`  ✗ ${err?.message || "error"}${err?.responseBody ? ` — ${err.responseBody.slice(0, 200)}` : ""}`));
        break;
      }
      case "model_changed":
        updateStatus();
        break;
      case "agent_end":
        running = false;
        setLoader(false);
        updateStatus();
        break;
    }
  };
  const unsubscribe = session.subscribe(onEvent);

  const shutdown = async (code: number): Promise<never> => {
    unsubscribe();
    ui.stop();
    await controller.destroy().catch(() => {});
    process.exit(code);
  };

  const handleCommand = async (text: string): Promise<void> => {
    const [cmd, ...rest] = text.slice(1).split(/\s+/);
    switch (cmd) {
      case "quit":
      case "exit":
        await shutdown(0);
        break;
      case "help":
        addLine(c.dim(HELP_TEXT));
        break;
      case "model": {
        const id = rest.join(" ").trim();
        if (!id) {
          addLine(c.dim("Usage: /model <provider/id>"));
          break;
        }
        await session.model.switch({ modelId: id });
        addLine(c.dim(`Model set to ${id}.`));
        updateStatus();
        break;
      }
      case "models": {
        addLine(c.dim("Fetching available models…"));
        try {
          const models = await controller.listAvailableModels();
          const withAuth = models.filter((m) => m.hasApiKey);
          const list = (withAuth.length ? withAuth : models).slice(0, 30);
          for (const m of list) {
            addLine(c.dim(`  ${m.hasApiKey ? "●" : "○"} `) + m.id);
          }
          addLine(c.dim("Pick one with /model <id>."));
        } catch (err) {
          addLine(c.error(`  Couldn't list models: ${(err as Error).message}`));
        }
        break;
      }
      default:
        addLine(c.dim(`Unknown command /${cmd}. Try /help.`));
    }
  };

  editor.onSubmit = (raw: string) => {
    const text = raw.trim();
    editor.setText("");
    if (!text) return;

    // Pending tool approval consumes the next submit.
    if (pendingApproval) {
      const approve = /^y(es)?$/i.test(text);
      const decline = /^n(o)?$/i.test(text);
      if (approve || decline) {
        const { toolCallId } = pendingApproval;
        pendingApproval = null;
        addLine(c.dim(approve ? "  ✓ approved" : "  ✗ declined"));
        updateStatus();
        void session.respondToToolApproval({
          decision: approve ? "approve" : "decline",
          toolCallId,
        });
        return;
      }
      addLine(c.dim("  Waiting on the approval — answer y or n first."));
      return;
    }

    if (text.startsWith("/")) {
      void handleCommand(text);
      return;
    }

    addLine(c.user(`❯ ${text}`));
    if (!session.model.hasSelection()) {
      addLine(c.warn("  No model selected. Set one with /model <provider/id> (or JANET_MODEL)."));
      return;
    }
    void session.sendMessage({ content: text }).catch((err: Error) => {
      running = false;
      setLoader(false);
      addLine(c.error(`  ✗ ${err.message}`));
      updateStatus();
    });
  };

  // Double Ctrl+C exits; single clears input or aborts a running turn.
  let lastCtrlC = 0;
  editor.onCtrlC = () => {
    const now = Date.now();
    if (now - lastCtrlC < 800) {
      void shutdown(0);
      return;
    }
    lastCtrlC = now;
    if (running) {
      void session.abort();
      addLine(c.dim("  (aborted — Ctrl+C again to quit)"));
    } else if (editor.getText()) {
      editor.setText("");
      ui.requestRender();
    } else {
      addLine(c.dim("  (Ctrl+C again to quit)"));
    }
  };

  addLine(c.accentBold(GREETING));
  addLine(
    c.dim(
      `Knowledge bundle: ${paths.bundlePath}\n` +
        `Ask me anything in the bundle, or say what to ingest. /help for commands.`,
    ),
  );
  updateStatus();
  ui.start();
  ui.requestRender();

  // The TUI owns the process from here; exit happens via shutdown().
  return await new Promise<number>(() => {});
}
