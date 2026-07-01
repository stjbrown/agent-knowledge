---
type: Operation
title: Query
description: Navigate the bundle via its indexes and links, synthesize an answer with citations, and file valuable answers back as new concepts so explorations compound.
tags: [operation, workflow, core]
timestamp: 2026-07-01
---

# Query

**Query** answers a question against the [bundle](../concepts/knowledge_bundle.md). Because the
synthesis was front-loaded at [ingest](./ingest.md) time, query is mostly navigation and
assembly rather than rediscovery — the key contrast with [RAG](../concepts/rag_vs_llm_wiki.md).

## Flow

1. **Navigate** via [progressive disclosure](../concepts/progressive_disclosure.md): read the root
   [index](../spec/index_files.md) first, then the relevant section index, to locate candidate
   concepts. At larger scale, add a search tool such as [qmd](../references/qmd.md).
2. **Read relevant concepts,** following [cross-links](../spec/cross_linking.md) to gather the
   pieces. Good answers often span several concepts across sections — this is where the bundle's
   maintained cross-references pay off.
3. **Synthesize** a direct answer, **citing** the specific concepts used, and surface non-obvious
   connections.
4. **File valuable answers back.** This is the compounding move: a comparison, a multi-source
   analysis, a discovered pattern, or a strategic insight should be written as a new concept —
   with frontmatter, cross-links, updated overview/index, and a [log](../spec/log_files.md) entry —
   rather than left to evaporate in chat history. A simple factual lookup does not need to become
   a page.

## Answer forms

An answer can take whatever form fits the question — prose, a comparison table, a slide deck, a
chart. The form is a delivery detail; what matters for [compounding](../concepts/compounding_artifact.md)
is whether the underlying synthesis gets filed back into the bundle.

# Citations

1. [Karpathy — LLM Wiki gist](../references/karpathy_llm_wiki.md)
2. [personal work wiki](../implementations/personal_work_wiki.md)
