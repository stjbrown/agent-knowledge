---
type: Reference
title: openknowledge (openknowledge-sh)
description: A Go CLI for creating, connecting, inspecting, and publishing OKF bundles, with a local registry, a browser viewer, multiple exporters, and an agent maintenance loop. The most tooling-complete OKF project.
resource: https://github.com/openknowledge-sh/openknowledge
tags: [ecosystem, featured, okf-native, competitor, cli, registry]
timestamp: 2026-07-01
---

# openknowledge (openknowledge-sh)

`openknowledge-sh/openknowledge` (~5★, Go) is a *"CLI tool for managing Open Knowledge Format
bundles"* — create, connect, inspect, and publish local LLM wikis, and keep them current with a
maintenance loop. It has its own domain (`openknowledge.sh`) and installer. Of the OKF-native
cohort, it is the **most tooling-complete** and the most direct competitor alongside
[okf-skills](./okf_skills_scaccogatto.md).

## What it ships

A layered command surface around a [bundle](../concepts/knowledge_bundle.md):

* **Authoring / hygiene** — `setup`, `new`, `validate`, `list`, `spec` (scaffold a bundle, seed
  agent maintenance rules, keep the markdown [conformant](../spec/conformance.md)).
* **Local registry** — `connect`, `disconnect`, `registry`: give local, published, archive, or
  **Git-remote** bundles stable names that humans, agents, and the viewer resolve. This is a genuinely
  new idea in the ecosystem — a *naming/resolution layer* across many bundles.
* **Agent entrypoint** — `use`: prints a bundle-declared instruction file (or a bundle-relative
  path, falling back to the root [`index.md`](../spec/index_files.md)) so an agent loads the right
  knowledge on demand.
* **Viewer** — `open`: a registry-backed local browser UI with search and inline validation issues.
* **Export/publish** — `to html` / `--plain` / `to json` / `to graph`: static viewer, plain
  semantic HTML, a normalized bundle model, or link-graph JSON. Published exports include an
  `openknowledge.json` manifest + a `.tar.gz` archive so `connect <url>` can materialize a remote
  bundle into a local cache.

## Ideas worth stealing

* **Agent-run setup via a printed prompt.** `openknowledge setup` *prints an agent prompt* rather
  than scaffolding directly; you paste it into Claude/Codex/Cursor (or `claude "$(openknowledge
  setup)"`). The agent inspects the workspace + memories, asks only missing questions, then builds a
  use-case-tailored bundle. A clever division of labor: deterministic CLI for structure, agent for
  judgment — directly relevant to how our [ingest](../operations/ingest.md)/init skills should behave.
* **Registry / named bundles across sources** (local, published, archive, Git) — a
  multi-bundle-workspace idea like [the OKF-native agent's](../implementations/okf_native_agent.md) multi-kb
  model, but generalized to remote resolution.
* **Pins a copy of the [spec](../spec/index.md) into every new bundle**, and keeps its own docs
  (`Wiki/`) as an OKF bundle with `decisions/`, `changelog/`, `workflows/` — more
  [dogfooding](../index.md) with an explicit decisions/workflows split worth imitating.
* **"Focused lower-reasoning subagents on bounded wiki-maintenance tasks"** — its setup guidance
  tells the host agent to delegate narrow maintenance to cheaper subagents. A concrete cost pattern
  for the [token-cost critique](./critiques.md#2-token-cost-is-postponed-not-eliminated).

## Relevance to us

openknowledge and [okf-skills](./okf_skills_scaccogatto.md) bracket our space: okf-skills is
Claude-Code-native skills; openknowledge is a language-agnostic **CLI + registry + viewer** driven by
agent prompts. Both lean toward *authoring/validating/publishing*. Our distinct value remains the
**incremental, trust-modeled [ingest](../operations/ingest.md) loop from raw sources** and the
[schema-layer](../concepts/three_layer_architecture.md#3-the-schema) portability seam. Its
`use`-prints-an-entrypoint and `setup`-prints-a-prompt patterns are strong, concrete ideas to borrow
for our skills' ergonomics. It is also a second independent **consumer/validator** (like
[kiso](./kiso.md)) to interop-test our output against.

# Citations

1. openknowledge — <https://github.com/openknowledge-sh/openknowledge>
