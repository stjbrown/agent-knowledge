import {
  LocalFilesystem,
  LocalSandbox,
  Workspace,
  WORKSPACE_TOOLS,
} from "@mastra/core/workspace";
import type {
  ToolConfigContext,
  ToolConfigWithArgsContext,
} from "@mastra/core/workspace";
import type { SkillMount } from "./skills-paths.js";

export interface WorkspaceOptions {
  /** The project dir Janet operates on (cwd); where `knowledge/` lives. */
  projectPath: string;
  /** The mounted kb-* skills (relative root + symlink-target read exceptions). */
  skills: SkillMount;
}

type PolicyContext = Pick<ToolConfigContext, "requestContext">;

function categoryPolicy(
  { requestContext }: PolicyContext,
  category: "edit" | "execute",
): unknown {
  const controller = requestContext["controller"];
  if (!controller || typeof controller !== "object") return;
  const state = (controller as { state?: unknown }).state;
  if (!state || typeof state !== "object") return;
  const rules = (state as { permissionRules?: unknown }).permissionRules;
  if (!rules || typeof rules !== "object") return;
  const categories = (rules as { categories?: unknown }).categories;
  if (!categories || typeof categories !== "object") return;
  return (categories as Record<string, unknown>)[category];
}

export function editToolsEnabled(context: PolicyContext): boolean {
  return categoryPolicy(context, "edit") === "allow";
}

export function executionToolsEnabled(context: PolicyContext): boolean {
  const policy = categoryPolicy(context, "execute");
  return policy === "allow" || policy === "ask";
}

export function requiresExecutionApproval(
  context: ToolConfigWithArgsContext,
): boolean {
  return categoryPolicy(context, "execute") !== "allow";
}

/**
 * Build the workspace. The filesystem base is the whole project (so Janet can
 * read README/notes for ingest/schema inference); writes stay within the
 * project and are steered to the bundle by the skills. `skills` is a
 * WORKSPACE-RELATIVE path (Mastra rejects absolute skills paths); the symlink
 * targets are added to `allowedPaths` so reads resolve through the links.
 *
 * Approval is NOT configured here — it is governed entirely by the controller's
 * permission policy + tool categories (see permissions.ts), so there is a single
 * source of truth and the "always allow this category" flow works. We keep
 * `requireReadBeforeWrite` on the mutating tools as a correctness guard (it is
 * not an approval prompt).
 */
export function createWorkspace(opts: WorkspaceOptions): Workspace {
  return new Workspace({
    id: "janet-workspace",
    filesystem: new LocalFilesystem({
      basePath: opts.projectPath,
      allowedPaths: opts.skills.allowedPaths,
    }),
    sandbox: new LocalSandbox({ workingDirectory: opts.projectPath }),
    skills: [opts.skills.relativeRoot],
    tools: {
      // AgentController's global approval mode resumes the model once per tool.
      // Stateless Codex OAuth needs ordinary reads/edits to remain inside one
      // continuous agent loop, so known-safe workspace actions opt out here.
      // Unknown future workspace tools inherit `false` and stay unavailable
      // until Janet gives them an explicit policy.
      enabled: false,
      requireApproval: true,
      [WORKSPACE_TOOLS.FILESYSTEM.READ_FILE]: {
        enabled: true,
        requireApproval: false,
      },
      [WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES]: {
        enabled: true,
        requireApproval: false,
      },
      [WORKSPACE_TOOLS.FILESYSTEM.FILE_STAT]: {
        enabled: true,
        requireApproval: false,
      },
      [WORKSPACE_TOOLS.FILESYSTEM.GREP]: {
        enabled: true,
        requireApproval: false,
      },
      [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {
        enabled: editToolsEnabled,
        requireApproval: false,
        requireReadBeforeWrite: true,
      },
      [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: {
        enabled: editToolsEnabled,
        requireApproval: false,
        requireReadBeforeWrite: true,
      },
      [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: {
        enabled: editToolsEnabled,
        requireApproval: false,
      },
      [WORKSPACE_TOOLS.FILESYSTEM.MKDIR]: {
        enabled: editToolsEnabled,
        requireApproval: false,
      },
      [WORKSPACE_TOOLS.FILESYSTEM.AST_EDIT]: {
        enabled: editToolsEnabled,
        requireApproval: false,
      },
      [WORKSPACE_TOOLS.SEARCH.SEARCH]: {
        enabled: true,
        requireApproval: false,
      },
      [WORKSPACE_TOOLS.SEARCH.INDEX]: {
        enabled: editToolsEnabled,
        requireApproval: false,
      },
      [WORKSPACE_TOOLS.LSP.LSP_INSPECT]: {
        enabled: true,
        requireApproval: false,
      },
      [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: {
        enabled: executionToolsEnabled,
        requireApproval: requiresExecutionApproval,
      },
      [WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT]: {
        enabled: executionToolsEnabled,
        requireApproval: requiresExecutionApproval,
      },
      [WORKSPACE_TOOLS.SANDBOX.KILL_PROCESS]: {
        enabled: executionToolsEnabled,
        requireApproval: requiresExecutionApproval,
      },
    },
  });
}
