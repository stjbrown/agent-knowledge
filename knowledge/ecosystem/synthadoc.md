---
type: Reference
title: synthadoc
description: An open-source LLM knowledge-compilation engine that turns raw documents into structured, local-first wikis with no tools — a transparent, self-managed alternative to RAG (~534 stars).
resource: https://github.com/axoviq-ai/synthadoc
tags: [ecosystem, featured, compiler, no-tools]
timestamp: 2026-07-01
---

# synthadoc

`axoviq-ai/synthadoc` (~534★) is an open-source **knowledge-compilation engine**: it turns raw
documents into structured, local-first wikis and pitches itself as a transparent, human-readable
alternative to RAG that is *self-managed and self-improving without using any tools*.

## Why it's worth studying

* Actively engaged with the hard problems from the [critiques](./critiques.md): its docs
  cover **adversarial review**, **claim provenance**, **page lifecycle** management, and **query
  caching** — i.e. exactly the truth-maintenance and token-cost objections.
* "No tools" self-management is a useful contrast to the search-tool-backed scaling answer — it bets
  that disciplined compilation plus caching is enough.
* One of the more mature efforts (multiple releases, quick-start + design docs, web + CLI + Obsidian
  query paths).

## Relevance to us

synthadoc is the best worked example of *engineering answers* to the
[critiques](./critiques.md): adversarial review and claim-provenance features are concrete
versions of the [review-gated, citation-first](./critiques.md#1-truth-maintenance-and-knowledge-base-poisoning)
fix, and query caching addresses the [token-cost](./critiques.md#2-token-cost-is-postponed-not-eliminated)
objection. Strong prior art to mine when we decide how much of the trust model our
[lint](../operations/lint.md) and [ingest](../operations/ingest.md) skills enforce.

# Citations

1. synthadoc — <https://github.com/axoviq-ai/synthadoc>
