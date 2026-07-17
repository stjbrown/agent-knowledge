import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join, resolve } from "node:path";

/** App-data dir name (global + project-local). */
export const CONFIG_DIR_NAME = ".agent-knowledge";

/** Bundle convention: `<project>/knowledge/`. */
export const BUNDLE_DIR_NAME = "knowledge";

export interface ProjectPaths {
  /** The working directory Janet operates on (cwd, or -C override). */
  projectPath: string;
  /** Default bundle location within the project. */
  bundlePath: string;
  /** Global app-data dir (~/.agent-knowledge) — auth + settings + threads db. */
  globalConfigDir: string;
  /** Project-local config dir (<project>/.agent-knowledge). */
  projectConfigDir: string;
  /** Stable per-project id: git remote if present, else absolute project path. */
  resourceId: string;
  /** Machine-bound owner id. */
  ownerId: string;
}

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

/** Normalize a git remote URL so ssh/https forms of the same repo share history. */
function normalizeRemote(url: string): string {
  return url
    .trim()
    .replace(/^git\+/, "")
    .replace(/^ssh:\/\/git@/, "https://")
    .replace(/^git@([^:]+):/, "https://$1/")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function gitRemote(projectPath: string): string | undefined {
  try {
    const out = execFileSync("git", ["-C", projectPath, "remote", "get-url", "origin"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const url = out.trim();
    return url ? normalizeRemote(url) : undefined;
  } catch {
    return undefined;
  }
}

export function resolveProjectPaths(opts: { dir?: string; bundle?: string } = {}): ProjectPaths {
  const projectPath = resolve(opts.dir ?? process.cwd());
  const bundlePath = opts.bundle
    ? isAbsolute(opts.bundle)
      ? opts.bundle
      : join(projectPath, opts.bundle)
    : join(projectPath, BUNDLE_DIR_NAME);

  const globalConfigDir = join(homedir(), CONFIG_DIR_NAME);
  const projectConfigDir = join(projectPath, CONFIG_DIR_NAME);

  const remote = gitRemote(projectPath);
  const resourceId = `janet-${shortHash(remote ?? projectPath)}`;
  const ownerId = `janet-${shortHash(`${hostname()}\0${projectPath}`)}`;

  return { projectPath, bundlePath, globalConfigDir, projectConfigDir, resourceId, ownerId };
}

export function ensureDir(dir: string): string {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Absolute path to the skills folder shipped inside this package (the external,
 * always-present fallback copy). Resolved relative to this module so it works
 * from `dist/` after bundling. In dev (src/) it points at the repo-root skills.
 */
export function bundledSkillsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // Built layout: packages/janet/dist/main.js → ../skills
  const shipped = resolve(here, "..", "skills");
  if (existsSync(shipped)) return shipped;
  // Dev layout: packages/janet/src/agent/paths.ts → repo-root/skills
  return resolve(here, "..", "..", "..", "..", "skills");
}
