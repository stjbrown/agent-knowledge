/**
 * Janet's interactive TUI — a minimal pi-tui chat.
 *
 * The transcript renders in strict chronological order: each run of assistant
 * text becomes its own markdown block, and a tool line / question / approval
 * "closes" the current block so the next text appears BELOW it (rather than the
 * whole answer streaming at the top while tools pile up underneath).
 *
 * Approvals are governed by the controller's tool-category policy: reads,
 * skills, task bookkeeping, ask_user, and bundle edits never prompt. Execution,
 * MCP, and unknown future tools ask — and the prompt offers "always allow" for
 * the session. Questions with options render as an arrow-key SelectList.
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
  matchesKey,
} from "@earendil-works/pi-tui";
import type { Component, SelectItem } from "@earendil-works/pi-tui";
import type { AgentControllerEvent } from "@mastra/core/agent-controller";
import { bootJanet, type BootOptions } from "../agent/controller.js";
import { messageText } from "../headless/format.js";
import { GREETING } from "../agent/persona.js";
import { getAuthStorage } from "../gateways/oauth/claude-max.js";
import {
  loadSettings,
  completeOnboarding,
  rememberModel,
  rememberObservability,
} from "../onboarding/settings.js";
import { availableModels, normalizeModelSelection } from "../onboarding/providers.js";
import { resolveObservabilityConfig } from "../observability/config.js";
import {
  formatObservabilityStatus,
  safeObservabilityEndpoint,
} from "../observability/runtime.js";
import type {
  ObservabilityCaptureMode,
  ObservabilitySettings,
} from "../observability/types.js";
import { toolActivityLabel, toolErrorLabel } from "./activity.js";
import { createInterruptController, type InterruptResult } from "./interrupt.js";
import { formatTraceTree, traceStatus } from "./traces.js";
import { c, editorTheme, markdownTheme } from "./theme.js";

/** OAuth providers janet can log in to. */
const OAUTH_PROVIDERS = ["anthropic", "openai-codex"] as const;

const HELP_TEXT = `Commands:
  /models                Pick a model from a list (arrow keys)
  /model [provider/id]   Open the picker, or switch directly by id
  /login <provider> [mode]
                         Log in; OpenAI mode is browser or device
  /logout <provider>     Remove stored credentials for a provider
  /auth                  Show which providers are authenticated
  /observability         Configure opt-in tracing
  /traces                Browse recent local traces
  /cancel                Cancel the active run
  /help                  This help
  /quit                  Exit (double Ctrl+C also works)

While Janet is working, Esc or Ctrl+C cancels the active run.
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
  const { controller, session, paths, herdrDetach, observability } = await bootJanet({
    ...opts,
    interactive: true,
  });

  // The interactive approval policy is set deterministically in the controller's
  // initialState (reads/edits/meta never prompt; only execute asks, with an
  // "always allow" option) — see INTERACTIVE_RULES in controller.ts.

  // Model precedence: an already-persisted per-thread selection, else
  // JANET_MODEL, else the global onboarding default. If none, the first-run
  // wizard runs after the UI is up.
  const persistedModel = process.env["JANET_MODEL"] || loadSettings().defaultModelId;
  const presetModel = persistedModel
    ? normalizeModelSelection(persistedModel, availableModels())
    : undefined;
  if (!session.model.hasSelection() && presetModel) {
    await session.model.switch({ modelId: presetModel });
  }

  const terminal = new ProcessTerminal();
  const ui = new TUI(terminal);
  const chat = new Container();
  const status = new Text("", 1, 0);
  const editor = new Editor(ui, editorTheme);
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
  let cancelRequested = false;
  const activeTools = new Map<string, string>();

  const updateStatus = (): void => {
    const model = session.model.hasSelection() ? session.model.get() : "no model — /model <id>";
    const tracing = observability.status.enabled
      ? c.dim(`  ·  trace:${observability.status.capture}`)
      : "";
    const state =
      pendingInput
        ? "enter the requested value"
        : pendingQuestion || activeSelect
          ? "answer Janet's question"
          : pendingApproval
            ? "awaiting approval"
            : cancelRequested
              ? "cancelling"
            : running
              ? "working · Esc/Ctrl+C cancels"
              : "idle";
    status.setText(
      c.dim(`${paths.projectPath}  ·  `) +
        c.accent(model) +
        c.dim(`  ·  ${state}`) +
        tracing,
    );
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
        cancelRequested = false;
        active = null;
        activeTools.clear();
        loader.setMessage("Janet is thinking…");
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
        if (event.toolName !== "ask_user") {
          activeTools.set(event.toolCallId, event.toolName);
          loader.setMessage(toolActivityLabel(event.toolName));
        }
        break;
      case "tool_end":
        activeTools.delete(event.toolCallId);
        loader.setMessage(
          activeTools.size
            ? toolActivityLabel(Array.from(activeTools.values()).at(-1)!)
            : "Janet is thinking…",
        );
        if (event.isError) {
          closeSegment();
          addLine(c.warn(`  ${toolErrorLabel(event.result)}`));
        }
        break;
      case "tool_suspended": {
        closeSegment();
        activeTools.delete(event.toolCallId);
        setLoader(false);
        const payload = event.suspendPayload as {
          question?: string;
          options?: QuestionOption[];
          selectionMode?: string;
        };
        const question = payload?.question ?? `Janet needs input for ${event.toolName}.`;
        const options = payload?.options;
        const multi = payload?.selectionMode === "multi_select";
        addLine(c.accentBold(`  Janet asks: ${question}`));

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
          addLine(c.dim("     Use ↑/↓ and Enter."));
          ui.setFocus(select);
        } else {
          pendingQuestion = { toolCallId: event.toolCallId, options, multi };
          if (options?.length) {
            options.forEach((o, i) =>
              addLine(c.accent(`     ${i + 1}. `) + o.label + (o.description ? c.dim(` — ${o.description}`) : "")),
            );
            addLine(c.dim("     Reply with numbers or labels, then press Enter."));
          } else {
            addLine(c.dim("     Type your answer, then press Enter."));
          }
        }
        updateStatus();
        break;
      }
      case "tool_approval_required":
        closeSegment();
        activeTools.delete(event.toolCallId);
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
          c.error(`  Error: ${err?.message || "unknown"}${err?.responseBody ? ` — ${err.responseBody.slice(0, 200)}` : ""}`),
        );
        break;
      }
      case "model_changed":
        updateStatus();
        break;
      case "agent_end":
        running = false;
        cancelRequested = false;
        activeTools.clear();
        loader.setMessage("Janet is thinking…");
        if (event.reason !== "suspended") pendingQuestion = null;
        setLoader(false);
        updateStatus();
        break;
    }
  };
  const unsubscribe = session.subscribe(onEvent);
  let removeInputListener = (): void => {};
  let sigintHandler: (() => void) | undefined;

  const shutdown = async (code: number): Promise<never> => {
    removeInputListener();
    if (sigintHandler) process.off("SIGINT", sigintHandler);
    unsubscribe();
    herdrDetach();
    ui.stop();
    await observability.flush().catch(() => {});
    await controller.destroy().catch(() => {});
    process.exit(code);
  };

  const notifyInterrupt = (result: Exclude<InterruptResult, "ignored">): void => {
    switch (result) {
      case "cancelled":
        addLine(c.dim("  Cancelling the active run…"));
        break;
      case "cleared":
        break;
      case "exit":
        break;
      case "exit-hint":
        addLine(c.dim("  Press Ctrl+C again to quit."));
        break;
    }
    updateStatus();
  };

  const abortActiveRun = (): void => {
    if (cancelRequested) return;
    cancelRequested = true;
    pendingApproval = null;
    pendingQuestion = null;
    activeTools.clear();
    if (activeSelect) {
      chat.removeChild(activeSelect);
      activeSelect = null;
    }
    ui.setFocus(editor);
    loader.setMessage("Cancelling…");
    session.abort();
  };

  const interrupts = createInterruptController({
    isRunning: () => running,
    hasInput: () => editor.getText().length > 0,
    abortRun: abortActiveRun,
    clearInput: () => {
      editor.setText("");
      ui.requestRender();
    },
    exit: () => {
      void shutdown(0);
    },
    notify: notifyInterrupt,
  });

  // Input listeners run before the focused component, so cancellation works
  // during pickers, approvals, questions, and streamed tool activity.
  removeInputListener = ui.addInputListener((data) => {
    if (matchesKey(data, "ctrl+c")) {
      interrupts.handleCtrlC();
      return { consume: true };
    }
    if (matchesKey(data, "escape") && running) {
      interrupts.handleEscape();
      return { consume: true };
    }
    return undefined;
  });

  // Raw terminals normally deliver Ctrl+C as input. Keep a SIGINT fallback for
  // terminals and supervisors that preserve normal signal handling.
  sigintHandler = () => {
    interrupts.handleCtrlC();
  };
  process.on("SIGINT", sigintHandler);

  // Ask the user for one value; the next editor submit resolves it. Used by the
  // OAuth login flow (paste-code / prompts).
  const promptInput = (message: string, placeholder?: string): Promise<string> => {
    addLine(c.accentBold(`  ${message}`));
    if (placeholder) addLine(c.dim(`  (${placeholder})`));
    return new Promise((resolve) => {
      pendingInput = resolve;
      updateStatus();
    });
  };

  // Interactive model picker: an arrow-key list of models from the providers
  // reachable right now. Selecting one switches the session and persists it as
  // the default. Shared by /models, /model (no arg), and first-run onboarding.
  const showModelPicker = (intro?: string): void => {
    const choices = availableModels();
    if (intro) addLine(c.accentBold(intro));
    if (!choices.length) {
      addLine(c.dim("  No providers are configured yet. Set one up, then try again:"));
      addLine(c.dim("    • Vertex AI:   gcloud auth application-default login  (+ GOOGLE_VERTEX_PROJECT)"));
      addLine(c.dim("    • Anthropic:   set ANTHROPIC_API_KEY, or /login anthropic"));
      addLine(c.dim("    • OpenAI:      set OPENAI_API_KEY, or /login openai-codex"));
      addLine(c.dim("    • Bedrock:     configure AWS credentials"));
      updateStatus();
      return;
    }
    const current = session.model.hasSelection() ? session.model.get() : null;
    addLine(c.dim("  ↑/↓ to move, enter to choose:"));
    const select = new SelectList(
      choices.map((ch) => ({
        value: ch.id,
        label: ch.id === current ? `${ch.label} (current)` : ch.label,
        description: ch.via,
      })),
      Math.min(choices.length, 10),
      editorTheme.selectList,
    );
    select.onSelect = (item: SelectItem) => {
      chat.removeChild(select);
      activeSelect = null;
      ui.setFocus(editor);
      void session.model.switch({ modelId: item.value });
      completeOnboarding(item.value, new Date().toISOString());
      addLine(c.accentBold(`  ✓ Using ${item.value}.`) + c.dim("  (saved as your default)"));
      updateStatus();
    };
    activeSelect = select;
    chat.addChild(select);
    ui.setFocus(select);
    updateStatus();
  };

  const savedObservabilitySummary = (): string => {
    const saved = loadSettings().observability;
    const resolved = resolveObservabilityConfig(saved, {});
    return formatObservabilityStatus({
      enabled: resolved.enabled,
      capture: resolved.capture,
      sampleRate: resolved.sampleRate,
      destinations: [
        ...(resolved.local.enabled ? ["local"] : []),
        ...(resolved.remote
          ? [
              resolved.remote.kind === "phoenix"
                ? `phoenix (${safeObservabilityEndpoint(resolved.remote.endpoint)})`
                : `otlp (${safeObservabilityEndpoint(resolved.remote.endpoint)})`,
            ]
          : []),
      ],
      warnings: resolved.warnings,
    });
  };

  const persistObservability = (settings: ObservabilitySettings): void => {
    rememberObservability(settings);
    addLine(c.accentBold("  ✓ Observability settings saved."));
    addLine(c.dim(`  Saved: ${savedObservabilitySummary()}`));
    addLine(c.dim("  Restart Janet to apply the new setting."));
    updateStatus();
  };

  const closeActiveSelect = (select: SelectList): void => {
    chat.removeChild(select);
    if (activeSelect === select) activeSelect = null;
    ui.setFocus(editor);
  };

  const confirmFullCapture = (
    base: Omit<ObservabilitySettings, "capture">,
  ): void => {
    addLine(
      c.warn(
        "  Full capture includes prompts, responses, and tool payloads. Do not use it with sensitive material.",
      ),
    );
    const select = new SelectList(
      [
        {
          value: "no",
          label: "Keep metadata-only capture",
          description: "Recommended. Content stays out of traces.",
        },
        {
          value: "yes",
          label: "Enable full capture",
          description: "I understand trace content may contain sensitive data.",
        },
      ],
      2,
      editorTheme.selectList,
    );
    select.onSelect = (item: SelectItem) => {
      closeActiveSelect(select);
      persistObservability({
        ...base,
        capture: item.value === "yes" ? "full" : "metadata",
      });
    };
    activeSelect = select;
    chat.addChild(select);
    ui.setFocus(select);
    updateStatus();
  };

  const chooseCaptureMode = (
    base: Omit<ObservabilitySettings, "capture">,
  ): void => {
    addLine(c.accentBold("  What may Janet include in traces?"));
    const select = new SelectList(
      [
        {
          value: "metadata",
          label: "Metadata only",
          description: "Timing, tool names, model, tokens, status, and errors.",
        },
        {
          value: "full",
          label: "Full content",
          description: "Also includes prompts, responses, and tool payloads.",
        },
      ],
      2,
      editorTheme.selectList,
    );
    select.onSelect = (item: SelectItem) => {
      closeActiveSelect(select);
      const capture = item.value as ObservabilityCaptureMode;
      if (capture === "full") {
        confirmFullCapture(base);
      } else {
        persistObservability({ ...base, capture });
      }
    };
    activeSelect = select;
    chat.addChild(select);
    ui.setFocus(select);
    updateStatus();
  };

  const showObservabilityPicker = (): void => {
    if (running) {
      addLine(c.dim("  Cancel the active run before changing observability settings."));
      return;
    }
    addLine(c.accentBold("  Configure observability"));
    addLine(c.dim(`  Active now: ${formatObservabilityStatus(observability.status)}`));
    addLine(c.dim("  Tracing is opt-in and changes apply after restart."));
    const select = new SelectList(
      [
        {
          value: "off",
          label: "Off",
          description: "No spans, trace database, or network export.",
        },
        {
          value: "local",
          label: "Local trace history",
          description: "Store traces in ~/.agent-knowledge/observability.db.",
        },
        {
          value: "phoenix",
          label: "Phoenix",
          description: "Send OTLP traces to http://localhost:6006.",
        },
        {
          value: "otlp",
          label: "Custom OTLP",
          description: "Send OTLP/HTTP protobuf traces to your endpoint.",
        },
      ],
      4,
      editorTheme.selectList,
    );
    select.onSelect = (item: SelectItem) => {
      closeActiveSelect(select);
      if (item.value === "off") {
        persistObservability({
          capture: "off",
          sampleRate: 1,
          local: { enabled: false, retentionDays: 7 },
        });
        return;
      }
      if (item.value === "local") {
        chooseCaptureMode({
          sampleRate: 1,
          local: { enabled: true, retentionDays: 7 },
        });
        return;
      }
      if (item.value === "phoenix") {
        chooseCaptureMode({
          sampleRate: 1,
          local: { enabled: false, retentionDays: 7 },
          remote: {
            kind: "phoenix",
            endpoint: "http://localhost:6006",
            projectName: "janet",
          },
        });
        return;
      }
      void promptInput(
        "OTLP endpoint (for example, http://localhost:4318):",
      ).then((endpoint) => {
        try {
          const parsed = new URL(endpoint);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
          if (parsed.username || parsed.password || parsed.search || parsed.hash) {
            addLine(
              c.error(
                "  Do not put credentials or query parameters in the saved endpoint. Use OTEL_EXPORTER_OTLP_HEADERS.",
              ),
            );
            return;
          }
        } catch {
          addLine(c.error("  Endpoint must be a valid HTTP or HTTPS URL."));
          return;
        }
        chooseCaptureMode({
          sampleRate: 1,
          local: { enabled: false, retentionDays: 7 },
          remote: {
            kind: "otlp",
            endpoint,
          },
        });
      });
    };
    activeSelect = select;
    chat.addChild(select);
    ui.setFocus(select);
    updateStatus();
  };

  const showLocalTraces = async (): Promise<void> => {
    if (running) {
      addLine(c.dim("  Cancel the active run before browsing traces."));
      return;
    }
    if (!observability.config.local.enabled) {
      addLine(c.dim("  Local trace history is not active. Use /observability to enable it."));
      return;
    }
    await observability.flush().catch(() => {});
    const store = await observability.storage.getStore("observability");
    if (!store) {
      addLine(c.error("  Local trace storage is unavailable."));
      return;
    }
    const recent = await store.listTraces({
      pagination: { page: 0, perPage: 10 },
      orderBy: { field: "startedAt", direction: "DESC" },
    });
    if (!recent.spans.length) {
      addLine(c.dim("  No local traces yet."));
      return;
    }

    addLine(c.accentBold("  Recent local traces"));
    const select = new SelectList(
      recent.spans.map((span) => {
        const state = traceStatus(span);
        const marker = state === "error" ? "✗" : state === "running" ? "…" : "✓";
        return {
          value: span.traceId,
          label: `${marker} ${span.name}`,
          description: `${span.startedAt.toLocaleString()} · ${span.traceId}`,
        };
      }),
      Math.min(recent.spans.length, 10),
      editorTheme.selectList,
    );
    select.onSelect = (item: SelectItem) => {
      closeActiveSelect(select);
      void store.getTrace({ traceId: item.value }).then((trace) => {
        if (!trace) {
          addLine(c.error(`  Trace not found: ${item.value}`));
          return;
        }
        addLine(c.accentBold(`  Trace ${trace.traceId}`));
        for (const line of formatTraceTree(trace.spans)) {
          addLine(c.dim(`  ${line}`));
        }
      }).catch((error: Error) => {
        addLine(c.error(`  Could not read trace: ${error.message}`));
      });
    };
    activeSelect = select;
    chat.addChild(select);
    ui.setFocus(select);
    updateStatus();
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
      case "cancel":
        if (interrupts.handleEscape() === "ignored") {
          addLine(c.dim("  No active run to cancel."));
        }
        break;
      case "observability": {
        const action = rest[0]?.trim().toLowerCase();
        if (action === "status") {
          addLine(c.dim(`  Active: ${formatObservabilityStatus(observability.status)}`));
          addLine(c.dim(`  Saved:  ${savedObservabilitySummary()}`));
        } else if (action === "off") {
          persistObservability({
            capture: "off",
            sampleRate: 1,
            local: { enabled: false, retentionDays: 7 },
          });
        } else if (!action) {
          showObservabilityPicker();
        } else {
          addLine(c.dim("Usage: /observability [status | off]"));
        }
        break;
      }
      case "traces":
        await showLocalTraces();
        break;
      case "login": {
        const providerId = (rest[0] || "anthropic").trim();
        if (!(OAUTH_PROVIDERS as readonly string[]).includes(providerId)) {
          addLine(c.dim(`Usage: /login <${OAUTH_PROVIDERS.join(" | ")}>`));
          break;
        }
        const authMode = rest[1]?.trim();
        if (
          authMode &&
          (providerId !== "openai-codex" || !["browser", "device"].includes(authMode))
        ) {
          addLine(c.dim("Usage: /login openai-codex [browser | device]"));
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
            ...(authMode ? { authMode } : {}),
          });
          addLine(c.accentBold(`  ✓ Logged in to ${providerId}.`));
          updateStatus();
        } catch (err) {
          addLine(c.error(`  Login failed: ${(err as Error).message}`));
        } finally {
          // A successful browser callback can win the race with the manual-code
          // prompt. Disarm that abandoned prompt so it cannot consume the next
          // chat message after login completes.
          pendingInput = null;
          updateStatus();
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
        const inputId = rest.join(" ").trim();
        // No id → open the picker; an explicit id still works for power users.
        if (!inputId) {
          showModelPicker();
          break;
        }
        const id = normalizeModelSelection(inputId, availableModels());
        await session.model.switch({ modelId: id });
        completeOnboarding(id, new Date().toISOString());
        rememberModel(id); // so a hand-typed model shows up in the picker next time
        addLine(c.dim(`Model set to ${id}.`));
        updateStatus();
        break;
      }
      case "models":
        showModelPicker();
        break;
      default:
        addLine(c.dim(`Unknown command /${cmd}. Try /help.`));
    }
  };

  editor.onSubmit = (raw: string) => {
    const text = raw.trim();
    editor.setText("");
    if (!text) return;

    // Feed normal prompt input (messages + slash commands) into the editor's
    // built-in up/down history. Skip transient responses — approvals, question
    // answers, and paste-codes shouldn't clutter recall.
    if (!pendingInput && !pendingApproval && !pendingQuestion) {
      editor.addToHistory(text);
    }

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
      showModelPicker("  Pick a model first:");
      return;
    }
    void session.sendMessage({
      content: text,
      tracingOptions: observability.tracingOptionsForTurn({
        interactive: true,
        operation: "chat",
        resourceId: paths.resourceId,
        threadId: session.thread.getId() ?? undefined,
      }),
    }).catch((err: Error) => {
      running = false;
      setLoader(false);
      addLine(c.error(`  ✗ ${err.message}`));
      updateStatus();
    });
  };

  addLine(c.accentBold(GREETING));
  addLine(
    c.dim(
      `Knowledge bundle: ${paths.bundlePath}\n` +
        `Ask me anything in the bundle, or say what to ingest. /help for commands.`,
    ),
  );
  for (const warning of observability.status.warnings) {
    addLine(c.warn(`Observability: ${warning}`));
  }
  updateStatus();
  ui.start();
  ui.setFocus(editor);
  ui.requestRender();

  // First run (no model configured): open the picker to get set up.
  if (!session.model.hasSelection()) showModelPicker("  Let's pick a model to get you started.");

  // The TUI owns the process from here; exit happens via shutdown().
  return await new Promise<number>(() => {});
}
