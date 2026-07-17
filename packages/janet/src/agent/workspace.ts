import { LocalFilesystem, LocalSandbox, Workspace } from "@mastra/core/workspace";
import type { SkillMount } from "./skills-paths.js";

export interface WorkspaceOptions {
  /** The project dir Janet operates on (cwd); where `knowledge/` lives. */
  projectPath: string;
  /** The mounted kb-* skills (relative root + symlink-target read exceptions). */
  skills: SkillMount;
  /** Interactive sessions require approval for writes/deletes/exec; headless auto-approves. */
  requireApproval: boolean;
}

/**
 * Build the workspace. The filesystem base is the whole project (so Janet can
 * read README/notes for ingest/schema inference); writes are constrained by the
 * skills to the bundle. `skills` is a WORKSPACE-RELATIVE path (Mastra rejects
 * absolute skills paths); the symlink targets are added to `allowedPaths` so
 * reads resolve through the links to the bundled copy outside the project.
 *
 * With skills configured here, the agent automatically gets the `skill`,
 * `skill_read`, and `skill_search` tools, and the available skills are listed
 * in its system message (per the workspace-skills docs).
 *
 * Trust-model enforcement rides on the tools config: `requireReadBeforeWrite`
 * on writes always, and `requireApproval` on write/delete/execute in
 * interactive mode.
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
      mastra_workspace_write_file: {
        requireReadBeforeWrite: true,
        requireApproval: opts.requireApproval,
      },
      mastra_workspace_edit_file: {
        requireReadBeforeWrite: true,
        requireApproval: opts.requireApproval,
      },
      mastra_workspace_delete: { requireApproval: opts.requireApproval },
      mastra_workspace_execute_command: { requireApproval: opts.requireApproval },
    },
  });
}
