export type InterruptResult =
  | "cancelled"
  | "cleared"
  | "exit"
  | "exit-hint"
  | "ignored";

export interface InterruptActions {
  isRunning(): boolean;
  hasInput(): boolean;
  abortRun(): void;
  clearInput(): void;
  exit(): void;
  notify(result: Exclude<InterruptResult, "ignored">): void;
}

export interface InterruptController {
  handleCtrlC(): InterruptResult;
  handleEscape(): InterruptResult;
}

/**
 * Centralize Janet's interrupt behavior so it works independently of whichever
 * TUI component currently owns keyboard focus.
 */
export function createInterruptController(
  actions: InterruptActions,
  options: {
    doublePressMs?: number;
    now?: () => number;
  } = {},
): InterruptController {
  const doublePressMs = options.doublePressMs ?? 800;
  const now = options.now ?? Date.now;
  let lastCtrlC: number | undefined;

  const cancelRun = (): InterruptResult => {
    if (!actions.isRunning()) return "ignored";
    actions.abortRun();
    actions.notify("cancelled");
    return "cancelled";
  };

  return {
    handleCtrlC(): InterruptResult {
      const pressedAt = now();
      if (lastCtrlC !== undefined && pressedAt - lastCtrlC < doublePressMs) {
        actions.notify("exit");
        actions.exit();
        return "exit";
      }
      lastCtrlC = pressedAt;

      const cancelled = cancelRun();
      if (cancelled !== "ignored") return cancelled;

      if (actions.hasInput()) {
        actions.clearInput();
        actions.notify("cleared");
        return "cleared";
      }

      actions.notify("exit-hint");
      return "exit-hint";
    },

    handleEscape(): InterruptResult {
      return cancelRun();
    },
  };
}
