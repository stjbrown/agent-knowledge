/**
 * Workspace-skills mounting.
 *
 * Mastra workspace `skills` paths must be RELATIVE to the workspace root
 * (LocalFilesystem basePath) — absolute paths are rejected with "path is
 * outside the workspace". Janet's kb-* skills ship inside the npm package,
 * outside any user project, so we mount them into the project by SYMLINKING
 * each skill dir into `<project>/.agent-knowledge/skills/` and configuring the
 * workspace with that relative root.
 *
 * Layering (local shadows bundled) is resolved independently for each skill:
 * project `.agents/skills` → project `.claude/skills` → user equivalents →
 * `~/.agent-knowledge/skills` → npm-bundled fallback. A real skill directory
 * already present in the project-local mount is left untouched and wins over
 * all generated links.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CONFIG_DIR_NAME, bundledSkillsDir, ensureDir } from "./paths.js";

/** The kb-* skills janet ships and knows how to drive. */
const JANET_SKILL_NAMES = ["kb", "kb-init", "kb-ingest", "kb-query", "kb-lint", "kb-visualize"];

function isSkillDir(dir: string): boolean {
  return fs.existsSync(path.join(dir, "SKILL.md"));
}

export interface SkillMount {
  /** Workspace `skills` entry — relative to the workspace root. */
  relativeRoot: string;
  /** Absolute dirs the filesystem must allow reads from (symlink targets). */
  allowedPaths: string[];
}

/**
 * Ensure `<project>/.agent-knowledge/skills/<kb-*>` links exist and return the
 * workspace-relative skills root plus the absolute paths reads must be allowed
 * to resolve through.
 */
export function ensureSkillLinks(projectPath: string, homeDir: string = os.homedir()): SkillMount {
  const bundled = bundledSkillsDir();
  const sourceRoots = [
    path.join(projectPath, ".agents", "skills"),
    path.join(projectPath, ".claude", "skills"),
    path.join(homeDir, ".agents", "skills"),
    path.join(homeDir, ".claude", "skills"),
    path.join(homeDir, CONFIG_DIR_NAME, "skills"),
    bundled,
  ];

  const linkRoot = path.join(projectPath, CONFIG_DIR_NAME, "skills");
  ensureDir(linkRoot);
  const allowedPaths = new Set<string>([linkRoot]);

  for (const name of JANET_SKILL_NAMES) {
    const dest = path.join(linkRoot, name);

    let st: fs.Stats | undefined;
    try {
      st = fs.lstatSync(dest);
    } catch {
      st = undefined;
    }

    if (st && !st.isSymbolicLink()) {
      if (isSkillDir(dest)) allowedPaths.add(dest);
      continue;
    }

    const src = sourceRoots.map((root) => path.join(root, name)).find(isSkillDir);
    if (!src) continue;
    allowedPaths.add(src);

    if (st?.isSymbolicLink()) {
      // Repoint a stale link (e.g. package moved between installs).
      if (fs.readlinkSync(dest) !== src) {
        fs.unlinkSync(dest);
        fs.symlinkSync(src, dest, "dir");
      }
    } else if (!st) {
      fs.symlinkSync(src, dest, "dir");
    }
  }

  return {
    relativeRoot: path.join(CONFIG_DIR_NAME, "skills"),
    allowedPaths: [...allowedPaths],
  };
}
