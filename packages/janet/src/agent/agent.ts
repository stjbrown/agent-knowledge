import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import type { MastraCompositeStore } from "@mastra/core/storage";
import type { Workspace } from "@mastra/core/workspace";
import { PERSONA_INSTRUCTIONS } from "./persona.js";
import { getDynamicModel } from "./model.js";

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
  return new Agent({
    id: "janet",
    name: "Janet",
    instructions: PERSONA_INSTRUCTIONS,
    model: getDynamicModel,
    memory,
    workspace: opts.workspace,
    // Backstop against runaway loops. Real ingests do heavy work in scripts
    // (few tool calls), so this is generous — it only trips on a genuine spin.
    defaultOptions: { maxSteps: 60 },
  });
}
