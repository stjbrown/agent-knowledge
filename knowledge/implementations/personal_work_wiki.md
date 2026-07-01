---
type: Implementation
title: Personal Work Wiki
description: A working personal work wiki on the LLM Wiki pattern — an Obsidian-compatible vault maintained by Claude Code skills (ingest, query, lint, status). Predates OKF conventions.
tags: [implementation, obsidian, claude-code, skills, prior-art]
timestamp: 2026-07-01
---

# Personal Work Wiki

A working, single-user instantiation of the [LLM Wiki](../concepts/llm_wiki.md) pattern (the
author's private project): an Obsidian-compatible markdown vault maintained by Claude Code skills. It
is the most direct prior art for the portable skills we are building — the
[operations](../operations/index.md) pages are distilled largely from it.

## Structure

* `raw_ingests/` — the immutable [raw sources](../concepts/three_layer_architecture.md#1-raw-sources)
  drop zone, with a `processed/` subdir sources move to after ingest.
* `wiki/` — the LLM-owned bundle: `00_index.md`, `01_log.md`, and domain sections (e.g.
  `people/`, `deals/`, `product/`, `themes/`), each with an `_overview.md` roll-up.
* `CLAUDE.md` — the [schema layer](../concepts/three_layer_architecture.md#3-the-schema): structure,
  conventions, metadata schema, and constraints.
* `.skills/` — the operations as skills: `ingest`, `query`, `lint`, `status`, plus domain-specific
  ones.

## Conventions (and how they differ from OKF)

It predates and diverges from strict [OKF](../spec/index.md); mapping the gaps is the point of
studying it:

| this wiki | OKF v0.1 |
|---|---|
| Obsidian `[[wikilinks]]` with path + alias | standard [markdown links](../spec/cross_linking.md) |
| `00_index.md`, `01_log.md` (numbered) | reserved [`index.md`](../spec/index_files.md), [`log.md`](../spec/log_files.md) |
| required `title`, `type`, `created` | required [`type`](../spec/frontmatter.md) only |
| `created` / `updated` dates | recommended `timestamp` |
| closed `type` enum (person/deal/…) | open, producer-chosen `type` |

The lessons carry over cleanly even though the surface conventions don't: extract-don't-restate,
immutable sources, append-only log, re-synthesized overviews, both-directions cross-links, index as
navigation entry point.

## Relevance to the portable skills

It proves the pattern works day-to-day but bakes its taxonomy into both `CLAUDE.md` *and* the skill
bodies (its `ingest` skill hard-codes sections like `people/` and `deals/`). The portability goal is
to lift that domain knowledge entirely into the
[schema layer](../concepts/three_layer_architecture.md#3-the-schema) so the
[ingest](../operations/ingest.md)/[query](../operations/query.md)/[lint](../operations/lint.md)
skills carry none of it — and to target the OKF surface conventions instead of Obsidian's.

# Citations

1. A private personal-work-wiki project (not public).
