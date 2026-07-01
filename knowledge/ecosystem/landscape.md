---
type: Concept
title: LLM Wiki Ecosystem Landscape
description: A survey of the 200+ implementations spawned by Karpathy's gist, grouped by shape — skills/plugins, CLIs, apps/platforms, MCP servers, and databases-not-markdown.
tags: [ecosystem, survey]
timestamp: 2026-07-01
---

# LLM Wiki Ecosystem Landscape

Within weeks of the [gist](../references/karpathy_llm_wiki.md), its comment thread became a directory
of 200+ implementations. They cluster into a few recognizable shapes. Understanding the clusters
tells us where our [OKF-conformant, portable-skills](../implementations/index.md) angle is
differentiated and where it is crowded.

## 1. Agent skills & plugins

Packages of `SKILL.md` / plugin files that turn Claude Code, Cursor, Codex, etc. into a wiki
maintainer — the shape closest to **what we are building**.

* [karpathy-llm-wiki (Astro-Han)](./karpathy_llm_wiki_astro.md) — Agent-Skills-compatible, multi-tool.
* [wiki-skills (kfchou)](./wiki_skills.md) — Claude Code skills, Karpathy-faithful.
* Others: `doneyli/claude-code-plugins` (llm-wiki), `horiacristescu/claude-playbook-plugin`,
  `EveryInc/compound-engineering-plugin` (22k★, broader "compound engineering"),
  `pedronauck/skills` (karpathy-kb), `Thrimbda/legion-mind`, `vanillaflava/llm-wiki-claude-skills`,
  `FBoschman/claude-wiki-research-skills`, `theafh/ai-modules`.

This category is busy but almost entirely **Obsidian-wikilink-flavored**, not
[OKF](../spec/index.md)-conformant — our differentiator.

## 2. CLIs & compilers

Standalone tools that ingest sources and compile a wiki, often with built-in search.

* [synthadoc](./synthadoc.md) — no-tools, self-managed compiler (534★).
* `Hosuke/llmbase` — ingest→compile→query→enhance with a React UI (42★).
* `VihariKanukollu/browzy.ai` — npm CLI, FTS5+BM25, Obsidian-compatible, multi-model.
* Others: `doum1004/llmwiki-cli`, `olegiv/llm-wiki-go` (Go codebase wiki),
  `atomicmemory/llm-wiki-compiler`, `iamsashank09/llm-wiki-kit`, `MauricioPerera/llm-wiki-kit`,
  `yhay81/create-wiki-kit`.

## 3. Apps & platforms

Full products with UIs, hosting, or mobile.

* [OmegaWiki](./omegawiki.md) — the most complete (1.5k★).
* `Tencent/WeKnora` (17k★) — RAG + agent + self-maintaining wiki (enterprise-scale, RAG-centric).
* `memex-lab/memex` (568★) — local-first AI journal app for iOS/Android.
* `basicmachines-co/basic-memory` (3.3k★) — "conversations that remember," MCP-based.
* `bitsofchris/openaugi` (119★), `sheawinkler/contextlattice` (122★, coordination control-plane).

## 4. MCP servers & memory layers

Expose the wiki/memory to any agent over MCP rather than shipping a workflow.

* `multimail-dev/thinking-mcp`, `Electro-resonance/LLM-WIKI-MCP`, `deepak-bhardwaj-ps/smriti-mcp`,
  `gowtham0992/link` (link-mcp), `dfalci/mcp-advwiki`, `us/crw` (research/ingest via MCP).

## 5. Coordination & multi-agent

Let several agents build one wiki in parallel.

* [tracecraft (Arrmlet)](./landscape.md) — shared memory/messaging/task-claiming over any
  S3 bucket (27★); `swarmclawai/swarmvault`, `redmizt/multi-agent-wiki-toolkit`,
  `AEVYRA/llm-wiki-coordination`.

## 6. Databases, not markdown

The notable dissent from the file-based approach — see [critiques](./critiques.md).

* `buremba` / `lobu-ai/owletto` — entity-typed knowledge in **PostgreSQL** with an event log and SQL
  access for the agent.
* `gnusupport`'s "Hyperscope" argument for PostgreSQL over markdown for *deterministic* KBs.
* `zTgx/vectorless` / `vectorlessflow` — "knowing by reasoning, not vectors."

## 7. Codebase-doc generators (adjacent lane)

Auto-document a *codebase* for agents — generated from the repo, not ingested from arbitrary
sources. Overlaps in spirit (agent-maintained, `AGENTS.md` pointer, scheduled updates) but is a
different product than an OKF general-knowledge bundle.

* [openwiki (langchain-ai)](./openwiki_langchain.md) — LangChain/DeepAgents CLI; daily-PR updates.
  Not OKF, no trust model — but a strong category signal and a source of
  [ingest techniques](../design/skill_design.md). Peers: DeepWiki, `garrytan/gbrain`.

## Where OKF sits

A handful of projects target [OKF](../spec/index.md) explicitly, and the cohort is growing fast:

* [okf-skills (scaccogatto)](./okf_skills_scaccogatto.md) — Claude Code skills to author/validate/visualize bundles (**our closest competitor**).
* [openknowledge (openknowledge-sh)](./openknowledge_cli.md) — a Go CLI with a registry, viewer, exporters, and agent maintenance loop (the most tooling-complete).
* [kiso (oak-invest)](./kiso.md) — a Java engine that publishes bundles as static sites (the *consumer* side).
* [okf-harness (pumblus)](./okf_harness.md) — an agent-first local harness for OKF wikis.
* `equationalapplications/expo-llm-wiki` — cites the OKF SPEC; SQLite-backed memory.
* Our sibling [the OKF-native agent](../implementations/okf_native_agent.md) — OKF-native deployable agent.

The vast majority of the ecosystem still reinvents a bespoke on-disk convention. But the OKF-native
cohort is now real and moving fast — [okf-skills](./okf_skills_scaccogatto.md) (skills),
[openknowledge](./openknowledge_cli.md) (CLI + registry), and [kiso](./kiso.md)
(publisher) already bracket authoring, tooling, and consumption. The remaining gap our project aims
at: **portable skills that incrementally produce and *maintain* a conformant bundle from raw
sources, with a [trust model](./critiques.md)** — the living-wiki
[ingest](../operations/ingest.md) loop, which the authoring/validation/publishing tools largely leave
to the human. A caution worth noting: with several teams shipping OKF tooling in mid-2026, our value
has to be the *maintenance loop and portability seam*, not another author/validate/visualize trio.

# Citations

1. [Karpathy — LLM Wiki gist](../references/karpathy_llm_wiki.md) (comment thread, ~900 comments)
