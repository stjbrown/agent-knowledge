---
type: Reference
title: openwiki (langchain-ai)
description: LangChain's CLI that writes and maintains an agent wiki for a codebase (Code mode) or a general personal brain (Personal mode). As of 2026-07 it emits OKF v0.1 bundles in both modes and ingests several non-code sources through connectors — a direct OKF-emitting peer whose README documents no truth-maintenance model.
resource: https://github.com/langchain-ai/openwiki
supersedes: openwiki_langchain
tags: [ecosystem, competitor, langchain, okf, personal-knowledge]
timestamp: 2026-07-31
---

# openwiki (langchain-ai)

`langchain-ai/openwiki` is a CLI that *"writes and maintains agent wikis for codebases or purpose
memory,"* built on LangChain's DeepAgents and installed via `npm install -g openwiki`. It has grown
into a trending project (Trendshift-listed) and, materially for this bundle, now **emits OKF
bundles** — moving it from an adjacent code-docs peer into our own format lane.

> **Supersedes [openwiki_langchain](./openwiki_langchain.md).** The prior page (recorded 2026-07-01)
> called openwiki "Not OKF" and "codebase docs only." Both claims are now false: this is a supersede
> on a re-fetch of the same `resource` (trust model §1, §3).

## What it is now

Two modes off one CLI:

* **Code mode** (`openwiki --init` / `--update`, the bare default) builds repository documentation in
  `openwiki/` for the current codebase, and maintains an `AGENTS.md` + `CLAUDE.md` block pointing
  coding agents at the wiki — the same ambient-consult idea our
  [kb-init](../implementations/personal_work_wiki.md) installs.
* **Personal mode** (`openwiki personal ...`) builds a **general personal-brain wiki** in
  `~/.openwiki/wiki` from configured connectors — this is the general-knowledge lane the old page said
  openwiki did not occupy.

CI keeps docs current via a scheduled PR/MR (`openwiki-update.yml` and GitLab/Bitbucket equivalents).
Multi-provider (OpenAI/OpenRouter/Gemini/Bedrock/Anthropic/Copilot and OpenAI-compatible gateways),
config in `~/.openwiki/.env`, optional LangSmith tracing.

## It now emits OKF

openwiki's README declares that it emits **Google OKF v0.1 bundles in both code and personal
modes**:

* Every non-reserved concept has YAML frontmatter with a non-empty `type`; all other standard fields
  are optional.
* `index.md` / `log.md` are reserved documents, not concepts; nested indexes carry no frontmatter and
  the root index declares `okf_version: "0.1"`.
* Standard markdown links between concepts express relationships; `timestamp` and producer-defined
  extension fields are preserved across updates/migrations.

This makes openwiki a **direct [OKF](../spec/index.md)-emitting producer** — and a plausible interop
target, unlike the old assessment. Note it targets **v0.1**, while this bundle now documents
[v0.2](../spec/changes_from_v01.md); it does not yet carry the v0.2 provenance/trust families.

## Real ingest loop with connectors

Personal mode has a genuine [ingest](../operations/ingest.md) pipeline, not just repo scanning:
deterministic connector tools write raw data + manifests under `~/.openwiki/connectors/<connector>/raw/`,
then source-specific agent runs synthesize the wiki. Connectors include **git-repo, Gmail (Google),
Notion, X/Twitter, Web Search (Tavily), and Hacker News**, each configurable as multiple named
instances (`web-search-1`, `web-search-2`) and run via `openwiki ingest all|<connector>|<instance>`.

## Where we still differ

* **No documented [truth-maintenance model](./critiques.md#1-truth-maintenance-and-knowledge-base-poisoning).**
  The README describes regeneration and synthesis, but not append-only meaning, supersession,
  conflicts, or provenance-aware maintenance. With Personal mode ingesting email, social, and web
  sources into accumulated knowledge, that documented gap is a *sharper* differentiator than it was
  for code-only docs — and a future source inspection should verify whether the implementation has
  any unadvertised equivalent.
* **OKF v0.1, not v0.2.** No provenance (`sources`), trust (`generated`/`verified`), or lifecycle
  (`status`/`stale_after`) frontmatter families.

## Techniques still worth borrowing for kb-ingest

* **Plan-then-write** — a temporary `_plan.md` (intended pages + evidence + open questions) before
  final writing; discovery before synthesis.
* **Subagent discipline** — read-only research subagents; only the main agent writes — a concrete
  answer to the [token-cost critique](./critiques.md#2-token-cost-is-postponed-not-eliminated) and the
  pattern for ingesting large source sets in parallel.
* **Git-evidence / existing-docs grounding** — ground claims in source; treat existing docs as primary;
  flag stale docs. Our trust model's "never invent a source," operationalized.
* **Read-boundary ingest** — `.openwikiignore` keeps private/generated paths out of the run entirely.
* **Self-healing diagrams** — Mermaid fences validated after each run; failures degrade to `text` and
  are repaired on the next `--update`.

## Relevance to us

openwiki is now a **direct OKF-emitting competitor and a plausible interop target**, not merely an
adjacent-lane brand signal. It validates the OKF + agent-maintained-wiki bet at scale, occupies both
the code-docs and general-knowledge lanes, and its documented truth-maintenance gap is precisely where
this project's [OKF v0.2](../spec/changes_from_v01.md) provenance/trust posture differentiates. See
the current [competitor comparison](./competitor_comparison_v2.md) for the strategic impact.

# Citations

1. openwiki — <https://github.com/langchain-ai/openwiki> (README, inspected 2026-07-31)
2. openwiki (prior assessment) — [openwiki_langchain](./openwiki_langchain.md) (README + `src/agent/prompt.ts`, inspected 2026-07-01)
