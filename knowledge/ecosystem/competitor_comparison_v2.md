---
type: Concept
title: Competitor Comparison — current OKF authoring and agent-wiki tools
description: A current comparison of okf-skills, openknowledge, openwiki, and agent-knowledge/Janet after openwiki added OKF output and general-knowledge connector ingestion.
tags: [ecosystem, competitor, design-input, strategy]
timestamp: 2026-07-31
supersedes: competitor_comparison
---

# Competitor Comparison

This updates the [2026-07-01 comparison](./competitor_comparison.md) after
[openwiki](./openwiki_langchain_v2.md) became an OKF producer with a general-knowledge Personal mode,
and after this project shipped the `kb-*` skills plus the Janet CLI. The strategic question is no
longer whether anyone else can ingest into OKF; it is which maintenance guarantees and operating
model each tool provides.

## At a glance

| | **okf-skills** | **openknowledge** | **openwiki** | **agent-knowledge + Janet** |
|---|---|---|---|---|
| Form factor | Portable skills / Claude plugin | Go CLI + agent guidance | TypeScript CLI | Portable skills + macOS agent CLI |
| OKF target | v0.1-era author/validate flows | Version-selectable tooling | Explicitly v0.1 | v0.2 producer/consumer; v0.1 compatibility |
| Code-repository documentation | Yes | Partial | Strong Code mode | Strong `kb-document` flow |
| General-source ingest | No dedicated ingest loop | No dedicated ingest loop | Personal mode connectors | General files, URLs, PDFs, notes, and repository sources |
| Built-in connectors | No | No | Git repositories, Gmail, Notion, X, web search, Hacker News | Host/tool dependent; no first-party connector catalog |
| Query/chat | Agent consumption flow | `use` entrypoint | Interactive code and personal modes | Janet interactive/headless query and maintenance |
| Deterministic conformance | Yes | Yes | README declares conformant output and migration checks | Bundled zero-dependency checker |
| Visualization | Self-contained graph | HTML/JSON/graph exporters | Mermaid inside generated docs | Self-contained bundle graph |
| Truth maintenance | No documented supersede/conflict policy | No equivalent policy documented | README documents no equivalent policy | Successor/tombstone, conflict, provenance, impact sweep |
| Automated maintenance | Agent-driven | Maintenance-loop guidance | Scheduled PR/MR and local source schedules | Agent-driven now; GitHub Action demo planned |

## What changed strategically

OpenWiki removes two former differentiators: **OKF production** and **general-source ingestion** are
no longer unique to this project. Its deterministic connector layer and scheduled maintenance are
also ahead of Janet today and are worth learning from.

The defensible distinction is now the integrity of the compiled knowledge:

1. **Truth maintenance.** A meaning-changing source update creates a successor and preserves the
   original; unresolved disagreement becomes an explicit conflict.
2. **Exhaustive impact propagation.** An ingest searches current comparisons, roll-ups, indexes, and
   strategy pages so a corrected source does not leave stale derived claims behind.
3. **OKF v0.2 provenance and lifecycle.** Structured `sources`, honest producer identity, optional
   verification, freshness, and `deprecated` lifecycle state make trust inspectable.
4. **Portable skill layer.** The knowledge workflow remains usable without Janet and without a
   proprietary runtime.

## What to borrow next

* A deterministic connector boundary that writes auditable raw artifacts before synthesis.
* Scheduled update workflows that open reviewable pull requests.
* Read boundaries such as `.openwikiignore`.
* Diagram validation and repair.

Those are complementary to — not substitutes for — the trust model. The near-term product story
is now **portable OKF v0.2 skills with stronger maintenance semantics**, with Janet as the polished
local operator and GitHub Actions as the next automated review loop.

# Citations

1. [openwiki — current assessment](./openwiki_langchain_v2.md)
2. [okf-skills (scaccogatto)](./okf_skills_scaccogatto.md)
3. [openknowledge (openknowledge-sh)](./openknowledge_cli.md)
4. [Prior competitor comparison](./competitor_comparison.md)
