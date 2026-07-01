---
type: Concept
title: Competitor Comparison — okf-skills vs. openknowledge vs. our plan
description: A feature-by-feature comparison of the two most direct OKF-native competitors against what this project should build, isolating the differentiated surface.
tags: [ecosystem, competitor, design-input, strategy]
timestamp: 2026-07-01
---

# Competitor Comparison

A feature-by-feature read of the two most direct [OKF](../spec/index.md)-native competitors —
[okf-skills (scaccogatto)](./okf_skills_scaccogatto.md) and
[openknowledge (openknowledge-sh)](./openknowledge_cli.md) — against what *we* plan to
build, based on reading their actual skill files, templates, and validation matrices (not just their
READMEs). Goal: **build only the differentiated parts.**

## At a glance

| | **okf-skills** | **openknowledge** | **ours (planned)** |
|---|---|---|---|
| Form factor | Claude Code plugin + skills.sh skills | Standalone Go CLI (+ Codex skill) | Portable agent skills |
| Runtime / deps | Agent + `uv`/python for validator | Native Go binary (installer) | Agent-only, no runtime dep |
| Cross-agent | ✅ 20+ agents via skills.sh | Agent-agnostic (CLI); ships a Codex skill | ✅ (target Claude Code first) |
| Author/produce | ✅ `produce` mode | ✅ `new` + agent `setup` prompt | ◐ via ingest |
| **Maintain-in-sync** | ✅ `maintain` mode (code/docs changed) | ◐ maintenance-loop guidance in skill | ✅ **core** |
| **Ingest from raw sources** | ✗ (authors from code/docs) | ✗ (scaffolds, human edits md) | ✅ **core differentiator** |
| Consume/query | ✅ `consume` mode | ✅ `use` (prints entrypoint/excerpt) | ✅ |
| Deterministic validation | ✅ `okf_validate.py` (§9) | ✅ Go validator + compliance matrix + tests | ◐ reuse, don't rebuild |
| Visualize | ✅ `viz.html` (Cytoscape) | ✅ `to html/json/graph/tar` exporters | ✗ (reuse theirs) |
| Multi-bundle / registry | ✗ | ✅ **registry** (local/published/archive/Git) | ◐ (OKF-native-agent-style multi-kb) |
| Publish to web | ✗ | ✅ static site + `llms.txt` + manifest | ✗ (hand off to [kiso](./kiso.md)/openknowledge) |
| **Trust model** (append-only / supersede / conflicts) | ✗ (`**Deprecation**` note only) | ✗ (changelog page) | ✅ **core differentiator** |
| **Domain portability seam** (schema layer) | ◐ (pick a layout by domain) | ◐ (`setup` tailors to use case) | ✅ **explicit** |
| Spec pinning | ✅ vendored verbatim SPEC.md | ✅ embedded, version-selectable | ✅ (vendor verbatim) |
| Dogfoods itself in OKF | ✅ `.okf/` + CI validation | ✅ `Wiki/` + decisions/workflows | ✅ `knowledge/` (this bundle) |

Legend: ✅ strong / ◐ partial / ✗ absent.

## What both already do well (don't rebuild)

* **Deterministic §9 [conformance](../spec/conformance.md) validation.** okf-skills ships a
  self-contained `okf_validate.py`; openknowledge has a Go validator with a full hard-rule
  compliance matrix backed by tests. Reinventing this is pure waste — we should **reuse
  okf-skills' validator** (MIT, `uv run`, zero-config) as our [lint](../operations/lint.md)'s
  conformance pass and spend our effort on the *drift* checks it doesn't do.
* **Visualization / export.** Both render a bundle to a self-contained graph; openknowledge also
  exports json/tar/graph and a static site. We should **not** build a visualizer — point users at
  `okf:visualize` or `openknowledge to html`.
* **Spec-pinning discipline.** Both vendor the spec verbatim as the skill's source of truth. We do
  this too (`references/okf_spec.md` points at it); worth vendoring the literal file into any skill
  we ship.

## Where the competitors are thin (our opening)

1. **Ingest from raw, messy sources.** Both are *authoring* tools: okf-skills `produce`s concepts
   from **code/docs/manual** input; openknowledge `new` scaffolds an empty bundle a human then
   edits. Neither has the [LLM-Wiki ingest loop](../operations/ingest.md) — drop a transcript / email /
   PDF / screenshot, extract entities and signals, integrate across many concepts, move the source to
   processed. This is the [personal work wiki](../implementations/personal_work_wiki.md) workflow and our clearest differentiator.
2. **A real trust / truth-maintenance model.** okf-skills' maintain mode says "update the body and
   `timestamp`, add a `**Deprecation**` note" — it *edits claims in place*. Neither implements
   [the OKF-native agent's](../implementations/okf_native_agent.md) append-only-on-meaning, supersede-with-
   provenance, `conflicts_with`, events-are-additive model — which is exactly the fix the
   [ecosystem's top critique](./critiques.md#1-truth-maintenance-and-knowledge-base-poisoning)
   demands. Making that the *default* maintenance behavior is a genuine, defensible difference.
3. **The [schema-layer](../concepts/three_layer_architecture.md#3-the-schema) portability seam.** Both
   "pick a layout by domain," but the domain knowledge is improvised per-run. Neither has a
   first-class, per-project config that declares the taxonomy, `type` vocabulary, and workflow so the
   *same* generic skills fit a work wiki, a book companion, or a research corpus with no skill edits.

## What to borrow outright

* **Dual distribution** (plugin + skills.sh, scripts via `${CLAUDE_SKILL_DIR}`) — okf-skills' answer
  to "ship portable skills." Adopt wholesale.
* **`setup` prints an agent prompt** (openknowledge) — deterministic scaffold + agent judgment for
  the use-case-specific parts. A great shape for our `init` skill.
* **`use` prints an entrypoint** (openknowledge) — a path-light way for an agent to load the right
  knowledge on demand; better than hardcoding `index.md` reads.
* **Positioning table** (okf-skills) — OKF vs. `CLAUDE.md` vs. auto-memory vs. wiki. Adopt for our docs.
* **CI-validated self-dogfooding** (both) — add a CI conformance check on `knowledge/`.
* **Agent-maintenance footer** `<!-- okf-footer: agent-maintenance -->` (openknowledge) — a tidy
  convention for keeping source-anchors/update-notes out of prominent headings. Worth stealing for
  our concept template.
* **Delegate bounded maintenance to focused low-reasoning subagents** (openknowledge) — a concrete
  answer to the [token-cost critique](./critiques.md#2-token-cost-is-postponed-not-eliminated).

## Recommended scope for our skills

Build **three** skills, thin where the field is saturated and thick where it's empty:

* **`okf-init`** — scaffold `knowledge/` + a per-project [schema-layer](../concepts/three_layer_architecture.md#3-the-schema)
  config; borrow openknowledge's print-a-prompt setup. Vendor the spec.
* **`okf-ingest`** — the differentiated core: raw source → integrated concepts, with the
  [trust model](./critiques.md) (append-only / supersede / conflicts) as default. Wraps the
  [ingest](../operations/ingest.md) + [query](../operations/query.md) operations.
* **`okf-lint`** — drift + health checks ([lint](../operations/lint.md)), delegating the deterministic
  §9 pass to okf-skills' validator rather than reimplementing it.

Do **not** build: a visualizer, an exporter/publisher, or another from-scratch conformance checker —
reuse okf-skills and openknowledge/[kiso](./kiso.md) for those.

# Citations

1. [okf-skills (scaccogatto)](./okf_skills_scaccogatto.md) — SKILL.md files, templates, validator
2. [openknowledge (openknowledge-sh)](./openknowledge_cli.md) — skill, tooling-model & spec-compliance docs
3. [Critiques & Open Problems](./critiques.md)
