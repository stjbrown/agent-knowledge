---
type: Concept
title: Skill Design — the kb-* family
description: The plan for agent-knowledge's skills — a kb hub (router + single source of truth) plus action skills (ingest, query, init, lint, visualize), designed with the writing-great-skills framework.
tags: [design, skills, build-plan, decisions]
timestamp: 2026-07-01
---

# Skill Design — the `kb-*` family

The build plan for this project's skills, designed against the
[competitor comparison](../ecosystem/competitor_comparison.md) (what to build vs. reuse) and the
`writing-great-skills` framework (predictability as the root virtue). Naming is `kb-` — "knowledge
bundle" is OKF's own term ([SPEC §2](../references/okf_spec.md)) for the `knowledge/` package the
skills operate on, and `kb` reads universally as "knowledge base." Nothing user-facing says "okf";
OKF-conformance is carried *internally*.

## The family

A **hub** skill plus action skills, on the `git`/`kb-<verb>` model:

| Skill | Invocation | Role |
|---|---|---|
| **`kb`** | model-invoked | Router + single source of truth. Teaches the system and its terms; routes to the right action skill; holds the shared spec, glossary, trust-model, templates, and example bundle. |
| **`kb-init`** | user-invoked | Scaffold a bundle from the hub's templates/example. Default `knowledge/`; custom path allowed; multi-bundle aware. |
| **`kb-ingest`** | model-invoked | Raw source → integrated concepts, applying the trust model. The core differentiator. |
| **`kb-query`** | model-invoked | Progressive-disclosure discovery → synthesize with citations → file good answers back. |
| **`kb-lint`** | user-invoked | Drift + health checks; delegates the deterministic §9 conformance pass to an existing validator. |
| **`kb-visualize`** | user-invoked | LLM-generated graph — native UI where supported, self-contained HTML artifact otherwise. |
| **`kb-search`** *(later)* | user-invoked | qmd/FTS retrieval when a bundle outgrows [index-style discovery](../concepts/progressive_disclosure.md). |

## Framework decisions

### Invocation split — context load vs. cognitive load

A model-invoked skill's **description** sits in the context window every turn (context load); a
user-invoked skill costs nothing until typed (but spends the human's cognitive load). Rule: model-
invoke only what must fire autonomously. So the **daily verbs** [`kb-ingest`](../operations/ingest.md)
and [`kb-query`](../operations/query.md) — which must fire on "capture this" / "what do we know
about X" — are model-invoked, plus the `kb` hub as the front door. The **deliberate** skills
(`kb-init`, `kb-lint`, `kb-visualize`, `kb-search`) are user-invoked. Net: **three descriptions in
context, not seven.**

### `kb` as router + single source of truth

Two framework moves converge on the hub. A **router** cures the cognitive load of several user-
invoked siblings by naming them and when to reach each. A **single source of truth** keeps one
authoritative copy of shared meaning. So `kb` holds, once, what every action skill needs:

```
kb/
  SKILL.md              # teach the system + key terms; route to kb-<verb>
  reference/
    SPEC.md             # OKF v0.1, vendored verbatim — the source of truth
    glossary.md         # bundle, concept, reference, progressive disclosure, compounding…
    trust-model.md      # append-only / supersede / conflicts_with rules
  templates/
    concept.md  index.md  log.md
  example-bundle/       # tiny canonical bundle: teaching example AND kb-init's seed
```

Action skills point here rather than restating the spec — avoiding the drift the OKF reference
implementation hit when the spec was copied into multiple modules (PR #161). A spec bump to 0.2 is
then a one-file edit.

### Information hierarchy

Each action `SKILL.md` carries ordered **steps** with **completion criteria** that are *checkable*
and *exhaustive*; shared **reference** (spec, glossary, trust rules) is disclosed to `kb/reference/`
behind context pointers (progressive disclosure) so each skill stays legible.

### Leading words

Reused across skills, docs, and this bundle's own concept names so the shared language sharpens both
execution and invocation: **bundle**, **ingest**/**compile**, **supersede** (the trust model's
verb), **drift** (what [lint](../operations/lint.md) fights), **progressive disclosure**,
**compounding**.

### Guarded failure mode — premature completion in `kb-ingest`

[Ingest](../operations/ingest.md) is the long sequence (read → extract → integrate across concepts →
update indexes → append [log](../spec/log_files.md) → move source to processed → commit); the tail
tempts an early "done." Defense, in order: sharpen the completion criteria first (*"every extracted
entity has a concept or is consciously skipped; source moved to processed; log appended"*); split the
sequence only if the rush persists.

### Techniques to borrow for `kb-ingest` (from openwiki)

LangChain's [openwiki](../ecosystem/openwiki_langchain.md) is in the adjacent code-docs lane (not
OKF), but its agent prompt is proven and directly applicable to `kb-ingest`:

- **Ground every claim** in an inspected source / git evidence — never invent. Operationalizes the
  trust model's "never lose provenance."
- **Plan-then-write** — draft a temporary plan (intended concepts touched + evidence + open
  questions) before writing, so discovery precedes synthesis. A natural front-half for the ingest
  sequence and a guard against the premature-completion failure above.
- **Read-only research subagents** — 1-2 narrow-brief subagents *inspect and summarize only*; the
  main agent does all writes. Lets a large source set be processed in parallel without write
  conflicts, and answers the token-cost critique.

## Build vs. reuse (from the competitor comparison)

**Build** (differentiated): `kb-init` (schema-layer scaffold), `kb-ingest` (trust-modeled raw-source
loop — nobody has this), `kb-query` (light), `kb-visualize` (adaptive, LLM-generated — not a fixed
`viz.html`). **Reuse:** the deterministic §9 validator inside `kb-lint` rather than rebuilding it.
See [competitor comparison](../ecosystem/competitor_comparison.md).

## Decisions (settled 2026-07-01)

1. **Distribution → skills.sh, single-plugin layout** (mattpocock/skills model). Each skill is a
   folder `skills/<name>/SKILL.md` with supporting files beside it; a `.claude-plugin/plugin.json`
   lists them; no build step. Installs via skills.sh *and* works as a Claude Code plugin. The whole
   `kb-*` family **ships as one plugin** so the action skills can reach the [`kb`](#the-family) hub's
   shared `reference/` (vendoring the spec into each skill would reintroduce drift — rejected).
2. **Schema-layer location → in-bundle `spec/` concepts.** `kb-init` writes a bundle's domain rules
   (concept `type` vocabulary, folder taxonomy, ingest conventions) as real OKF concepts under
   `knowledge/<bundle>/spec/` — the pattern Google's cricket bundle (#144) and *this* bundle already
   use. Portable, stays [conformant](../spec/conformance.md), travels with the bundle, and the rules
   are themselves browsable/linkable knowledge. This is the [schema
   layer](../concepts/three_layer_architecture.md#3-the-schema) made concrete and is what lets the
   generic skills fit any domain.
3. **Trust model → full [the OKF-native agent](../implementations/okf_native_agent.md) model, opinionated.**
   Append-only on meaning, supersede-with-provenance (`status`/`supersedes`/`superseded_by`),
   `conflicts_with` over silent overwrite, events-additive. An opinionated default *is* the
   predictability the framework prizes — not a per-run configuration choice. Answers the ecosystem's
   top [critique](../ecosystem/critiques.md#1-truth-maintenance-and-knowledge-base-poisoning).

## Build order

`kb` (hub + shared reference) → `kb-init` (proves scaffold + schema layer) → `kb-ingest` (the
differentiator) → `kb-query` → `kb-lint` → `kb-visualize`. `kb-search` deferred until a bundle needs
it.

# Citations

1. `writing-great-skills` framework (user-invoked skill, consulted 2026-07-01).
2. [Competitor Comparison](../ecosystem/competitor_comparison.md)
3. [OKF Spec Evolution](./spec_evolution.md)
