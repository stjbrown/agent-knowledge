---
type: Concept
title: Memex
description: Vannevar Bush's 1945 vision of a personal, curated knowledge store with associative trails — the intellectual antecedent of the LLM Wiki, blocked only by the maintenance problem.
tags: [lineage, history]
timestamp: 2026-07-01
---

# Memex

The [LLM Wiki](./llm_wiki.md) is related in spirit to Vannevar Bush's **Memex**,
described in his 1945 essay *As We May Think*. The Memex was a vision of a personal, curated
knowledge store with **associative trails** between documents — where the connections between
documents are as valuable as the documents themselves.

Bush's vision was closer to the LLM Wiki than to what the web actually became: private, actively
curated, with links as first-class value. The web optimized for scale and publication; the Memex
imagined a private thinking tool.

## The part Bush couldn't solve

The Memex assumed a human would build and maintain the trails. That is exactly the
[bookkeeping burden](./llm_wiki.md#why-it-works) that causes humans to abandon knowledge
bases: maintaining associative links by hand doesn't scale, and the value decays as the store
grows. The LLM handles that maintenance — it doesn't get bored and can update every
cross-reference in one pass. In this framing, the LLM Wiki is the Memex with the maintenance
problem finally solved.

# Citations

1. [Karpathy — LLM Wiki gist](../references/karpathy_llm_wiki.md)
2. Vannevar Bush, "As We May Think," *The Atlantic*, July 1945.
