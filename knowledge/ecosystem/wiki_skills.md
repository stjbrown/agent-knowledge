---
type: Reference
title: wiki-skills (kfchou)
description: LLM-maintained personal wiki skills for Claude Code that implement Karpathy's pattern — the closest in shape to what this project is building (~160 stars).
resource: https://github.com/kfchou/wiki-skills
tags: [ecosystem, featured, skills, claude-code]
timestamp: 2026-07-01
---

# wiki-skills (kfchou)

`kfchou/wiki-skills` (~160★) is a set of **LLM-maintained personal wiki skills for Claude Code**
that directly implements the [gist](../references/karpathy_llm_wiki.md) pattern.

## Why it's worth studying

* It is **the closest in shape** to our plan: Claude Code skills that carry the
  [operations](../operations/index.md), scoped to personal wikis — the same runtime and packaging we
  intend, minus the [OKF](../spec/index.md) format commitment.
* Smaller and more focused than [OmegaWiki](./omegawiki.md) or
  [Astro-Han's](./karpathy_llm_wiki_astro.md) multi-tool build — a good reference for a
  minimal, readable skill set.

## Relevance to us

Between this and [karpathy-llm-wiki](./karpathy_llm_wiki_astro.md) we have two concrete
"skills that maintain a wiki" precedents to learn ergonomics from. Our contribution on top:
conformance to the OKF [spec](../spec/index.md), the portable [schema-layer](../concepts/three_layer_architecture.md#3-the-schema)
seam so one skill set fits many domains, and the [trust model](./critiques.md) as default.

# Citations

1. wiki-skills — <https://github.com/kfchou/wiki-skills>
