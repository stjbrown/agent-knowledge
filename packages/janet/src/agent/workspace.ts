import { LocalFilesystem, LocalSandbox, Workspace } from "@mastra/core/workspace";
import type { SkillMount } from "./skills-paths.js";

export interface WorkspaceOptions {
  /** The project dir Janet operates on (cwd); where `knowledge/` lives. */
  projectPath: string;
  /** The mounted kb-* skills (relative root + symlink-target read exceptions). */
  skills: SkillMount;
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
      mastra_workspace_write_file: { requireReadBeforeWrite: true },
      mastra_workspace_edit_file: { requireReadBeforeWrite: true },
    },
  });
}
