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
 * Layering (plan: local shadows bundled):
 * - A dedicated real copy at `~/.agent-knowledge/skills` (e.g. from
 *   `npx skills add`) becomes the symlink SOURCE instead of the bundled copy.
 * - A real (non-symlink) skill dir already present in the project-local root is
 *   left untouched — a user-managed copy wins over any symlink we'd create.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CONFIG_DIR_NAME, bundledSkillsDir, ensureDir } from "./paths.js";

/** The kb-* skills janet ships and knows how to drive. */
const JANET_SKILL_NAMES = ["kb", "kb-init", "kb-ingest", "kb-query", "kb-lint", "kb-visualize"];
const JANET_SKILL_SET = new Set(JANET_SKILL_NAMES);

function isSkillDir(dir: string): boolean {
  return fs.existsSync(path.join(dir, "SKILL.md"));
}

/** True when `root` exists and every child dir is one of janet's kb-* skills. */
function isDedicatedJanetRoot(root: string): boolean {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return false;
  }
  const dirs = entries.filter((e) => e.isDirectory() || e.isSymbolicLink());
  return dirs.length > 0 && dirs.every((e) => JANET_SKILL_SET.has(e.name));
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
  const globalRoot = path.join(homeDir, CONFIG_DIR_NAME, "skills");
  const bundled = bundledSkillsDir();
  const sourceRoot = isDedicatedJanetRoot(globalRoot) ? globalRoot : bundled;

  const linkRoot = path.join(projectPath, CONFIG_DIR_NAME, "skills");
  ensureDir(linkRoot);

  for (const name of JANET_SKILL_NAMES) {
    const src = path.join(sourceRoot, name);
    if (!isSkillDir(src)) continue;
    const dest = path.join(linkRoot, name);

    let st: fs.Stats | undefined;
    try {
      st = fs.lstatSync(dest);
    } catch {
      st = undefined;
    }

    if (st?.isSymbolicLink()) {
      // Repoint a stale link (e.g. package moved between installs).
      if (fs.readlinkSync(dest) !== src) {
        fs.unlinkSync(dest);
        fs.symlinkSync(src, dest, "dir");
      }
    } else if (!st) {
      fs.symlinkSync(src, dest, "dir");
    }
    // A real dir (user-managed copy) is left alone — it wins.
  }

  return {
    relativeRoot: path.join(CONFIG_DIR_NAME, "skills"),
    allowedPaths: [...new Set([sourceRoot, linkRoot])],
  };
}
