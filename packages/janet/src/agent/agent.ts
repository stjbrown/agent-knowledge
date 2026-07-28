import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import type { MastraCompositeStore } from "@mastra/core/storage";
import type { Workspace } from "@mastra/core/workspace";
import { PERSONA_INSTRUCTIONS } from "./persona.js";
import { getDynamicModel } from "./model.js";
import { janetPdfSkill } from "../skills/janet-pdf.js";
import { guardPdfWorkspaceRead } from "../tools/pdf-guard.js";
import { createPdfTools } from "../tools/pdf.js";
import { createSkillTurnGuard } from "./turn-guard.js";

export interface JanetAgentOptions {
  storage: MastraCompositeStore;
  /** Workspace providing filesystem/sandbox tools and portable kb-* skills. */
  workspace: Workspace;
  /** Absolute workspace root used to constrain Janet's local PDF tools. */
  projectPath: string;
}

/**
 * Build the Janet agent. Portable kb-* skills come from the workspace, while
 * Janet-only procedures are inline agent skills. Mastra merges both sources,
 * exposes the skill tools, and lists the available metadata in the system
 * message. Instructions layer Janet's persona + guardrail over those
 * procedures.
 */
export function createJanetAgent(opts: JanetAgentOptions): Agent {
  const memory = new Memory({ storage: opts.storage });
  const guardSkillLoader = createSkillTurnGuard();
  const pdfTools = createPdfTools({ projectPath: opts.projectPath });

  return new Agent({
    id: "janet",
    name: "Janet",
    instructions: PERSONA_INSTRUCTIONS,
    model: getDynamicModel,
    memory,
    workspace: opts.workspace,
    skills: [janetPdfSkill],
    tools: pdfTools,
    hooks: {
      beforeToolCall: ({ toolName, input, context }) => {
        const pdfGuard = guardPdfWorkspaceRead(toolName, input);
        if (pdfGuard) return pdfGuard;
        return guardSkillLoader.beforeToolCall(toolName, input, context);
      },
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
