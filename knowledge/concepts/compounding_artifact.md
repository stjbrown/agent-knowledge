---
type: Concept
title: Compounding Artifact
description: The defining property of an LLM Wiki — knowledge is compiled once and kept current, so the wiki gets richer with every source and every query.
tags: [pattern, core]
timestamp: 2026-07-01
---

# Compounding Artifact

The key difference between an [LLM Wiki](./llm_wiki.md) and query-time retrieval is that
**the wiki is a persistent, compounding artifact**. The cross-references are already there. The
contradictions have already been flagged. The synthesis already reflects everything you've read.
The wiki keeps getting richer with every source you add and every question you ask.

## Two ways knowledge compounds

**Ingested sources compound.** Each new source is not merely indexed for later retrieval; it is
integrated. A single source might touch 10–15 pages — updating entity pages, revising summaries,
adding cross-links. See [ingest](../operations/ingest.md).

**Queries compound too.** A good answer — a comparison, a multi-source analysis, a discovered
connection — should not disappear into chat history. It can be filed back into the wiki as a new
page. This way explorations accumulate just like sources do. See [query](../operations/query.md).

## Contrast

This is precisely what [RAG](./rag_vs_llm_wiki.md) does *not* do: with retrieval, the
LLM rediscovers knowledge from scratch on every question and nothing is built up. The compounding
property is also why the [lint](../operations/lint.md) operation matters — a compounding artifact
accumulates drift (stale claims, orphans, contradictions) that must be periodically swept.

# Citations

1. [Karpathy — LLM Wiki gist](../references/karpathy_llm_wiki.md)
