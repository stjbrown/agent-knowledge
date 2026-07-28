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
import type { Memory } from "@mastra/memory";
import { bootJanet, type BootOptions } from "../agent/controller.js";
import { messageText } from "../headless/format.js";
import { GREETING } from "../agent/persona.js";
import { getAuthStorage } from "../gateways/oauth/claude-max.js";
import {
  completeOnboarding,
  loadSettings,
  rememberModel,
  rememberObservability,
} from "../onboarding/settings.js";
import {
  NATIVE_PROVIDER_DEFINITIONS,
  availableModels,
  discoverAvailableModels,
  groupModelsByProvider,
  normalizeModelSelection,
  type ModelChoice,
  type ProviderModelGroup,
} from "../onboarding/providers.js";
import { resolveObservabilityConfig } from "../observability/config.js";
import {
  formatObservabilityStatus,
  safeObservabilityEndpoint,
} from "../observability/runtime.js";
import type {
  ObservabilityCaptureMode,
  ObservabilitySettings,
} from "../observability/types.js";
import { compactConversation } from "../memory/compact.js";
import { toolActivityLabel, toolErrorLabel } from "./activity.js";
import { createInterruptController, type InterruptResult } from "./interrupt.js";
import { MultiSelectList } from "./multi-select.js";
import { clearConversation } from "./thread.js";
import { formatTraceTree, traceStatus } from "./traces.js";
import { c, editorTheme, markdownTheme } from "./theme.js";

/** OAuth providers janet can log in to. */
const OAUTH_PROVIDERS = ["anthropic", "openai-codex"] as const;

const HELP_TEXT = `Commands:
  /models                Pick one or more providers, then a model
  /model [provider/id]   Open the picker, or switch directly by id
  /providers             Browse provider status and setup
  /login <provider> [mode]
                         Log in; OpenAI mode is browser or device
  /logout <provider>     Remove stored credentials for a provider
  /auth                  Show which providers are authenticated
  /observability         Configure opt-in tracing
  /traces                Browse recent local traces
  /compact               Flush this conversation into Observational Memory
  /clear                 Start a blank conversation (keeps the old thread)
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

type OMWindows = Extract<
  AgentControllerEvent,
  { type: "om_status" }
>["windows"];

function shortTokens(tokens: number): string {
  if (tokens < 1_000) return String(Math.max(0, Math.round(tokens)));
  const thousands = tokens / 1_000;
  return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1)}k`;
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
  let activeSelect: SelectList | MultiSelectList | null = null;
  let active: ActiveMessage | null = null;
  let cancelRequested = false;
  let modelPickerLoading = false;
  let compacting = false;
  let omWindows: OMWindows | null = null;
  let omActivity: "observing" | "reflecting" | null = null;
  const activeTools = new Map<string, string>();

  const updateStatus = (): void => {
    const model = session.model.hasSelection() ? session.model.get() : "no model — /model <id>";
    const tracing = observability.status.enabled
      ? c.dim(`  ·  trace:${observability.status.capture}`)
      : "";
    const memory = omWindows
      ? c.dim(
          `  ·  mem:${shortTokens(
            omWindows.active.messages.tokens +
              omWindows.active.observations.tokens,
          )}/${shortTokens(
            omWindows.active.messages.threshold +
              omWindows.active.observations.threshold,
          )}`,
        )
      : "";
    const state =
      pendingInput
        ? "enter the requested value"
        : compacting
          ? "compacting memory"
          : omActivity
            ? `${omActivity} memory`
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
        memory +
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
          select.onCancel = () => {
            closeActiveSelect(select);
            addLine(c.dim("     Picker closed. Type your answer instead."));
            updateStatus();
          };
          activeSelect = select;
          pendingQuestion = { toolCallId: event.toolCallId, options, multi: false };
          chat.addChild(select);
          addLine(c.dim("     Use ↑/↓ and Enter · Esc to close."));
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
      case "om_status":
        omWindows = event.windows;
        updateStatus();
        break;
      case "om_buffering_start":
        omActivity =
          event.operationType === "reflection" ? "reflecting" : "observing";
        updateStatus();
        break;
      case "om_observation_start":
      case "om_reflection_start":
        omActivity =
          event.type === "om_reflection_start" ||
          event.operationType === "reflection"
            ? "reflecting"
            : "observing";
        updateStatus();
        break;
      case "om_buffering_end":
      case "om_observation_end":
      case "om_reflection_end":
        omActivity = null;
        updateStatus();
        break;
      case "om_buffering_failed":
      case "om_observation_failed":
      case "om_reflection_failed":
        omActivity = null;
        closeSegment();
        addLine(
          c.warn(
            `  Memory ${
              event.type === "om_buffering_failed"
                ? `${event.operationType} buffering`
                : event.type === "om_reflection_failed"
                  ? "reflection"
                  : "observation"
            } failed: ${event.error}`,
          ),
        );
        updateStatus();
        break;
      case "om_activation":
        omActivity = null;
        closeSegment();
        addLine(
          c.dim(
            `  Memory compacted ${shortTokens(event.tokensActivated)} into ` +
              `${shortTokens(event.observationTokens)} observation tokens.`,
          ),
        );
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
    // A focused picker owns Escape, even when it represents a suspended
    // in-flight question. Ctrl+C remains the explicit "cancel the run" path.
    if (matchesKey(data, "escape") && activeSelect) {
      return undefined;
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

  const closeActiveSelect = (
    select: SelectList | MultiSelectList,
  ): void => {
    chat.removeChild(select);
    if (activeSelect === select) activeSelect = null;
    ui.setFocus(editor);
  };

  const selectModel = async (modelId: string): Promise<void> => {
    try {
      await session.model.switch({ modelId });
      completeOnboarding(modelId, new Date().toISOString());
      rememberModel(modelId);
      addLine(c.accentBold(`  ✓ Using ${modelId}.`) + c.dim("  (saved as your default)"));
    } catch (error) {
      addLine(c.error(`  Could not select ${modelId}: ${(error as Error).message}`));
    } finally {
      updateStatus();
    }
  };

  const showProviderModels = (
    groups: ProviderModelGroup[],
    allChoices: ModelChoice[],
  ): void => {
    const current = session.model.hasSelection() ? session.model.get() : null;
    const available = groups.flatMap((group) =>
      group.models.map((choice) => ({ choice, group })),
    );
    const currentChoice = available.find(({ choice }) => choice.id === current);
    const ordered = currentChoice
      ? [currentChoice, ...available.filter(({ choice }) => choice.id !== current)]
      : available;
    // Large gateways can expose hundreds of models. Keep the arrow list useful
    // and always offer an exact model-id entry path.
    const visible = ordered.slice(0, 29);
    const items: SelectItem[] = visible.map(({ choice, group }) => ({
      value: choice.id,
      label:
        groups.length > 1
          ? `${group.label}: ${choice.label}${choice.id === current ? " (current)" : ""}`
          : `${choice.label}${choice.id === current ? " (current)" : ""}`,
      description: choice.id,
    }));
    items.push({
      value: "__janet_enter_model_id__",
      label: "Enter another model ID…",
      description:
        ordered.length > visible.length
          ? `${ordered.length - visible.length} more catalog models; enter the exact id`
          : groups.length === 1
            ? `Use any ${groups[0]!.id}/model supported by Mastra`
            : "Use any provider/model supported by Mastra",
    });

    addLine(
      c.accentBold(
        groups.length === 1
          ? `  ${groups[0]!.label} models`
          : `  Models from ${groups.length} providers`,
      ),
    );
    addLine(c.dim("  ↑/↓ to move · Enter to choose · Esc to go back:"));
    const select = new SelectList(
      items,
      Math.min(items.length, 10),
      editorTheme.selectList,
    );
    select.onSelect = (item: SelectItem) => {
      closeActiveSelect(select);
      if (item.value === "__janet_enter_model_id__") {
        void promptInput(
          groups.length === 1
            ? `Model id for ${groups[0]!.label}:`
            : "Full model id:",
          groups.length === 1
            ? `${groups[0]!.id}/model-name`
            : "provider/model-name",
        ).then((input) => {
          const modelId =
            groups.length === 1 && !input.includes("/")
              ? `${groups[0]!.id}/${input}`
              : normalizeModelSelection(
                  input,
                  available.map(({ choice }) => choice),
                );
          void selectModel(modelId);
        });
        return;
      }
      void selectModel(item.value);
    };
    select.onCancel = () => {
      closeActiveSelect(select);
      showProviderPicker(allChoices);
    };
    activeSelect = select;
    chat.addChild(select);
    ui.setFocus(select);
    updateStatus();
  };

  const showProviderPicker = (choices: ModelChoice[]): void => {
    const groups = groupModelsByProvider(choices);
    if (!groups.length) {
      addLine(c.dim("  No providers are configured yet. Set one up, then try again:"));
      addLine(c.dim("    • Vertex AI:   gcloud auth application-default login  (+ GOOGLE_VERTEX_PROJECT)"));
      addLine(c.dim("    • Anthropic:   set ANTHROPIC_API_KEY, or /login anthropic"));
      addLine(c.dim("    • OpenAI:      set OPENAI_API_KEY, or /login openai-codex"));
      addLine(c.dim("    • Bedrock:     configure AWS credentials"));
      addLine(c.dim("    • More:        /providers lists native Mastra environment variables"));
      updateStatus();
      return;
    }

    addLine(
      c.dim(
        "  ↑/↓ to move · Space to toggle · Enter to view models · Esc to close:",
      ),
    );
    const select = new MultiSelectList(
      groups.map((group) => ({
        value: group.id,
        label: group.label,
        description: `${group.models.length} model${group.models.length === 1 ? "" : "s"} · ${group.via}`,
      })),
      Math.min(groups.length, 10),
      editorTheme.selectList,
      groups.map((group) => group.id),
    );
    select.onConfirm = (items: SelectItem[]) => {
      if (!items.length) {
        addLine(c.warn("  Select at least one provider."));
        return;
      }
      closeActiveSelect(select);
      const selectedIds = new Set(items.map((item) => item.value));
      showProviderModels(
        groups.filter((group) => selectedIds.has(group.id)),
        choices,
      );
    };
    select.onCancel = () => closeActiveSelect(select);
    activeSelect = select;
    chat.addChild(select);
    ui.setFocus(select);
    updateStatus();
  };

  // Mastra supplies the native provider catalog and auth status. Janet layers
  // its ADC/AWS/OAuth choices over that catalog and retains local fallbacks for
  // offline startup.
  const showModelPicker = (intro?: string): void => {
    if (modelPickerLoading) {
      addLine(c.dim("  The provider catalog is already loading."));
      return;
    }
    if (intro) addLine(c.accentBold(intro));
    addLine(c.dim("  Loading configured providers…"));
    modelPickerLoading = true;
    updateStatus();
    void discoverAvailableModels(() => controller.listAvailableModels())
      .then(showProviderPicker)
      .catch((error: Error) => {
        addLine(c.error(`  Could not load providers: ${error.message}`));
        showProviderPicker(availableModels());
      })
      .finally(() => {
        modelPickerLoading = false;
        updateStatus();
      });
  };

  const showProviders = (): void => {
    if (running) {
      addLine(c.dim("  Cancel the active run before opening provider setup."));
      return;
    }
    addLine(c.accentBold("  Model providers"));
    addLine(c.dim("  Loading provider status…"));
    void discoverAvailableModels(() => controller.listAvailableModels()).then((choices) => {
      const groups = groupModelsByProvider(choices);
      const groupsById = new Map(groups.map((group) => [group.id, group]));
      const known = [
        {
          id: "vertex",
          label: "Google Vertex AI",
          setup: "Run gcloud auth application-default login and set GOOGLE_VERTEX_PROJECT.",
        },
        {
          id: "amazon-bedrock",
          label: "Amazon Bedrock",
          setup: "Configure an AWS credential chain and region.",
        },
        ...NATIVE_PROVIDER_DEFINITIONS.map((provider) => ({
          id: provider.id,
          label: provider.label,
          setup: `Set ${provider.envVars.join(" or ")}.`,
        })),
      ];
      const knownIds = new Set(known.map((provider) => provider.id));
      const providers = [
        ...known,
        ...groups
          .filter((group) => !knownIds.has(group.id))
          .map((group) => ({
            id: group.id,
            label: group.label,
            setup: "This provider was discovered through Mastra.",
          })),
      ];

      addLine(
        c.dim(
          "  ↑/↓ to move · Space to select providers · Enter for details · Esc to close:",
        ),
      );
      const select = new MultiSelectList(
        providers.map((provider) => {
          const group = groupsById.get(provider.id);
          return {
            value: provider.id,
            label: provider.label,
            description: group ? `Ready · ${group.via}` : provider.setup,
          };
        }),
        Math.min(providers.length, 12),
        editorTheme.selectList,
      );
      select.onConfirm = (items: SelectItem[]) => {
        if (!items.length) {
          addLine(c.warn("  Select at least one provider, or press Esc to close."));
          return;
        }
        closeActiveSelect(select);
        addLine(c.accentBold("  Provider details"));
        for (const item of items) {
          const provider = providers.find((candidate) => candidate.id === item.value);
          const group = groupsById.get(item.value);
          if (!provider) continue;
          if (group) {
            addLine(
              c.accent(`  ✓ ${provider.label}`) +
                c.dim(` — ready via ${group.via}`),
            );
            continue;
          }
          addLine(c.bold(`  ${provider.label}`) + c.dim(` — ${provider.setup}`));
          if (provider.id === "anthropic") {
            addLine(c.dim("    Or use /login anthropic for a Claude subscription."));
          } else if (provider.id === "openai") {
            addLine(c.dim("    Or use /login openai-codex for a ChatGPT subscription."));
          }
        }
        addLine(c.dim("  Reopen /providers at any time; /models shows providers ready now."));
        updateStatus();
      };
      select.onCancel = () => closeActiveSelect(select);
      activeSelect = select;
      chat.addChild(select);
      ui.setFocus(select);
      updateStatus();
    }).catch((error: Error) => {
      addLine(c.error(`  Could not load provider status: ${error.message}`));
      updateStatus();
    });
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

  const confirmFullCapture = (
    base: Omit<ObservabilitySettings, "capture">,
  ): void => {
    addLine(
      c.warn(
        "  Full capture includes prompts, responses, and tool payloads. Do not use it with sensitive material.",
      ),
    );
    addLine(c.dim("  ↑/↓ to move · Enter to choose · Esc to go back:"));
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
    select.onCancel = () => {
      closeActiveSelect(select);
      chooseCaptureMode(base);
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
    addLine(c.dim("  ↑/↓ to move · Enter to choose · Esc to go back:"));
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
    select.onCancel = () => {
      closeActiveSelect(select);
      showObservabilityPicker();
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
    addLine(c.dim("  ↑/↓ to move · Enter to choose · Esc to close:"));
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
    select.onCancel = () => closeActiveSelect(select);
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
    addLine(c.dim("  ↑/↓ to move · Enter to open · Esc to close:"));
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
    select.onCancel = () => closeActiveSelect(select);
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
      case "clear":
        if (running || compacting) {
          addLine(c.dim("  Wait for the active work to finish before clearing the conversation."));
          break;
        }
        try {
          await clearConversation(session.thread);
          active = null;
          activeTools.clear();
          omWindows = null;
          omActivity = null;
          chat.clear();
          addLine(c.accentBold(GREETING));
          addLine(c.accentBold("  ✓ Conversation cleared."));
          addLine(c.dim(`  Knowledge bundle: ${paths.bundlePath}`));
          addLine(c.dim("  The previous conversation is still saved as a separate thread."));
        } catch (error) {
          addLine(c.error(`  Could not clear the conversation: ${(error as Error).message}`));
        } finally {
          updateStatus();
        }
        break;
      case "compact": {
        if (running || compacting) {
          addLine(c.dim("  Wait for the active work to finish before compacting memory."));
          break;
        }
        if (!session.model.hasSelection()) {
          addLine(c.dim("  Pick a model before compacting memory."));
          break;
        }
        const threadId = session.thread.getId();
        if (!threadId) {
          addLine(c.dim("  There is no active conversation to compact."));
          break;
        }

        compacting = true;
        loader.setMessage("Janet is compacting memory…");
        setLoader(true);
        updateStatus();
        try {
          const requestContext = await session.machinery.buildRequestContext();
          const agent = controller.getCurrentAgent(session);
          const memory = await agent.getMemory({ requestContext });
          if (!memory) throw new Error("Janet memory is unavailable.");
          const result = await compactConversation({
            memory: memory as Memory,
            agent,
            threadId,
            resourceId: session.identity.getResourceId(),
            requestContext,
          });
          if (!result.buffered && !result.activated && !result.reflected) {
            addLine(c.dim("  Memory is already compact."));
          } else {
            const reflected = result.reflected ? " and reflected" : "";
            addLine(
              c.accentBold(
                `  ✓ Compacted ~${result.pendingTokensBefore.toLocaleString()} message tokens into ` +
                  `~${result.observationTokens.toLocaleString()} memory tokens${reflected}.`,
              ),
            );
            addLine(c.dim("  Raw messages remain available to Janet through memory recall."));
          }
        } catch (error) {
          addLine(c.error(`  Could not compact memory: ${(error as Error).message}`));
        } finally {
          compacting = false;
          loader.setMessage("Janet is thinking…");
          setLoader(false);
          updateStatus();
        }
        break;
      }
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
        await selectModel(id);
        break;
      }
      case "models":
        showModelPicker();
        break;
      case "providers":
        showProviders();
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

    if (compacting) {
      addLine(c.dim("  Janet is still compacting memory; try again in a moment."));
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
