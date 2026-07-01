---
type: Concept
title: Critiques & Open Problems
description: The substantive objections to the LLM Wiki pattern from the community — truth maintenance / KB poisoning, token cost at scale, and markdown-vs-database — and what they imply for our design.
tags: [ecosystem, critique, design-input]
timestamp: 2026-07-01
---

# Critiques & Open Problems

The most useful signal in the [gist](../references/karpathy_llm_wiki.md) thread is not the flood of
implementations but the recurring, well-argued **objections**. Each maps to a concrete design
choice for our portable skills.

## 1. Truth maintenance and knowledge-base poisoning

The single most-repeated concern (commenter `laphilosophia`; the "hidden flaw" article by
`foundanand`). The appealing part of the pattern — the LLM owns synthesis — is exactly where models
fail *quietly*: bad synthesis, stale claims surviving new evidence, page sprawl, and **false
consistency** accumulate invisibly because every output still looks coherent. The sharpest framing:
once LLM-authored summaries are indexed alongside sources, later passes retrieve and reason over
*AI output* rather than ground truth — a self-referential drift away from reality.

The risky sentence is *"the LLM owns this layer entirely."* Fine for low-stakes personal use; too
aggressive for team or high-accuracy contexts.

**Proposed fixes (from the thread):** source-grounded, citation-first, **review-gated** wikis where
the LLM proposes patches rather than being the final authority; extract only *verifiable structure*
(entities, relationships, citations) and keep narrative synthesis lighter or query-time; tie every
claim to a source, an uncertainty level, and recency.

**Implication for us:** this is the strongest argument for adopting
[the OKF-native agent's trust model](../implementations/okf_native_agent.md) — append-only on meaning,
supersede-with-provenance, `conflicts_with` over silent overwrite, and mandatory
[citations](../spec/citations.md) — as the *default* behavior of our [ingest](../operations/ingest.md)
and [lint](../operations/lint.md) skills, not an optional extra. It also raises the stakes on
[lint](../operations/lint.md): drift detection is a core feature, not hygiene.

## 2. Token cost is postponed, not eliminated

(`jgravelle`, "a radical diet…"; echoed by `YokoPunk`, `druce`, and others.) The pattern trades
per-query retrieval cost for per-session **compilation** cost. That holds until the wiki outgrows
the context window: past roughly 50–100K tokens the [index.md](../spec/index_files.md) becomes a
bottleneck, [progressive-disclosure](../concepts/progressive_disclosure.md) navigation gets
unreliable, and answers degrade. *"You didn't eliminate retrieval. You postponed it."*

**Proposed fixes:** treat the wiki as a queryable dataset — `search_sections` / `get_section`
retrieval of only relevant chunks (claims of ~95% context reduction); add TLDRs at the top of each
page so an index scan → TLDR → drill-down saves tokens; add a real search engine.

**Implication for us:** [qmd](../references/qmd.md) (or an FTS/section-retrieval tool) is not a
"someday" nicety — it is the answer to the scaling objection, and our [query](../operations/query.md)
skill should be built to *degrade gracefully* from pure index navigation to search-backed retrieval.
Consider a `TLDR`/`description`-first read convention.

## 3. Markdown vs. database

A principled minority (`buremba`/owletto in PostgreSQL; `gnusupport`'s "Hyperscope" PostgreSQL
argument) hold that for **deterministic**, strongly-typed knowledge with reliable queries, a
database with an event log beats a pile of markdown. Entity types get strict schemas; the agent
gets SQL.

**Implication for us:** this is a genuine trade-off, not a mistake to refute. Markdown wins on
portability, diffability, human-readability, and zero-infra — the whole [OKF thesis](../spec/motivation.md).
A database wins on query determinism and typed integrity. OKF's [frontmatter](../spec/frontmatter.md)
is the hedge: structured, queryable metadata on top of prose. Worth stating explicitly in our docs
*when* the file-based approach is the wrong tool.

## 4. "Isn't this just…?"

Recurring skeptical takes worth answering, not dismissing: *"just structured context / a good
`AGENTS.md` hierarchy"* (`skpalan`), *"NotebookLM already does this,"* *"this is the
[Zettelkasten](https://zettelkasten.de/introduction/) / second-brain idea again,"* and the
[Memex](../concepts/memex.md)/Engelbart lineage. The honest answer: the *novel* part is not the wiki
but **who maintains it** — the pattern is only interesting because the LLM makes the bookkeeping
cost near-zero (see [why it works](../concepts/llm_wiki.md#why-it-works)). The lint pass — periodic
self-audit — is what most "just structured context" setups lack and what everyone concedes is
valuable.

# Citations

1. [Karpathy — LLM Wiki gist](../references/karpathy_llm_wiki.md) (comments: laphilosophia, skpalan, YokoPunk, buremba, gnusupport)
2. "The Hidden Flaw in Karpathy's LLM Wiki" — <https://foundanand.medium.com/the-hidden-flaw-in-karpathys-llm-wiki-e3a86a94b459>
3. "A Radical Diet for Karpathy's Token-Eating LLM Wiki" — <https://dev.to/jgravelle/a-radical-diet-for-karpathys-token-eating-llm-wiki-59ng>
