---
type: Reference
title: Karpathy — LLM Wiki gist
description: Andrej Karpathy's idea file describing the LLM Wiki pattern — a persistent, LLM-maintained knowledge base — meant to be handed to your own agent to instantiate.
resource: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
tags: [llm-wiki, source, external, origin]
timestamp: 2026-07-01
---

# Karpathy — LLM Wiki gist

The origin of the [LLM Wiki](../concepts/llm_wiki.md) pattern. It is deliberately an **idea file**:
abstract by design, meant to be copy-pasted to your own LLM agent so you and the agent instantiate
a concrete version for your domain. It describes the pattern, not an implementation. A local copy
lives in the repo as `LLM_Wiki_Abstract.md`.

## What it establishes

* **The core idea** — compile knowledge once into a persistent, interlinked wiki and keep it
  current, instead of re-deriving it per query. See [RAG vs. LLM Wiki](../concepts/rag_vs_llm_wiki.md)
  and [Compounding Artifact](../concepts/compounding_artifact.md).
* **[Three-layer architecture](../concepts/three_layer_architecture.md)** — immutable raw sources,
  the LLM-owned wiki, and the schema/config file (the most important config).
* **[Operations](../operations/index.md)** — [ingest](../operations/ingest.md),
  [query](../operations/query.md), [lint](../operations/lint.md).
* **[index.md and log.md](../spec/reserved_filenames.md)** — content catalog and chronological
  ledger (OKF later reserves these exact names).
* **Optional tooling** — [qmd](./qmd.md) for search; Obsidian, Marp, Dataview, git.
* **Lineage** — Vannevar Bush's [Memex](../concepts/memex.md).

## Notable community signal

The gist's comments include many implementations, plus recurring lessons: keep raw sources
immutable; the lint pass is not optional (drift is the main failure mode); the schema file is the
most important config; focused retrieval (search → expand → read only relevant sections) beats
dumping whole notes. One production user reported ~4000+ interlinked concepts.

# Citations

1. Karpathy, LLM Wiki gist — <https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f>
