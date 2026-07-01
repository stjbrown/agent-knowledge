---
type: Concept
title: Three-Layer Architecture
description: An LLM Wiki has three layers — immutable raw sources, the LLM-owned wiki, and a co-evolved schema/config document.
tags: [pattern, architecture, core]
timestamp: 2026-07-01
---

# Three-Layer Architecture

The [LLM Wiki](./llm_wiki.md) pattern separates concerns into three layers. Keeping them
distinct is what makes the LLM a disciplined maintainer rather than a generic chatbot.

## 1. Raw sources

Your curated collection of source documents: articles, papers, images, transcripts, data files.
These are **immutable** — the LLM reads from them but never modifies them. This is your source
of truth and your audit trail. In the [ingest](../operations/ingest.md) operation, a source is
read once and then moved to a "processed" location; it is never rewritten.

## 2. The wiki

A directory of LLM-generated markdown files: summaries, entity pages, concept pages,
comparisons, overviews, syntheses. **The LLM owns this layer entirely** — it creates pages,
updates them as new sources arrive, maintains cross-references, and keeps everything consistent.
You read it; the LLM writes it. Expressed in OKF, this layer is a
[knowledge bundle](./knowledge_bundle.md) of [concept documents](./concept_document.md).

## 3. The schema

A configuration document — `CLAUDE.md`, `AGENTS.md`, or an in-bundle config — that tells the LLM
how the wiki is structured, what the conventions are, and what workflows to follow when
ingesting, querying, or maintaining. Karpathy calls this "the key configuration file." It is
co-evolved over time as you learn what works for your domain.

This layer is the pivot for **portability**: if the operations are generic and all
domain knowledge (the section taxonomy, the `type` values, the workflows) lives in the schema,
then the same skills can drive a work wiki, a book companion, or a research corpus. The portable
skills we are building read this schema; the schema makes them fit the project.

# Citations

1. [Karpathy — LLM Wiki gist](../references/karpathy_llm_wiki.md)
