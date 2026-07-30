#!/usr/bin/env node
/**
 * Bundle the kb-tools CLIs into zero-dependency, single-file `.mjs` scripts and
 * commit them into the skills folders. The skills reference these committed
 * artifacts (`node …conformance.mjs <dir>`), so the skills stay host-neutral
 * and self-contained — no Python, no install step.
 *
 * Run from the repo root: `node scripts/build-skill-scripts.mjs`
 * A CI drift check should fail if the committed `.mjs` differ from a fresh build.
 */
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const check = process.argv.slice(2).includes("--check");

const targets = [
  {
    entry: resolve(repoRoot, "src/cli/conformance-cli.ts"),
    out: resolve(repoRoot, "skills/kb-lint/scripts/conformance.mjs"),
  },
  {
    entry: resolve(repoRoot, "src/cli/graph-cli.ts"),
    out: resolve(repoRoot, "skills/kb-visualize/scripts/graph.mjs"),
  },
];

for (const t of targets) {
  const result = await build({
    entryPoints: [t.entry],
    outfile: t.out,
    write: !check,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    // The bundled YAML parser is CommonJS. Give esbuild's ESM compatibility
    // wrapper a real Node require without leaving any runtime package dependency.
    banner: {
      js: '#!/usr/bin/env node\nimport { createRequire as __kbCreateRequire } from "node:module";\nconst require = __kbCreateRequire(import.meta.url);',
    },
    legalComments: "none",
  });

  if (!check) {
    console.log(`built ${t.out}`);
    continue;
  }

  const generated = result.outputFiles?.[0]?.contents;
  if (!generated) throw new Error(`esbuild returned no output for ${t.entry}`);
  const current = readFileSync(t.out);
  if (!current.equals(generated)) {
    console.error(`stale ${t.out}`);
    process.exitCode = 1;
  } else {
    console.log(`current ${t.out}`);
  }
}
