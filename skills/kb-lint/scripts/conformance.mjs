#!/usr/bin/env node

// packages/kb-tools/src/conformance.ts
import { existsSync, readFileSync, statSync as statSync2 } from "node:fs";
import { dirname, join as join2 } from "node:path";

// packages/kb-tools/src/shared.ts
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
var FM_RE = /^---\n([\s\S]*?)\n---\n?/;
var RESERVED = /* @__PURE__ */ new Set(["index.md", "log.md"]);
function collectMarkdown(bundle) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir).sort();
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full);
      } else if (name.endsWith(".md")) {
        out.push(relative(bundle, full).split(sep).join("/"));
      }
    }
  };
  walk(bundle);
  return out;
}
function frontmatter(text) {
  const m = FM_RE.exec(text);
  return m ? m[1] : null;
}
var NON_ASCII = new RegExp("[" + String.fromCharCode(128) + "-" + String.fromCharCode(65535) + "]", "g");
function pythonJson(value) {
  return JSON.stringify(value, null, 2).replace(
    NON_ASCII,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")
  );
}
function normalizePosix(p) {
  const isAbs = p.startsWith("/");
  const parts = p.split("/");
  const stack = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (stack.length && stack[stack.length - 1] !== "..") stack.pop();
      else if (!isAbs) stack.push("..");
    } else {
      stack.push(part);
    }
  }
  const joined = stack.join("/");
  if (isAbs) return "/" + joined;
  return joined === "" ? "." : joined;
}

// packages/kb-tools/src/conformance.ts
var HEADING_LOG_RE = /^##\s+(.+?)\s*$/gm;
var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
var LINK_RE = /\]\(([^)#\s]+\.md)(#[^)]*)?\)/g;
var TYPE_RE = /^type:\s*(.+?)\s*$/m;
function checkConformance(bundle) {
  const errors = [];
  const warnings = [];
  const md = collectMarkdown(bundle);
  const posixBasename = (rel) => rel.split("/").pop() ?? rel;
  for (const rel of [...md].sort()) {
    const text = readFileSync(join2(bundle, rel), "utf-8");
    const base = posixBasename(rel);
    const fm = frontmatter(text);
    if (RESERVED.has(base)) {
      if (fm !== null) {
        const isRootIndex = rel === "index.md";
        if (!(isRootIndex && fm.includes("okf_version"))) {
          errors.push(`${rel}: reserved file must not carry frontmatter`);
        }
      }
      if (base === "log.md") {
        for (const m of text.matchAll(HEADING_LOG_RE)) {
          if (!ISO_DATE_RE.test(m[1])) {
            warnings.push(`${rel}: log date heading not ISO 8601: '${m[1]}'`);
          }
        }
      }
      continue;
    }
    if (fm === null) {
      errors.push(`${rel}: concept has no parseable frontmatter`);
      continue;
    }
    const tm = TYPE_RE.exec(fm);
    if (!tm || !tm[1].trim()) {
      errors.push(`${rel}: missing or empty required 'type'`);
    }
  }
  for (const rel of md) {
    const srcdir = dirname(rel) === "." ? "" : dirname(rel);
    const text = readFileSync(join2(bundle, rel), "utf-8");
    for (const m of text.matchAll(LINK_RE)) {
      const tgt = m[1];
      if (tgt.includes("://")) continue;
      const resolved = tgt.startsWith("/") ? tgt.replace(/^\/+/, "") : normalizePosix(srcdir ? `${srcdir}/${tgt}` : tgt);
      if (!existsSync(join2(bundle, resolved))) {
        warnings.push(`${rel}: broken link -> ${tgt}`);
      }
    }
  }
  return {
    bundle,
    concepts: md.filter((f) => !RESERVED.has(posixBasename(f))).length,
    files: md.length,
    errors,
    warnings
  };
}
function formatReport(r) {
  const lines = [`${r.bundle}: ${r.files} files, ${r.concepts} concepts`];
  for (const e of r.errors) lines.push(`  ERROR  ${e}`);
  for (const w of r.warnings) lines.push(`  warn   ${w}`);
  const verdict = r.errors.length === 0 ? "CONFORMANT" : "NON-CONFORMANT";
  lines.push(`  => ${verdict} (${r.errors.length} errors, ${r.warnings.length} warnings)`);
  return lines.join("\n");
}
function runCli(argv) {
  const args = argv.filter((a) => !a.startsWith("--"));
  const asJson = argv.includes("--json");
  const bundle = args[0] ?? ".";
  let isDir = false;
  try {
    isDir = statSync2(bundle).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) {
    process.stderr.write(`not a directory: ${bundle}
`);
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

// packages/kb-tools/src/cli/conformance-cli.ts
process.exit(runCli(process.argv.slice(2)));
