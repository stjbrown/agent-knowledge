---
type: Reference
title: karpathy-llm-wiki (Astro-Han)
description: An Agent-Skills-compatible LLM wiki for Claude Code, Cursor, and Codex — build a Karpathy-style knowledge base from raw sources with citations and linting (~1.3k stars).
resource: https://github.com/Astro-Han/karpathy-llm-wiki
tags: [ecosystem, featured, skills, multi-agent-tool]
timestamp: 2026-07-01
---

# karpathy-llm-wiki (Astro-Han)

`Astro-Han/karpathy-llm-wiki` (~1.3k★) is an **Agent-Skills-compatible** LLM wiki that works across
Claude Code, Cursor, and Codex. It builds a Karpathy-style knowledge base from raw sources with
first-class **citations and linting**.

## Why it's worth studying

* It is the closest high-traction analogue to **our exact deliverable**: portable *skills* (not a
  platform) that make an agent maintain a wiki, and explicitly multi-tool rather than Claude-only.
* Citations and [lint](../operations/lint.md) are built in — an implicit acknowledgment of the
  [truth-maintenance critique](./critiques.md#1-truth-maintenance-and-knowledge-base-poisoning).

## Relevance to us

The key differentiator remains **format**: like almost all of the [ecosystem](./landscape.md),
this project uses a bespoke/Obsidian-flavored convention rather than a conformant
[OKF](../spec/index.md) bundle. It is the strongest prior art for "how to package the workflow as
cross-agent skills," and the best place to study skill ergonomics before we write our own. Compare
directly with [wiki-skills](./wiki_skills.md).

# Citations

1. karpathy-llm-wiki — <https://github.com/Astro-Han/karpathy-llm-wiki>
