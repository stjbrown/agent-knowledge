---
type: Concept
title: Progressive Disclosure
description: Navigating a growing bundle one level at a time through index files, so an agent finds relevant pages without loading everything.
tags: [pattern, navigation]
timestamp: 2026-07-01
---

# Progressive Disclosure

**Progressive disclosure** is the technique of navigating a [knowledge bundle](./knowledge_bundle.md)
one directory level at a time, using [index files](../spec/index_files.md) as the map, rather than
loading the whole bundle into context. It is how both agents and humans stay oriented as a wiki
grows to hundreds of pages.

## How it works

Each directory can carry an `index.md` that lists its contents — a link and one-line description
per concept, grouped under headings. An agent answering a [query](../operations/query.md) reads the
root index first, follows the relevant section index, and only then reads the specific concept
pages it needs. The [cross-links](../spec/cross_linking.md) between concepts let it fan out from
there. This works surprisingly well at moderate scale (~100 sources, hundreds of pages) and
avoids the need for embedding-based retrieval infrastructure.

## Why it scales

Index files are cheap to read and give the agent a content-oriented catalog of what exists.
Because the bundle is [graph-shaped, not just tree-shaped](../spec/cross_linking.md), the agent can
also traverse relationships directly once it has a foothold. When a bundle outgrows what index
files can handle, add a search tool such as [qmd](../references/qmd.md) — but not before.

Progressive disclosure is a primary motivation for keeping [index files](../spec/index_files.md)
current on every [ingest](../operations/ingest.md); a stale index defeats the mechanism.

# Citations

1. [OKF README & Reference Agent](../references/okf_readme.md)
2. [Karpathy — LLM Wiki gist](../references/karpathy_llm_wiki.md)
