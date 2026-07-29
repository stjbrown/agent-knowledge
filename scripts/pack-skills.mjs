import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = join(repoRoot, "artifacts");
const npmCacheDir = join(tmpdir(), "agent-knowledge-skills-npm-cache");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

mkdirSync(artifactsDir, { recursive: true });
mkdirSync(npmCacheDir, { recursive: true });

const result = spawnSync(
  npmCommand,
  ["pack", "--pack-destination", artifactsDir, "--cache", npmCacheDir],
  { cwd: repoRoot, stdio: "inherit" },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

process.stdout.write(`\nSkills package written to ${artifactsDir}\n`);
