/**
 * Janet's interactive TUI — a minimal pi-tui chat.
 *
 * The transcript renders in strict chronological order: each run of assistant
 * text becomes its own markdown block, and a tool line / question / approval
 * "closes" the current block so the next text appears BELOW it (rather than the
 * whole answer streaming at the top while tools pile up underneath).
 *
 * Approvals are governed by the controller's tool-category policy: reads,
 * skills, task bookkeeping, ask_user, and bundle edits never prompt; only
 * command execution does — and that prompt offers "always allow" so it's a
 * one-time thing. Questions with options render as an arrow-key SelectList.
 */
import {
  Container,
  Editor,
  Loader,
  Markdown,
  ProcessTerminal,
  SelectList,
  Spacer,
  TUI,
  Text,
} from "@earendil-works/pi-tui";
import type { Component, SelectItem } from "@earendil-works/pi-tui";
import type { AgentControllerEvent } from "@mastra/core/agent-controller";
import { bootJanet, type BootOptions } from "../agent/controller.js";
import { messageText } from "../headless/format.js";
import { GREETING } from "../agent/persona.js";
import { getAuthStorage } from "../gateways/oauth/claude-max.js";
import { loadSettings, completeOnboarding } from "../onboarding/settings.js";
import { availableModels } from "../onboarding/providers.js";
import { c, editorTheme, markdownTheme } from "./theme.js";

/** OAuth providers janet can log in to. */
const OAUTH_PROVIDERS = ["anthropic", "openai-codex"] as const;

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
  /login <provider>      Log in with a subscription (anthropic, openai-codex)
  /logout <provider>     Remove stored credentials for a provider
  /auth                  Show which providers are authenticated
  /help                  This help
  /quit                  Exit (double Ctrl+C also works)

Anything else is a message to Janet.`;

interface PendingApproval {
  toolCallId: string;
  toolName: string;
}

interface QuestionOption {
  label: string;
  description?: string;
}

interface PendingQuestion {
  toolCallId: string;
  options?: QuestionOption[];
  multi: boolean;
}

/** The assistant text block currently being streamed (one segment between tools). */
interface ActiveMessage {
  id: string;
  committedLen: number;
  comp: Markdown | null;
  lastText: string;
}

/** Map a typed answer to ask_user resume data (free-text or multi-select). */
function resolveAnswer(q: PendingQuestion, text: string): string | string[] | undefined {
  if (!q.options?.length) return text;
  const opts = q.options;
  const pick = (token: string): string | undefined => {
    const t = token.trim();
    if (!t) return undefined;
    const n = Number(t);
    if (Number.isInteger(n) && n >= 1 && n <= opts.length) return opts[n - 1]!.label;
    const exact = opts.find((o) => o.label.toLowerCase() === t.toLowerCase());
    if (exact) return exact.label;
    return opts.find((o) => o.label.toLowerCase().startsWith(t.toLowerCase()))?.label;
  };
  if (q.multi) {
    const picks = text.split(",").map(pick);
    return picks.some((p) => p === undefined) ? undefined : (picks as string[]);
  }
  return pick(text);
}

export async function runTui(opts: Omit<BootOptions, "interactive">): Promise<number> {
  const { controller, session, paths, herdrDetach } = await bootJanet({ ...opts, interactive: true });

  // The interactive approval policy is set deterministically in the controller's
  // initialState (reads/edits/meta never prompt; only execute asks, with an
  // "always allow" option) — see INTERACTIVE_RULES in controller.ts.

  // Model precedence: an already-persisted per-thread selection, else
  // JANET_MODEL, else the global onboarding default. If none, the first-run
  // wizard runs after the UI is up.
  const presetModel = process.env["JANET_MODEL"] || loadSettings().defaultModelId;
  if (!session.model.hasSelection() && presetModel) {
    await session.model.switch({ modelId: presetModel });
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
  let pendingQuestion: PendingQuestion | null = null;
  let pendingInput: ((text: string) => void) | null = null;
  let activeSelect: SelectList | null = null;
  let active: ActiveMessage | null = null;

  const updateStatus = (): void => {
    const model = session.model.hasSelection() ? session.model.get() : "no model — /model <id>";
    const state =
      pendingInput
        ? "enter the requested value"
        : pendingQuestion || activeSelect
          ? "answer Janet's question"
          : pendingApproval
            ? "awaiting approval"
            : running
              ? "working"
              : "idle";
    status.setText(c.dim(`${paths.projectPath}  ·  `) + c.accent(model) + c.dim(`  ·  ${state}`));
    ui.requestRender();
  };

  // Keep the spinner (and any focused select) visually last by inserting new
  // content before them.
  const appendToChat = (comp: Component): void => {
    if (loaderMounted) chat.removeChild(loader);
    if (activeSelect) chat.removeChild(activeSelect);
    chat.addChild(comp);
    if (activeSelect) chat.addChild(activeSelect);
    if (loaderMounted) chat.addChild(loader);
    ui.requestRender();
  };

  const addLine = (text: string): void => appendToChat(new Text(text, 1, 0));

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

  // Freeze the current text segment so the next assistant text starts a new
  // block below whatever we're about to insert (a tool line, question, etc.).
  const closeSegment = (): void => {
    if (active) {
      active.committedLen = active.lastText.length;
      active.comp = null;
    }
  };

  const answerQuestion = (resumeData: string | string[], echo: string): void => {
    if (activeSelect) {
      chat.removeChild(activeSelect);
      activeSelect = null;
    }
    const q = pendingQuestion;
    pendingQuestion = null;
    ui.setFocus(editor);
    addLine(c.user(`❯ ${echo}`));
    setLoader(true);
    updateStatus();
    if (q) void session.respondToToolSuspension({ toolCallId: q.toolCallId, resumeData });
  };

  const onEvent = (event: AgentControllerEvent): void => {
    switch (event.type) {
      case "agent_start":
        running = true;
        active = null;
        setLoader(true);
        updateStatus();
        break;
      case "message_update":
      case "message_end": {
        if (event.message.role !== "assistant") break;
        const text = messageText(event.message);
        if (!text) break;
        if (!active || active.id !== event.message.id) {
          active = { id: event.message.id, committedLen: 0, comp: null, lastText: "" };
        }
        active.lastText = text;
        const tail = text.slice(active.committedLen);
        if (!tail) break;
        if (!active.comp) {
          active.comp = new Markdown(tail, 1, 0, markdownTheme);
          appendToChat(active.comp);
        } else {
          active.comp.setText(tail);
          ui.requestRender();
        }
        break;
      }
      case "tool_start":
        closeSegment();
        if (event.toolName !== "ask_user") addLine(c.dim(`  ⚙ ${event.toolName}`));
        break;
      case "tool_end":
        if (event.isError) {
          closeSegment();
          addLine(c.warn(`  ⚠ tool error: ${String(event.result).slice(0, 140)}`));
        }
        break;
      case "tool_suspended": {
        closeSegment();
        setLoader(false);
        const payload = event.suspendPayload as {
          question?: string;
          options?: QuestionOption[];
          selectionMode?: string;
        };
        const question = payload?.question ?? `Janet needs input for ${event.toolName}.`;
        const options = payload?.options;
        const multi = payload?.selectionMode === "multi_select";
        addLine(c.accentBold(`  ❓ ${question}`));

        if (options?.length && !multi) {
          // Arrow-key selection (↑/↓, enter), like a native picker.
          const items: SelectItem[] = options.map((o) => ({
            value: o.label,
            label: o.label,
            ...(o.description ? { description: o.description } : {}),
          }));
          const select = new SelectList(items, Math.min(items.length, 8), editorTheme.selectList);
          select.onSelect = (item: SelectItem) => answerQuestion(item.value, item.label);
          activeSelect = select;
          pendingQuestion = { toolCallId: event.toolCallId, options, multi: false };
          chat.addChild(select);
          addLine(c.dim("     ↑/↓ to move, enter to choose."));
          ui.setFocus(select);
        } else {
          pendingQuestion = { toolCallId: event.toolCallId, options, multi };
          if (options?.length) {
            options.forEach((o, i) =>
              addLine(c.accent(`     ${i + 1}. `) + o.label + (o.description ? c.dim(` — ${o.description}`) : "")),
            );
            addLine(c.dim("     Reply with numbers/labels (comma-separated), then enter."));
          } else {
            addLine(c.dim("     Type your answer and press enter."));
          }
        }
        updateStatus();
        break;
      }
      case "tool_approval_required":
        closeSegment();
        pendingApproval = { toolCallId: event.toolCallId, toolName: event.toolName };
        addLine(
          c.warn(`  Janet wants to run ${c.bold(event.toolName)}.`) +
            c.dim("  y = yes · n = no · a = always allow this kind"),
        );
        updateStatus();
        break;
      case "error": {
        closeSegment();
        const err = event.error as Error & { responseBody?: string };
        addLine(
          c.error(`  ✗ ${err?.message || "error"}${err?.responseBody ? ` — ${err.responseBody.slice(0, 200)}` : ""}`),
        );
        break;
      }
      case "model_changed":
        updateStatus();
        break;
      case "agent_end":
        running = false;
        if (event.reason !== "suspended") pendingQuestion = null;
        setLoader(false);
        updateStatus();
        break;
    }
  };
  const unsubscribe = session.subscribe(onEvent);

  const shutdown = async (code: number): Promise<never> => {
    unsubscribe();
    herdrDetach();
    ui.stop();
    await controller.destroy().catch(() => {});
    process.exit(code);
  };

  // Ask the user for one value; the next editor submit resolves it. Used by the
  // OAuth login flow (paste-code / prompts).
  const promptInput = (message: string, placeholder?: string): Promise<string> => {
    addLine(c.accentBold(`  ${message}`));
    if (placeholder) addLine(c.dim(`  (${placeholder})`));
    updateStatus();
    return new Promise((resolve) => {
      pendingInput = resolve;
    });
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
      case "login": {
        const providerId = (rest[0] || "anthropic").trim();
        if (!(OAUTH_PROVIDERS as readonly string[]).includes(providerId)) {
          addLine(c.dim(`Usage: /login <${OAUTH_PROVIDERS.join(" | ")}>`));
          break;
        }
        addLine(c.dim(`Starting ${providerId} login…`));
        try {
          await getAuthStorage().login(providerId, {
            onAuth: (info) => {
              addLine(c.accent("  Open this URL in your browser to authorize:"));
              addLine("  " + info.url);
              if (info.instructions) addLine(c.dim("  " + info.instructions));
            },
            onProgress: (m) => addLine(c.dim("  " + m)),
            onManualCodeInput: () => promptInput("Paste the code shown after you authorize:"),
            onPrompt: (p) => promptInput(p.message, p.placeholder),
          });
          addLine(c.accentBold(`  ✓ Logged in to ${providerId}.`));
          updateStatus();
        } catch (err) {
          addLine(c.error(`  Login failed: ${(err as Error).message}`));
        }
        break;
      }
      case "logout": {
        const providerId = rest[0]?.trim();
        if (!providerId) {
          addLine(c.dim(`Usage: /logout <${OAUTH_PROVIDERS.join(" | ")}>`));
          break;
        }
        const storage = getAuthStorage();
        storage.logout(providerId); // OAuth credential
        storage.remove(`apikey:${providerId}`); // stored API key slot, if any
        addLine(c.dim(`Logged out of ${providerId}.`));
        break;
      }
      case "auth": {
        const storage = getAuthStorage();
        storage.reload();
        const providers = storage.list();
        if (!providers.length) {
          addLine(c.dim("No stored credentials. Use /login <provider>, or set an API key env var"));
          addLine(c.dim("(ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_VERTEX_PROJECT, AWS_*)."));
        } else {
          for (const p of providers) {
            const cred = storage.get(p);
            addLine(c.dim(`  ${p}: `) + (cred?.type === "oauth" ? c.accent("OAuth (subscription)") : "API key"));
          }
        }
        break;
      }
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
          for (const m of (withAuth.length ? withAuth : models).slice(0, 30)) {
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

    // A requested value (e.g. an OAuth paste-code) consumes the next submit.
    // Don't echo it verbatim — it may be a credential.
    if (pendingInput) {
      const resolve = pendingInput;
      pendingInput = null;
      addLine(c.dim("  ❯ (value entered)"));
      updateStatus();
      resolve(text);
      return;
    }

    // A typed question (free-text or multi-select) consumes the next submit.
    if (pendingQuestion && !activeSelect) {
      const resumeData = resolveAnswer(pendingQuestion, text);
      if (resumeData === undefined) {
        addLine(c.dim("  Didn't match an option — reply with a number or an exact label."));
        return;
      }
      answerQuestion(resumeData, Array.isArray(resumeData) ? resumeData.join(", ") : resumeData);
      return;
    }

    // Pending tool approval: y / n / a (always allow this category).
    if (pendingApproval) {
      const approve = /^y(es)?$/i.test(text);
      const decline = /^n(o)?$/i.test(text);
      const always = /^a(lways)?$/i.test(text);
      if (approve || decline || always) {
        const { toolCallId } = pendingApproval;
        pendingApproval = null;
        addLine(c.dim(always ? "  ✓ always allowed" : approve ? "  ✓ approved" : "  ✗ declined"));
        updateStatus();
        void session.respondToToolApproval({
          decision: always ? "always_allow_category" : approve ? "approve" : "decline",
          toolCallId,
        });
        return;
      }
      addLine(c.dim("  Answer y (yes), n (no), or a (always allow) first."));
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

  // First-run onboarding: no model configured → help the user pick one from the
  // providers that are actually reachable, and persist the choice globally.
  const runOnboarding = (): void => {
    const choices = availableModels();
    addLine(c.accentBold("  Let's pick a model to get you started."));
    if (!choices.length) {
      addLine(c.dim("  No providers are configured yet. Set one up, then use /model:"));
      addLine(c.dim("    • Vertex AI:   gcloud auth application-default login  (+ GOOGLE_VERTEX_PROJECT)"));
      addLine(c.dim("    • Anthropic:   set ANTHROPIC_API_KEY, or /login anthropic"));
      addLine(c.dim("    • OpenAI:      set OPENAI_API_KEY, or /login openai-codex"));
      addLine(c.dim("    • Bedrock:     configure AWS credentials"));
      updateStatus();
      return;
    }
    addLine(c.dim("  ↑/↓ to move, enter to choose:"));
    const select = new SelectList(
      choices.map((ch) => ({ value: ch.id, label: ch.label, description: ch.via })),
      Math.min(choices.length, 8),
      editorTheme.selectList,
    );
    select.onSelect = (item: SelectItem) => {
      chat.removeChild(select);
      activeSelect = null;
      ui.setFocus(editor);
      void session.model.switch({ modelId: item.value });
      completeOnboarding(item.value, new Date().toISOString());
      addLine(c.accentBold(`  ✓ Using ${item.value}.`) + c.dim("  Change it anytime with /model."));
      updateStatus();
    };
    activeSelect = select;
    chat.addChild(select);
    ui.setFocus(select);
    updateStatus();
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
  ui.setFocus(editor);
  ui.requestRender();

  if (!session.model.hasSelection()) runOnboarding();

  // The TUI owns the process from here; exit happens via shutdown().
  return await new Promise<number>(() => {});
}
