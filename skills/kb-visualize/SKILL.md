---
name: kb-visualize
description: Render a knowledge bundle as an interactive graph — native UI where the host supports it, otherwise a self-contained HTML artifact.
disable-model-invocation: true
---

# kb-visualize — see the bundle as a graph

Render a [bundle](../kb/SKILL.md) as an interactive **force-directed graph** of its concepts, so a
human can see its shape — hubs, clusters, orphans, and how concepts connect. You author the view from
a deterministic graph model, so it can adapt to the request (a whole-bundle map, or a subgraph around
one concept); it is not a fixed template.

## 1. Extract the graph model

Run the bundled extractor against the target bundle (default `knowledge/`):

```
python3 "${CLAUDE_SKILL_DIR}/scripts/graph.py" <bundle-dir>
```

It prints JSON: `nodes` (each with `id`, `type`, `title`, `description`, `tags`, `resource`,
`status`, `body`, `links`, `cited_by`), the distinct `types`, and `edges`. Backlinks (`cited_by`) and
edges are already computed from the cross-links in concept bodies. If the user scoped the request to
one concept/area, filter the model to that node plus its neighbors.

**Completion criterion:** you have the graph model, and (if scoped) filtered it to the requested
subgraph.

## 2. Choose the output form by host capability

- **Host renders interactive UI** (e.g. Claude Desktop, Codex Desktop, an MCP-Apps host): render the
  graph **as native UI** so it's live in the conversation.
- **Host is text/artifact only** (e.g. Claude Code, a terminal): write a **self-contained HTML file**
  (single file, no backend, CDN libs only) next to the bundle or as an artifact, and give the user
  the path.

If unsure whether the host renders UI, default to the HTML file — it works everywhere.

**Completion criterion:** the output form matches the host's capability.

## 3. Render the view

Whichever form, the view must show (mirroring a conformant OKF viewer):

- A **force-directed graph**: one node per concept, **colored by `type`**, directed **edges** from
  each cross-link. A layout the user can switch (e.g. cose / concentric / breadth-first / grid) is a
  plus.
- A **detail panel** for the selected node: its frontmatter (`description`, `resource` as a link,
  `tags`) and its rendered markdown `body`, with internal concept links rewired to **navigate within
  the view** (select that node) rather than following a file path.
- A **"Cited by"** list per node, from `cited_by` (the reverse link graph).
- A **search box** (matches title, id, tags) and a **type filter**.

For the HTML form, a proven stack is Cytoscape.js (graph) + marked (markdown) from a CDN, with the
graph model inlined as a JSON literal so the file is self-contained and nothing leaves the page. All
node data is already in the model from step 1 — do not re-read the bundle.

**Completion criterion:** the rendered view shows the graph (colored by type), a working detail panel
with in-view link navigation, backlinks, search, and type filter.

## 4. Deliver

Hand over the result: for UI, the live view; for HTML, the file path (and note it can be committed
next to the bundle, shared as an artifact, or hosted on any static file server). This is a read-only
consumer — it never modifies the bundle, so no log entry.

**Completion criterion:** the user has the view or its path.
