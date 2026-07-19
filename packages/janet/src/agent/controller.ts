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
import { janetToolCategory } from "./permissions.js";
import { attachHerdrReporter } from "../herdr/reporter.js";

export interface BootOptions {
  /** Working dir override (-C/--dir). Defaults to process.cwd(). */
  dir?: string;
  /** Bundle location override (--bundle). Defaults to <dir>/knowledge. */
  bundle?: string;
  /** Headless auto-approves tool calls; interactive requires approval. */
  interactive: boolean;
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
  // Session-wide auto-approve: core's approval gate reads `state.yolo === true`
  // and skips tool-approval suspensions entirely. Headless sets it; interactive
  // keeps approvals on.
  yolo: z.boolean(),
  // Tool-approval rules by category/tool. Must be in the schema or session state
  // strips it, and setForCategory / getRules silently no-op.
  permissionRules: permissionRules.optional(),
});

export type JanetState = z.infer<typeof stateSchema>;

const MODES: AgentControllerMode[] = [{ id: "build", name: "Build" }];

// Interactive approval policy: reads, skills, task bookkeeping, ask_user (category
// null → always allow) and bundle edits never prompt; only command execution
// asks — and that prompt offers "always allow". Headless relies on yolo instead.
const INTERACTIVE_RULES = {
  categories: { read: "allow", edit: "allow", other: "allow", mcp: "allow", execute: "ask" },
  tools: {},
} as const;

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
      yolo: !opts.interactive,
      ...(opts.interactive ? { permissionRules: INTERACTIVE_RULES } : {}),
    },
    workspace: () => workspace,
  });

  await controller.init();
  const session = await controller.createSession({
    resourceId: paths.resourceId,
    ownerId: paths.ownerId,
  });

  // Native Herdr reporting when running inside a Herdr pane (no-op otherwise).
  const herdrDetach = attachHerdrReporter(session, { projectPath: paths.projectPath });

  return { controller, session, paths, herdrDetach };
}
