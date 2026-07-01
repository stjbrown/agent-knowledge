---
type: Concept
title: RAG vs. LLM Wiki
description: Retrieval-augmented generation rediscovers knowledge on every query; an LLM Wiki compiles it once and maintains it.
tags: [comparison, rag]
timestamp: 2026-07-01
---

# RAG vs. LLM Wiki

Most people's experience with LLMs and documents is **RAG** (retrieval-augmented generation):
you upload a collection of files, the LLM retrieves relevant chunks at query time, and generates
an answer. NotebookLM, ChatGPT file uploads, and most RAG systems work this way.

The [LLM Wiki](./llm_wiki.md) pattern is different in one decisive way.

| | RAG | LLM Wiki |
|---|---|---|
| When knowledge is synthesized | At query time, from raw chunks | At ingest time, into pages |
| Persistence | Nothing accumulates between queries | A [compounding artifact](./compounding_artifact.md) |
| Cross-references | Re-discovered per question | Already written and maintained |
| Contradictions | Re-encountered each time | Flagged once, during ingest |
| Answer to a 5-document question | Re-piece the fragments every time | Read the page that already synthesized them |
| Infrastructure | Embeddings + vector store | Markdown files + [index](../spec/index_files.md) (add search later) |

RAG's weakness is not accuracy but **amnesia**: the LLM is rediscovering knowledge from scratch
on every question, so nothing is built up. Ask a subtle question that requires synthesizing five
documents and the LLM has to find and piece together the fragments every single time.

The LLM Wiki front-loads that synthesis into the [ingest](../operations/ingest.md) step, so at
query time the work is mostly navigation ([progressive disclosure](./progressive_disclosure.md))
rather than rediscovery. The two are not mutually exclusive — a large wiki can still use search
such as [qmd](../references/qmd.md) to find pages — but the retrieved unit is a synthesized page,
not a raw chunk.

For a visual version of this contrast — "search all 100 PDFs every query" vs. "read once, compile
one concept per file, follow links" — see the
[OKF vs. RAG infographic](../references/okf_vs_rag_infographic.md).

# Citations

1. [Karpathy — LLM Wiki gist](../references/karpathy_llm_wiki.md)
