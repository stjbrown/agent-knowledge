---
type: Reference
title: qmd
description: A local, on-device markdown search engine with hybrid BM25 + vector search and LLM re-ranking, exposed as both a CLI and an MCP server.
resource: https://github.com/tobi/qmd
tags: [tool, search, external, optional]
timestamp: 2026-07-01
---

# qmd

**qmd** is a local search engine for markdown files, recommended in the
[Karpathy gist](./karpathy_llm_wiki.md) as the tool to reach for when a
[bundle](../concepts/knowledge_bundle.md) outgrows what [index files](../spec/index_files.md) can
handle for navigation.

## What it is

* **Hybrid retrieval** — BM25 keyword search plus vector similarity, with **LLM re-ranking**.
* **On-device** — runs locally; no data leaves the machine.
* **Two interfaces** — a **CLI** (an agent can shell out to it) and an **MCP server** (an agent
  can call it as a native tool).

## When to use it in the LLM Wiki pattern

At small-to-moderate scale, the [index file](../spec/index_files.md) plus
[progressive disclosure](../concepts/progressive_disclosure.md) is enough — do not add search
prematurely. As the bundle grows to many hundreds or thousands of concepts, a search tool becomes
the efficient way for the [query](../operations/query.md) operation to find candidate pages before
reading them. Note the retrieved unit is still a synthesized [concept](../concepts/concept_document.md),
not a raw chunk — this is search *over the wiki*, not [RAG](../concepts/rag_vs_llm_wiki.md) over raw
sources.

# Citations

1. qmd — <https://github.com/tobi/qmd>
2. [Karpathy — LLM Wiki gist](./karpathy_llm_wiki.md)
