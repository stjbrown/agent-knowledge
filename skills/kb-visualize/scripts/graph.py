#!/usr/bin/env python3
"""Extract the graph model of an OKF bundle as JSON — the deterministic half of
kb-visualize. The agent renders this model into a view (HTML artifact or native UI).

Usage:  python3 graph.py <bundle-dir>   # prints graph JSON to stdout

Output:
{
  "bundle": "<dir>",
  "nodes": [ { "id", "path", "type", "title", "description", "tags",
               "resource", "status", "body", "links": [ids], "cited_by": [ids] } ],
  "types": [ "type", ... ],          # distinct types, for coloring/filter
  "edges": [ { "source": id, "target": id } ]
}

Node id = concept id = path within the bundle minus `.md`. Reserved index.md/log.md
are excluded (they are not concepts). Links are resolved to concept ids; links whose
target does not exist in the bundle are dropped from edges (SPEC §5.3 tolerates them).
"""
import os, re, sys, json, posixpath

RESERVED = {"index.md", "log.md"}
FM_RE = re.compile(r"^---\n(.*?)\n---\n?", re.S)
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)#\s]+\.md)(?:#[^)]*)?\)")


def parse_frontmatter(fm):
    """Minimal YAML: scalars and simple `[a, b]` / `- item` lists. No deps."""
    data, key = {}, None
    for line in fm.splitlines():
        if re.match(r"^\s+-\s+", line) and key:
            data.setdefault(key, [])
            if isinstance(data[key], list):
                data[key].append(line.strip()[2:].strip().strip('"\''))
            continue
        m = re.match(r"^([A-Za-z0-9_]+):\s*(.*)$", line)
        if not m:
            continue
        key, val = m.group(1), m.group(2).strip()
        if val == "":
            data[key] = []          # a list follows on subsequent `-` lines
        elif val.startswith("[") and val.endswith("]"):
            data[key] = [x.strip().strip('"\'') for x in val[1:-1].split(",") if x.strip()]
        else:
            data[key] = val.strip('"\'')
    return data


def concept_id(rel):
    return rel[:-3] if rel.endswith(".md") else rel


def resolve(src_rel, target):
    """Resolve a markdown link target (relative or bundle-absolute) to a concept id."""
    if target.startswith("/"):
        resolved = target.lstrip("/")
    else:
        resolved = posixpath.normpath(posixpath.join(posixpath.dirname(src_rel), target))
    return concept_id(resolved)


def build(bundle):
    md = []
    for dp, _, fs in os.walk(bundle):
        for f in fs:
            if f.endswith(".md"):
                md.append(os.path.relpath(os.path.join(dp, f), bundle))

    nodes, ids = {}, set()
    for rel in md:
        if os.path.basename(rel) in RESERVED:
            continue
        ids.add(concept_id(rel))

    for rel in sorted(md):
        if os.path.basename(rel) in RESERVED:
            continue
        text = open(os.path.join(bundle, rel), encoding="utf-8").read()
        m = FM_RE.match(text)
        fm = parse_frontmatter(m.group(1)) if m else {}
        body = text[m.end():] if m else text
        cid = concept_id(rel)
        links = []
        for lm in LINK_RE.finditer(body):
            tgt = lm.group(1)
            if "://" in tgt:
                continue
            rid = resolve(rel, tgt)
            if rid in ids and rid != cid and rid not in links:
                links.append(rid)
        nodes[cid] = {
            "id": cid, "path": rel,
            "type": fm.get("type", ""),
            "title": fm.get("title", cid.rsplit("/", 1)[-1]),
            "description": fm.get("description", ""),
            "tags": fm.get("tags", []) if isinstance(fm.get("tags", []), list) else [fm.get("tags")],
            "resource": fm.get("resource", ""),
            "status": fm.get("status", "active"),
            "body": body.strip(),
            "links": links, "cited_by": [],
        }

    edges = []
    for n in nodes.values():
        for tgt in n["links"]:
            edges.append({"source": n["id"], "target": tgt})
            nodes[tgt]["cited_by"].append(n["id"])

    types = sorted({n["type"] for n in nodes.values() if n["type"]})
    return {"bundle": bundle, "nodes": list(nodes.values()), "types": types, "edges": edges}


def main(argv):
    bundle = next((a for a in argv[1:] if not a.startswith("--")), ".")
    if not os.path.isdir(bundle):
        print(f"not a directory: {bundle}", file=sys.stderr)
        return 2
    print(json.dumps(build(bundle), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
