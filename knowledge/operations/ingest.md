---
type: Operation
title: Ingest
description: Read a new raw source, extract entities and signals, and integrate them across the bundle — creating and updating concepts, cross-links, indexes, and the log.
tags: [operation, workflow, core]
timestamp: 2026-07-01
---

# Ingest

**Ingest** is the primary [LLM Wiki](../concepts/llm_wiki.md) operation: process a new raw source
into the bundle so knowledge [compounds](../concepts/compounding_artifact.md) rather than being
re-derived per query. The defining principle: **the wiki is the compiled artifact, not a
cleaned-up copy of the source.** You extract entities, themes, and signals — you do not restate
the note.

## Flow

A typical ingest, distilled from the [the personal work wiki](../implementations/personal_work_wiki.md):

1. **Read & classify** the source (transcript, email, note, document, image). Sources may be any
   format the agent can read.
2. **Extract entities and signals.** For each meaningful entity, create or update the appropriate
   [concept document](../concepts/concept_document.md) in the right section of the bundle.
3. **Write valid frontmatter** on every new or touched concept — at minimum a non-empty
   [`type`](../spec/frontmatter.md); set `timestamp` on meaningful change.
4. **Add [cross-links](../spec/cross_linking.md)** in both directions between related concepts —
   a person named in a deal links to their page and back.
5. **Re-synthesize overviews.** Any section that changed gets its roll-up/overview rewritten to
   reflect the new state — an overview is a synthesis, not a file listing.
6. **Update [index files](../spec/index_files.md)** so [progressive disclosure](../concepts/progressive_disclosure.md)
   stays reliable.
7. **Append to the [log](../spec/log_files.md)** — one dated entry recording source, concepts
   created/updated, and themes found. Append-only; never edit past entries.
8. **Retire the source.** Move the raw source to a processed location. Raw sources are
   [immutable](../concepts/three_layer_architecture.md#1-raw-sources) — move, never modify.
9. **Commit** (when the bundle is a git repo) with a message summarizing what was ingested.

## Supervision

Ingest one source at a time with a human in the loop (read the summaries, guide emphasis) or
batch-ingest many with less supervision. A single rich source can touch 10–15 concepts. The right
cadence is a per-project choice and belongs in the [schema layer](../concepts/three_layer_architecture.md#3-the-schema).

# Citations

1. [Karpathy — LLM Wiki gist](../references/karpathy_llm_wiki.md)
2. [personal work wiki](../implementations/personal_work_wiki.md)
