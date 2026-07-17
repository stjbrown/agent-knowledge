#!/usr/bin/env node
/**
 * Bundle the kb-tools CLIs into zero-dependency, single-file `.mjs` scripts and
 * commit them into the skills folders. The skills reference these committed
 * artifacts (`node …conformance.mjs <dir>`), so the skills stay host-neutral
 * and self-contained — no Python, no install step.
 *
 * Run from the repo root: `node packages/kb-tools/scripts/build-skill-scripts.mjs`
 * A CI drift check should fail if the committed `.mjs` differ from a fresh build.
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const targets = [
  {
    entry: resolve(here, "../src/cli/conformance-cli.ts"),
    out: resolve(repoRoot, "skills/kb-lint/scripts/conformance.mjs"),
  },
  {
    entry: resolve(here, "../src/cli/graph-cli.ts"),
    out: resolve(repoRoot, "skills/kb-visualize/scripts/graph.mjs"),
  },
];

for (const t of targets) {
  await build({
    entryPoints: [t.entry],
    outfile: t.out,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    banner: { js: "#!/usr/bin/env node" },
    legalComments: "none",
  });
  console.log(`built ${t.out}`);
}
