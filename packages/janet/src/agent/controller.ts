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
}

const stateSchema = z.object({
  projectPath: z.string(),
  bundlePath: z.string(),
  configDir: z.string(),
  // Session-wide auto-approve: core's approval gate reads `state.yolo === true`
  // and skips tool-approval suspensions entirely. Headless sets it; interactive
  // keeps approvals on.
  yolo: z.boolean(),
});

export type JanetState = z.infer<typeof stateSchema>;

const MODES: AgentControllerMode[] = [{ id: "build", name: "Build" }];

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
    requireApproval: opts.interactive,
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
    initialState: {
      projectPath: paths.projectPath,
      bundlePath: paths.bundlePath,
      configDir: paths.globalConfigDir,
      yolo: !opts.interactive,
    },
    workspace: () => workspace,
  });

  await controller.init();
  const session = await controller.createSession({
    resourceId: paths.resourceId,
    ownerId: paths.ownerId,
  });

  return { controller, session, paths };
}
