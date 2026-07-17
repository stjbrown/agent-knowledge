---
name: kb-init
description: Scaffold a new OKF knowledge bundle in this project — run when starting a wiki or adding a bundle under knowledge/.
disable-model-invocation: true
version: 0.1.0
tags: [knowledge, okf, init, scaffold]
---

# kb-init — scaffold a knowledge bundle

Scaffold a conformant **bundle** per [kb](../kb/SKILL.md). Your unique work is the **schema layer**
(step 2) and adapting the seed (step 3).

Read [../kb/references/glossary.md](../kb/references/glossary.md) if the terms below are unfamiliar.

## 1. Resolve location and bundle name

Default to a bundle at **`knowledge/`**. Accept overrides from the user's request:

- A different path (e.g. `docs/kb`) → scaffold there instead.
- A **named bundle** (e.g. "a `ci` bundle") → scaffold at `knowledge/<name>/` and treat `knowledge/`
  as a **multi-bundle** folder: ensure a top-level `knowledge/index.md` exists that catalogs the
  bundles (create it if missing; add this bundle to it).

If the target directory already contains a bundle (a root `index.md`), stop and report it — do not
overwrite. Offer [kb-ingest](../kb-ingest/SKILL.md) instead.

**Completion criterion:** the target path and bundle name are fixed, and confirmed not to collide
with an existing bundle.

## 2. Understand the domain before scaffolding

The scaffold is deterministic; the **schema layer** needs judgment, so gather it first. Inspect the
workspace for signal (README, existing docs, the code, any notes the user points at) and ask the
user only what you still can't infer:

- What kind of knowledge will this bundle hold? (work context — people, deals, product; a research corpus you keep adding papers to; a codebase or product handbook; competitive landscape; a book/course you're studying; a spec or pattern you're documenting, like this repo's OKF bundle, …)
- What are the main **entities** — the recurring things worth a concept each? These become the
  `type` vocabulary (e.g. `person`, `deal`, `metric`; or `character`, `chapter`, `theme`).
- What raw **sources** will be ingested, and how should they route to those entities?

Keep it short — a few types and a one-line routing rule is enough to start; the schema layer
co-evolves later.

**Completion criterion:** you can name the bundle's initial `type` values, its raw sources, and a
one-line ingest routing rule.

## 3. Copy the seed and write the schema layer

Copy [../kb/example-bundle/](../kb/example-bundle/) into the target, then adapt every seed artifact:

| Artifact | Action |
|---|---|
| `index.md` | Keep `okf_version: "0.1"` frontmatter; replace the body with this bundle's title and section list. |
| `log.md` | Start fresh with a single dated `**Creation**` entry. |
| `spec/types.md` | Replace example types with the domain's `type` vocabulary from step 2. |
| `spec/conventions.md` | Replace with folder taxonomy, naming, ingest routing rule, and a trust-model pointer. |
| `concepts/*` | Remove example entities (`customers`, `orders`); leave `concepts/` empty or create domain starter folders. |
| `knowledge/index.md` | If multi-bundle (step 1): create or update the catalog entry for this bundle. |

Use [../kb/templates/](../kb/templates/) for any new concept/index/log files.

**Completion criterion:** the bundle exists on disk; every row above is accounted for; `spec/types.md`
and `spec/conventions.md` describe *this* project (not the example's orders/customers); multi-bundle
catalog updated if applicable.

## 4. Validate

Run [kb-lint](../kb-lint/SKILL.md) if available; otherwise verify the bundle is conformant per
[kb](../kb/SKILL.md) (SPEC §9 — the one hard rule).

**Completion criterion:** zero conformance errors.

## 5. Hand off

Tell the user the bundle is ready, where it lives, and the two next moves:
[kb-ingest](../kb-ingest/SKILL.md) to add knowledge, [kb-query](../kb-query/SKILL.md) to ask it
questions. If this project uses `CLAUDE.md`/`AGENTS.md`, offer to add a one-line pointer so agents
read the bundle's root `index.md` before relevant tasks.
