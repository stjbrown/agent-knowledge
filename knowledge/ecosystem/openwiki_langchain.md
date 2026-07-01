---
type: Reference
title: openwiki (langchain-ai)
description: LangChain's CLI that writes and maintains agent-facing documentation for a codebase (DeepAgents-based, auto-updated via a daily GitHub Action). A code-documentation generator — not OKF, not general-knowledge — but a strong brand signal and a source of ingest techniques.
resource: https://github.com/langchain-ai/openwiki
tags: [ecosystem, competitor, langchain, code-docs, not-okf]
timestamp: 2026-07-01
---

# openwiki (langchain-ai)

`langchain-ai/openwiki` (~67★, MIT, TypeScript, created 2026-06-22) is a CLI that *"writes and
maintains documentation for your codebase, built specifically for agents."* Built on LangChain's
DeepAgents. Notable primarily because **LangChain entering this space** hardens the "agent-maintained
wiki" category — but it sits in a **different lane** from this project.

## What it is

* `openwiki --init` generates docs into an **`openwiki/`** directory; `--update` refreshes them from
  repo changes. A daily **GitHub Action** opens a PR keeping docs current.
* Appends a pointer to the repo's `AGENTS.md`/`CLAUDE.md` so coding agents consult the docs for
  context (the same ambient-consult idea our [kb-init](../implementations/personal_work_wiki.md) installs).
* Multi-provider (OpenRouter/Anthropic/OpenAI/Baseten/Fireworks), config in `~/.openwiki/.env`,
  optional LangSmith tracing.

## Why it is NOT a format competitor

Unlike [okf-skills](./okf_skills_scaccogatto.md), [openknowledge](./openknowledge_cli.md), and
[kiso](./kiso.md), openwiki is not in our niche:

* **Not [OKF](../spec/index.md).** Output is plain markdown with **no frontmatter / no `type`**, in
  `openwiki/` not `knowledge/`. No conformance target, not a portable bundle.
* **Codebase docs only**, generated *from the repository* — architecture/CLI/agent-workflow pages.
  Not general knowledge [ingested](../operations/ingest.md) from arbitrary sources (transcripts,
  PDFs, notes, images). It is in the "auto-document your code" lane (DeepWiki, gbrain), not the
  [LLM-Wiki](../concepts/llm_wiki.md) knowledge-base lane.
* **No [trust model](./critiques.md#1-truth-maintenance-and-knowledge-base-poisoning).** It
  regenerates from source each run rather than append-only/supersede — fine for code docs (the code
  *is* the source of truth), wrong for accumulated knowledge where provenance and history matter.

## Techniques worth borrowing for kb-ingest

Its agent system prompt is well-built and directly informs [kb-ingest](../operations/ingest.md):

* **Git-evidence grounding** — *"Do not invent files, modules, APIs, or behavior. Ground every
  important claim in source files, existing docs, or git evidence."* Our trust model's "never invent
  a source" rule, operationalized; on update it diffs against the last run's recorded `gitHead`.
* **Plan-then-write** — writes a temporary `_plan.md` (intended pages + evidence + open questions)
  before writing final docs, then deletes it. A cheap way to force discovery before synthesis.
* **Subagent discipline** — 1-2 (up to 3-4 for small repos) **read-only** research subagents with
  narrow briefs; **only the main agent writes**. A concrete answer to the
  [token-cost critique](./critiques.md#2-token-cost-is-postponed-not-eliminated) and a pattern for
  ingesting a large source set in parallel without write conflicts.
* **Existing-docs discipline** — treat existing READMEs/SKILL.md/runbooks as primary source; link
  rather than duplicate; flag stale docs that conflict with current source.

## Relevance to us

openwiki is a **peer in the adjacent code-docs lane**, not a competitor for OKF general-knowledge
bundles. It sharpens our positioning (we are the OKF-conformant, general-source, trust-modeled
option) and its prompt is a proven reference for `kb-ingest`'s grounding, planning, and subagent
patterns. Not an interop target (its output isn't a conformant bundle), unlike
[kiso](./kiso.md)/[openknowledge](./openknowledge_cli.md).

# Citations

1. openwiki — <https://github.com/langchain-ai/openwiki> (README + `src/agent/prompt.ts`, inspected 2026-07-01)
