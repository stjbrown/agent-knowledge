import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import type { MastraCompositeStore } from "@mastra/core/storage";
import type { Workspace } from "@mastra/core/workspace";
import { PERSONA_INSTRUCTIONS } from "./persona.js";
import { getDynamicModel } from "./model.js";
import { createSkillTurnGuard } from "./turn-guard.js";

export interface JanetAgentOptions {
  storage: MastraCompositeStore;
  /** The workspace providing filesystem/sandbox tools AND the kb-* skills. */
  workspace: Workspace;
}

/**
 * Build the Janet agent. The workspace carries the kb-* skills (mounted at a
 * workspace-relative path — see skills-paths.ts), which gives the agent the
 * `skill` / `skill_read` / `skill_search` tools automatically and lists the
 * skills in its system message. Instructions layer Janet's persona + guardrail
 * over the procedures the skills define.
 */
export function createJanetAgent(opts: JanetAgentOptions): Agent {
  const memory = new Memory({ storage: opts.storage });
  const guardSkillLoader = createSkillTurnGuard();

  return new Agent({
    id: "janet",
    name: "Janet",
    instructions: PERSONA_INSTRUCTIONS,
    model: getDynamicModel,
    memory,
    workspace: opts.workspace,
    hooks: {
      beforeToolCall: ({ toolName, input, context }) =>
        guardSkillLoader.beforeToolCall(toolName, input, context),
      afterToolCall: ({ toolName, input, context, error }) =>
        guardSkillLoader.afterToolCall(toolName, input, context, error),
    },
    // Backstop against runaway loops. Real ingests do heavy work in scripts
    // (few tool calls), so the step ceiling remains generous. The hook above
    // prevents a loaded procedure from being fetched repeatedly without
    // mutating Mastra's active tool list between steps.
    defaultOptions: {
      maxSteps: 60,
    },
  });
}
