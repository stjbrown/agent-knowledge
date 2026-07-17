#!/usr/bin/env node

// packages/kb-tools/src/graph.ts
import { readFileSync, statSync as statSync2 } from "node:fs";
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
function conceptId(rel) {
  return rel.endsWith(".md") ? rel.slice(0, -3) : rel;
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

// packages/kb-tools/src/graph.ts
var LINK_RE = /\[[^\]]*\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g;
function stripQuotes(s) {
  return s.replace(/^["']+/, "").replace(/["']+$/, "");
}
function parseFrontmatter(fm) {
  const data = {};
  let key = null;
  for (const line of fm.split("\n")) {
    if (/^\s+-\s+/.test(line) && key) {
      if (!(key in data)) data[key] = [];
      const cur = data[key];
      if (Array.isArray(cur)) {
        cur.push(stripQuotes(line.trim().slice(2).trim()));
      }
      continue;
    }
    const m = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    key = m[1];
    const val = m[2].trim();
    if (val === "") {
      data[key] = [];
    } else if (val.startsWith("[") && val.endsWith("]")) {
      data[key] = val.slice(1, -1).split(",").map((x) => x.trim()).filter((x) => x.length > 0).map(stripQuotes);
    } else {
      data[key] = stripQuotes(val);
    }
  }
  return data;
}
function scalar(data, k, dflt) {
  const v = data[k];
  if (v === void 0) return dflt;
  return Array.isArray(v) ? dflt : v;
}
function resolve(srcRel, target) {
  const resolved = target.startsWith("/") ? target.replace(/^\/+/, "") : normalizePosix(`${dirname(srcRel) === "." ? "" : dirname(srcRel)}/${target}`.replace(/^\//, ""));
  return conceptId(resolved);
}
function extractGraph(bundle) {
  const md = collectMarkdown(bundle);
  const posixBasename = (rel) => rel.split("/").pop() ?? rel;
  const ids = /* @__PURE__ */ new Set();
  for (const rel of md) {
    if (RESERVED.has(posixBasename(rel))) continue;
    ids.add(conceptId(rel));
  }
  const nodes = /* @__PURE__ */ new Map();
  for (const rel of [...md].sort()) {
    if (RESERVED.has(posixBasename(rel))) continue;
    const text = readFileSync(join2(bundle, rel), "utf-8");
    const m = FM_RE.exec(text);
    const fm = m ? parseFrontmatter(m[1]) : {};
    const body = m ? text.slice(m[0].length) : text;
    const cid = conceptId(rel);
    const links = [];
    for (const lm of body.matchAll(LINK_RE)) {
      const tgt = lm[1];
      if (tgt.includes("://")) continue;
      const rid = resolve(rel, tgt);
      if (ids.has(rid) && rid !== cid && !links.includes(rid)) links.push(rid);
    }
    const rawTags = fm["tags"];
    const tags = Array.isArray(rawTags) ? rawTags : rawTags === void 0 ? [] : [rawTags];
    nodes.set(cid, {
      id: cid,
      path: rel,
      type: scalar(fm, "type", ""),
      title: scalar(fm, "title", cid.split("/").pop() ?? cid),
      description: scalar(fm, "description", ""),
      tags,
      resource: scalar(fm, "resource", ""),
      status: scalar(fm, "status", "active"),
      body: body.trim(),
      links,
      cited_by: []
    });
  }
  const edges = [];
  for (const n of nodes.values()) {
    for (const tgt of n.links) {
      edges.push({ source: n.id, target: tgt });
      nodes.get(tgt).cited_by.push(n.id);
    }
  }
  const types = [...new Set([...nodes.values()].map((n) => n.type).filter((t) => t))].sort();
  return { bundle, nodes: [...nodes.values()], types, edges };
}
function runCli(argv) {
  const bundle = argv.find((a) => !a.startsWith("--")) ?? ".";
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
  process.stdout.write(pythonJson(extractGraph(bundle)) + "\n");
  return 0;
}

// packages/kb-tools/src/cli/graph-cli.ts
process.exit(runCli(process.argv.slice(2)));
