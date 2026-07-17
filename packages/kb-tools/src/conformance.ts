/**
 * Deterministic OKF v0.1 conformance check for a knowledge bundle (SPEC §9).
 *
 * A TypeScript port of skills/kb-lint/scripts/conformance.py, behaviour-identical.
 * ERRORs fail conformance; broken links and soft-guidance issues are WARN and
 * never fail (SPEC §5.3 / §9 — consumers MUST tolerate them). Structure only;
 * drift is the fuzzy, agent-driven half of kb-lint.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { RESERVED, collectMarkdown, frontmatter, normalizePosix, pythonJson } from "./shared.js";

const HEADING_LOG_RE = /^##\s+(.+?)\s*$/gm;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LINK_RE = /\]\(([^)#\s]+\.md)(#[^)]*)?\)/g;
const TYPE_RE = /^type:\s*(.+?)\s*$/m;

export interface ConformanceReport {
  bundle: string;
  concepts: number;
  files: number;
  errors: string[];
  warnings: string[];
}

export function checkConformance(bundle: string): ConformanceReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const md = collectMarkdown(bundle);

  const posixBasename = (rel: string): string => rel.split("/").pop() ?? rel;

  for (const rel of [...md].sort()) {
    const text = readFileSync(join(bundle, rel), "utf-8");
    const base = posixBasename(rel);
    const fm = frontmatter(text);

    if (RESERVED.has(base)) {
      // Reserved files carry no frontmatter, except the ROOT index.md may
      // declare okf_version (SPEC §6/§11).
      if (fm !== null) {
        const isRootIndex = rel === "index.md";
        if (!(isRootIndex && fm.includes("okf_version"))) {
          errors.push(`${rel}: reserved file must not carry frontmatter`);
        }
      }
      if (base === "log.md") {
        for (const m of text.matchAll(HEADING_LOG_RE)) {
          if (!ISO_DATE_RE.test(m[1]!)) {
            warnings.push(`${rel}: log date heading not ISO 8601: '${m[1]}'`);
          }
        }
      }
      continue;
    }

    // Concept document: rules 1 & 2.
    if (fm === null) {
      errors.push(`${rel}: concept has no parseable frontmatter`);
      continue;
    }
    const tm = TYPE_RE.exec(fm);
    if (!tm || !tm[1]!.trim()) {
      errors.push(`${rel}: missing or empty required 'type'`);
    }
  }

  // Broken relative links → WARN only (never a conformance failure).
  for (const rel of md) {
    const srcdir = dirname(rel) === "." ? "" : dirname(rel);
    const text = readFileSync(join(bundle, rel), "utf-8");
    for (const m of text.matchAll(LINK_RE)) {
      const tgt = m[1]!;
      if (tgt.includes("://")) continue;
      const resolved = tgt.startsWith("/")
        ? tgt.replace(/^\/+/, "")
        : normalizePosix(srcdir ? `${srcdir}/${tgt}` : tgt);
      if (!existsSync(join(bundle, resolved))) {
        warnings.push(`${rel}: broken link -> ${tgt}`);
      }
    }
  }

  return {
    bundle,
    concepts: md.filter((f) => !RESERVED.has(posixBasename(f))).length,
    files: md.length,
    errors,
    warnings,
  };
}

export function formatReport(r: ConformanceReport): string {
  const lines = [`${r.bundle}: ${r.files} files, ${r.concepts} concepts`];
  for (const e of r.errors) lines.push(`  ERROR  ${e}`);
  for (const w of r.warnings) lines.push(`  warn   ${w}`);
  const verdict = r.errors.length === 0 ? "CONFORMANT" : "NON-CONFORMANT";
  lines.push(`  => ${verdict} (${r.errors.length} errors, ${r.warnings.length} warnings)`);
  return lines.join("\n");
}

export function runCli(argv: string[]): number {
  const args = argv.filter((a) => !a.startsWith("--"));
  const asJson = argv.includes("--json");
  const bundle = args[0] ?? ".";
  let isDir = false;
  try {
    isDir = statSync(bundle).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) {
    process.stderr.write(`not a directory: ${bundle}\n`);
    return 2;
  }
  const r = checkConformance(bundle);
  if (asJson) {
    process.stdout.write(pythonJson(r) + "\n");
  } else {
    process.stdout.write(formatReport(r) + "\n");
  }
  return r.errors.length ? 1 : 0;
}
