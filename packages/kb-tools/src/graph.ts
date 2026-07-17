/**
 * Extract the graph model of an OKF bundle — the deterministic half of
 * kb-visualize. A TypeScript port of skills/kb-visualize/scripts/graph.py,
 * behaviour-identical. The agent renders this model into a view.
 *
 * Node id = concept id = path within the bundle minus `.md`. Reserved
 * index.md/log.md are excluded. Links are resolved to concept ids; links whose
 * target is not a concept in the bundle are dropped (SPEC §5.3 tolerates them).
 */
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { FM_RE, RESERVED, collectMarkdown, conceptId, normalizePosix, pythonJson } from "./shared.js";

const LINK_RE = /\[[^\]]*\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g;

export interface GraphNode {
  id: string;
  path: string;
  type: string;
  title: string;
  description: string;
  tags: string[];
  resource: string;
  status: string;
  body: string;
  links: string[];
  cited_by: string[];
}

export interface GraphModel {
  bundle: string;
  nodes: GraphNode[];
  types: string[];
  edges: { source: string; target: string }[];
}

type FrontmatterData = Record<string, string | string[]>;

/** Strip any leading/trailing `"` or `'` characters (Python str.strip("\"'")). */
function stripQuotes(s: string): string {
  return s.replace(/^["']+/, "").replace(/["']+$/, "");
}

/** Minimal YAML: scalars and simple `[a, b]` / `- item` lists. No deps. */
export function parseFrontmatter(fm: string): FrontmatterData {
  const data: FrontmatterData = {};
  let key: string | null = null;
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
    key = m[1]!;
    const val = m[2]!.trim();
    if (val === "") {
      data[key] = [];
    } else if (val.startsWith("[") && val.endsWith("]")) {
      data[key] = val
        .slice(1, -1)
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 0)
        .map(stripQuotes);
    } else {
      data[key] = stripQuotes(val);
    }
  }
  return data;
}

function scalar(data: FrontmatterData, k: string, dflt: string): string {
  const v = data[k];
  if (v === undefined) return dflt;
  return Array.isArray(v) ? dflt : v;
}

/** Resolve a markdown link target (relative or bundle-absolute) to a concept id. */
function resolve(srcRel: string, target: string): string {
  const resolved = target.startsWith("/")
    ? target.replace(/^\/+/, "")
    : normalizePosix(`${dirname(srcRel) === "." ? "" : dirname(srcRel)}/${target}`.replace(/^\//, ""));
  return conceptId(resolved);
}

export function extractGraph(bundle: string): GraphModel {
  const md = collectMarkdown(bundle);
  const posixBasename = (rel: string): string => rel.split("/").pop() ?? rel;

  const ids = new Set<string>();
  for (const rel of md) {
    if (RESERVED.has(posixBasename(rel))) continue;
    ids.add(conceptId(rel));
  }

  const nodes = new Map<string, GraphNode>();
  for (const rel of [...md].sort()) {
    if (RESERVED.has(posixBasename(rel))) continue;
    const text = readFileSync(join(bundle, rel), "utf-8");
    const m = FM_RE.exec(text);
    const fm = m ? parseFrontmatter(m[1]!) : {};
    const body = m ? text.slice(m[0].length) : text;
    const cid = conceptId(rel);

    const links: string[] = [];
    for (const lm of body.matchAll(LINK_RE)) {
      const tgt = lm[1]!;
      if (tgt.includes("://")) continue;
      const rid = resolve(rel, tgt);
      if (ids.has(rid) && rid !== cid && !links.includes(rid)) links.push(rid);
    }

    const rawTags = fm["tags"];
    const tags = Array.isArray(rawTags) ? rawTags : rawTags === undefined ? [] : [rawTags];

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
      cited_by: [],
    });
  }

  const edges: { source: string; target: string }[] = [];
  for (const n of nodes.values()) {
    for (const tgt of n.links) {
      edges.push({ source: n.id, target: tgt });
      nodes.get(tgt)!.cited_by.push(n.id);
    }
  }

  const types = [...new Set([...nodes.values()].map((n) => n.type).filter((t) => t))].sort();
  return { bundle, nodes: [...nodes.values()], types, edges };
}

export function runCli(argv: string[]): number {
  const bundle = argv.find((a) => !a.startsWith("--")) ?? ".";
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
  process.stdout.write(pythonJson(extractGraph(bundle)) + "\n");
  return 0;
}
