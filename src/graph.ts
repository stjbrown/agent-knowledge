/**
 * Extract the graph model of an OKF bundle — the deterministic half of
 * kb-visualize. This is the canonical implementation bundled into the
 * kb-visualize skill at build time. The agent renders this model into a view.
 *
 * Node id = concept id = path within the bundle minus `.md`. Reserved
 * index.md/log.md are excluded. Links are resolved to concept ids; links whose
 * target is not a concept in the bundle are dropped (SPEC §6.1 tolerates them).
 */
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  FM_RE,
  RESERVED,
  collectMarkdown,
  conceptId,
  normalizePosix,
  parseYamlFrontmatter,
  pythonJson,
} from "./shared.js";

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
  generated: { by: string; at: string } | null;
  verified: { by: string; at: string }[];
  trust_tier: "unverified" | "machine-confirmed" | "human-reviewed";
  last_changed: string;
  stale_after: string;
  is_stale: boolean;
  sources: Record<string, unknown>[];
  attested_computation: Record<string, unknown> | null;
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

type FrontmatterData = Record<string, unknown>;

/** Parse YAML for graph metadata; malformed frontmatter degrades to an empty map. */
export function parseFrontmatter(fm: string): FrontmatterData {
  return parseYamlFrontmatter(fm).data ?? {};
}

function scalar(data: FrontmatterData, k: string, dflt: string): string {
  const v = data[k];
  if (v === undefined) return dflt;
  return typeof v === "string" ? v : dflt;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function actorEvent(value: unknown): { by: string; at: string } | null {
  const event = record(value);
  if (!event || typeof event["by"] !== "string") return null;
  return {
    by: event["by"],
    at: typeof event["at"] === "string" ? event["at"] : "",
  };
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

    const rawSources = fm["sources"];
    const sources = Array.isArray(rawSources)
      ? rawSources.map(record).filter((source): source is Record<string, unknown> => source !== null)
      : [];
    for (const source of sources) {
      const resource = source["resource"];
      if (typeof resource !== "string") continue;
      const sourcePath = resource.replace(/#.*$/, "");
      if (!sourcePath.endsWith(".md")) continue;
      const rid = resolve(rel, sourcePath);
      if (ids.has(rid) && rid !== cid && !links.includes(rid)) links.push(rid);
    }

    const rawTags = fm["tags"];
    const tags = Array.isArray(rawTags)
      ? rawTags.filter((tag): tag is string => typeof tag === "string")
      : typeof rawTags === "string"
        ? [rawTags]
        : [];

    const generated = actorEvent(fm["generated"]);
    const rawVerified = fm["verified"];
    const verified = (Array.isArray(rawVerified) ? rawVerified : rawVerified === undefined ? [] : [rawVerified])
      .map(actorEvent)
      .filter((event): event is { by: string; at: string } => event !== null);
    const trustTier = verified.some((event) => event.by.startsWith("human:"))
      ? "human-reviewed"
      : verified.length
        ? "machine-confirmed"
        : "unverified";
    const staleAfter = scalar(fm, "stale_after", "");
    const isStale = Boolean(staleAfter && new Date().toISOString().slice(0, 10) >= staleAfter);
    const isAttested = fm["type"] === "Attested Computation";
    const attestedComputation = isAttested
      ? {
          runtime: fm["runtime"] ?? null,
          parameters: fm["parameters"] ?? [],
          computation: fm["computation"] ?? null,
          executor: fm["executor"] ?? null,
          attester: fm["attester"] ?? null,
        }
      : null;

    nodes.set(cid, {
      id: cid,
      path: rel,
      type: scalar(fm, "type", ""),
      title: scalar(fm, "title", cid.split("/").pop() ?? cid),
      description: scalar(fm, "description", ""),
      tags,
      resource: scalar(fm, "resource", ""),
      status: scalar(fm, "status", "stable"),
      generated,
      verified,
      trust_tier: trustTier,
      last_changed: generated?.at || scalar(fm, "timestamp", ""),
      stale_after: staleAfter,
      is_stale: isStale,
      sources,
      attested_computation: attestedComputation,
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
