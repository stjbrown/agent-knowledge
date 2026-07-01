---
type: Reference
title: OmegaWiki
description: The most complete realization of the LLM Wiki vision from the gist thread — a wiki-centric, full-lifecycle AI research platform powered by Claude Code (~1.5k stars).
resource: https://github.com/skyllwt/OmegaWiki
tags: [ecosystem, featured, platform, claude-code]
timestamp: 2026-07-01
---

# OmegaWiki

`skyllwt/OmegaWiki` (~1.5k★) bills itself as *"Karpathy's LLM-Wiki vision, fully realized"* — a
wiki-centric, full-lifecycle AI research platform built on Claude Code. It is the highest-profile
faithful implementation to emerge directly from the [gist](../references/karpathy_llm_wiki.md) thread.

## Why it's worth studying

* It treats the wiki as the **center of gravity** of a research workflow, not a side artifact —
  the fullest expression of the [compounding-artifact](../concepts/compounding_artifact.md) idea.
* It spans the whole lifecycle ([ingest](../operations/ingest.md) → [query](../operations/query.md) →
  maintenance), which is the scope we want our skills to cover.
* The same author later shipped `AutoSci` (an autonomous science agent) and a paper — a signal that
  the wiki pattern is being pushed toward autonomous research.

## Relevance to us

OmegaWiki is a monolithic platform; our bet is smaller and more portable — generic
[OKF](../spec/index.md) skills that drop into *any* project's `knowledge/` directory. OmegaWiki is the
benchmark for "what a maximal implementation looks like"; the open question it lets us frame is how
much of that value survives when you strip it down to portable, format-first skills.

# Citations

1. OmegaWiki — <https://github.com/skyllwt/OmegaWiki>
