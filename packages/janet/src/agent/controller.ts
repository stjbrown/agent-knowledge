import { AgentController } from "@mastra/core/agent-controller";
import type { AgentControllerMode } from "@mastra/core/agent-controller";
import { z } from "zod";
import { createJanetAgent } from "./agent.js";
import { createStorage } from "./storage.js";
import { createWorkspace } from "./workspace.js";
import { ensureSkillLinks } from "./skills-paths.js";
import { resolveProjectPaths, type ProjectPaths } from "./paths.js";
import { createVertexGateway } from "../gateways/vertex.js";
import { createBedrockGateway } from "../gateways/bedrock.js";
import { JANET_ALWAYS_ALLOW_TOOL_RULES, janetToolCategory } from "./permissions.js";
import { attachHerdrReporter } from "../herdr/reporter.js";

export interface BootOptions {
  /** Working dir override (-C/--dir). Defaults to process.cwd(). */
  dir?: string;
  /** Bundle location override (--bundle). Defaults to <dir>/knowledge. */
  bundle?: string;
  /** Interactive sessions can ask for approval; headless sessions fail closed. */
  interactive: boolean;
  /** Existing thread to hydrate and resume. */
  threadId?: string;
  /** Permit workspace edit tools in a headless session. */
  allowHeadlessEdits?: boolean;
  /** Permit shell execution in a headless session (explicit opt-in only). */
  allowHeadlessExec?: boolean;
}

export interface JanetSessionBoot {
  controller: AgentController<JanetState>;
  session: Awaited<ReturnType<AgentController<JanetState>["createSession"]>>;
  paths: ProjectPaths;
  /** Detach the Herdr reporter and release the agent from the pane (no-op outside Herdr). */
  herdrDetach: () => void;
}

const policy = z.enum(["allow", "ask", "deny"]);
const permissionRules = z.object({
  categories: z.record(z.string(), policy),
  tools: z.record(z.string(), policy),
});

const stateSchema = z.object({
  projectPath: z.string(),
  bundlePath: z.string(),
  configDir: z.string(),
  // Core's approval gate reads `state.yolo === true`; Janet keeps it false and
  // uses explicit per-category policies so headless operation can fail closed.
  yolo: z.boolean(),
  // Tool-approval rules by category/tool. Must be in the schema or session state
  // strips it, and setForCategory / getRules silently no-op.
  permissionRules: permissionRules.optional(),
});

export type JanetState = z.infer<typeof stateSchema>;

const MODES: AgentControllerMode[] = [{ id: "build", name: "Build" }];

// Interactive approval policy: normal reads and edits are quiet, while execution,
// MCP, and unknown future tools ask. Headless gets an explicit fail-closed policy
// from `permissionRulesFor` and never relies on yolo.
const INTERACTIVE_RULES = {
  categories: { read: "allow", edit: "allow", other: "ask", mcp: "ask", execute: "ask" },
  tools: { ...JANET_ALWAYS_ALLOW_TOOL_RULES },
} as const;

export function permissionRulesFor(opts: BootOptions) {
  if (opts.interactive) return INTERACTIVE_RULES;
  return {
    categories: {
      read: "allow",
      edit: opts.allowHeadlessEdits ? "allow" : "deny",
      execute: opts.allowHeadlessExec ? "allow" : "deny",
      mcp: "deny",
      other: "deny",
    },
    tools: { ...JANET_ALWAYS_ALLOW_TOOL_RULES },
  } as const;
}

export async function resumeThread(
  session: { thread: { switch: (args: { threadId: string }) => Promise<void> } },
  threadId?: string,
): Promise<void> {
  if (threadId) await session.thread.switch({ threadId });
}

/**
 * Build and initialize the AgentController, then mint the single per-process
 * session scoped to this project. Mirrors the minimal viable subset of
 * mastracode's `bootLocalAgentController` (no startWorkers, no pubsub, no
 * observability, no subagents/MCP/hooks/plugins).
 */
export async function bootJanet(opts: BootOptions): Promise<JanetSessionBoot> {
  const paths = resolveProjectPaths({ dir: opts.dir, bundle: opts.bundle });
  const storage = createStorage(paths.globalConfigDir);

  // Symlink the bundled kb-* skills into <project>/.agent-knowledge/skills so
  // the workspace can reference them by a RELATIVE path (Mastra requirement).
  const skills = ensureSkillLinks(paths.projectPath);

  // One workspace instance, shared by the agent and the controller.
  const workspace = createWorkspace({
    projectPath: paths.projectPath,
    skills,
  });
  const agent = createJanetAgent({ storage, workspace });

  const controller = new AgentController<JanetState>({
    id: "agent-knowledge",
    resourceId: paths.resourceId,
    storage,
    agent,
    stateSchema,
    modes: MODES,
    defaultModeId: "build",
    gateways: [createVertexGateway(), createBedrockGateway()],
    toolCategoryResolver: janetToolCategory,
    initialState: {
      projectPath: paths.projectPath,
      bundlePath: paths.bundlePath,
      configDir: paths.globalConfigDir,
      yolo: false,
      permissionRules: permissionRulesFor(opts),
    },
    workspace: () => workspace,
  });

  await controller.init();
  const session = await controller.createSession({
    resourceId: paths.resourceId,
    ownerId: paths.ownerId,
  });
  // `switch` hydrates persisted settings and rebinds the stream; `set` only
  // changes the low-level binding and is not sufficient for a real resume.
  await resumeThread(session, opts.threadId);

  // Native Herdr reporting when running inside a Herdr pane (no-op otherwise).
  const herdrDetach = attachHerdrReporter(session, { projectPath: paths.projectPath });

  return { controller, session, paths, herdrDetach };
}
