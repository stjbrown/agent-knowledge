---
type: Concept
title: LLM Wiki
description: A persistent, LLM-maintained knowledge base that compiles knowledge once and keeps it current, sitting between you and your raw sources.
tags: [pattern, knowledge-base, core]
timestamp: 2026-07-01
---

# LLM Wiki

The **LLM Wiki** is a pattern for building knowledge bases where an LLM agent incrementally
builds, cross-references, and maintains a structured, interlinked collection of markdown files
that sits between you and your raw sources. The pattern originates from
[Andrej Karpathy's idea file](../references/karpathy_llm_wiki.md).

The core move: instead of retrieving from raw documents at query time
(see [RAG vs. LLM Wiki](./rag_vs_llm_wiki.md)), the LLM reads each new source, extracts
the key information, and integrates it into the existing wiki — updating entity pages, revising
summaries, flagging contradictions, strengthening the evolving synthesis. Knowledge is
**compiled once and then kept current**, not re-derived on every query. This is what makes the
wiki a [compounding artifact](./compounding_artifact.md).

## Division of labor

You never (or rarely) write the wiki yourself. The LLM owns the writing and maintenance; you
own sourcing, exploration, and asking good questions. This split is what makes the pattern
practical — see [why it works](#why-it-works).

The workflow Karpathy describes: the LLM agent open on one side, a markdown editor
(e.g. Obsidian) on the other. The LLM edits based on the conversation; you browse the results
in real time. *"Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase."*

## Structure

An LLM Wiki has [three layers](./three_layer_architecture.md): immutable raw sources,
the LLM-owned wiki, and a schema/config document that tells the LLM how the wiki is organized.
The wiki itself can be expressed as an OKF [knowledge bundle](./knowledge_bundle.md) —
that is exactly what this repository does.

## Operations

Three operations keep the wiki alive:

* [Ingest](../operations/ingest.md) — process a new source into the wiki.
* [Query](../operations/query.md) — answer a question, and file good answers back.
* [Lint](../operations/lint.md) — periodically health-check the wiki.

## Why it works

The tedious part of maintaining a knowledge base is not the reading or the thinking — it is the
bookkeeping: updating cross-references, keeping summaries current, noting contradictions,
maintaining consistency across dozens of pages. Humans abandon wikis because the maintenance
burden grows faster than the value. LLMs don't get bored, don't forget to update a
cross-reference, and can touch fifteen files in one pass. The wiki stays maintained because the
cost of maintenance is near zero. This is the same problem the [Memex](./memex.md) could
not solve in 1945: who does the maintenance.

# Citations

1. [Karpathy — LLM Wiki gist](../references/karpathy_llm_wiki.md)
