#!/usr/bin/env node
/**
 * prepack: copy the repo-root `skills/` into this package so npm ships the
 * always-present fallback copy (`packages/janet/skills`, a gitignored build
 * artifact). Repo-root `skills/` remains the single source of truth for
 * skills.sh and the Claude plugin.
 */
import { copyFileSync, cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const src = resolve(repoRoot, "skills");
const dest = resolve(here, "..", "skills");

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`copied ${src} -> ${dest}`);

for (const name of ["README.md", "LICENSE", "NOTICE"]) {
  copyFileSync(resolve(repoRoot, name), resolve(here, "..", name));
  console.log(`copied ${name} into package`);
}
