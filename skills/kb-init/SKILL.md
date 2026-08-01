---
name: kb-init
description: Scaffold a new OKF knowledge bundle in this project — run when starting a wiki or adding a bundle under knowledge/.
disable-model-invocation: true
version: 0.3.2
tags: [knowledge, okf, init, scaffold]
---

# kb-init — scaffold a knowledge bundle

Scaffold a conformant **bundle** per [kb](../kb/SKILL.md). Your unique work is the **schema layer**
(step 2) and adapting the seed (step 3).

Read [the version profile](../kb/references/version-profile.md) before writing. New bundles target
OKF v0.2. Read [the glossary](../kb/references/glossary.md) if the terms below are unfamiliar.

## 1. Resolve location and bundle name

Default to a bundle at **`knowledge/`**. Accept overrides from the user's request:

- A different path (e.g. `docs/kb`) → scaffold there instead.
- A **named bundle** (e.g. "a `ci` bundle") → scaffold at `knowledge/<name>/` and treat `knowledge/`
  as a **multi-bundle** folder: ensure a top-level `knowledge/index.md` exists that catalogs the
  bundles (create it if missing; add this bundle to it).

If the target directory already contains a bundle (a root `index.md`), stop and report it — do not
overwrite. Offer [kb-document](../kb-document/SKILL.md) for repository documentation or
[kb-ingest](../kb-ingest/SKILL.md) for captured sources.

Choose an honest producer actor for `generated.by`: the current agent/tool as
`<producer>/<version>`, never `human:<id>` unless the human actually authored the content.

**Completion criterion:** the target path, bundle name, and producer actor are fixed, and the target
is confirmed not to collide with an existing bundle.

## 2. Understand the domain before scaffolding

The scaffold is deterministic; the **schema layer** needs judgment, so gather it first. Inspect the
workspace for signal (README, existing docs, the code, any notes the user points at), determine
whether this is a repository-documentation or captured-source bundle, and ask the user only what you
still can't infer:

- What kind of knowledge will this bundle hold? (work context — people, deals, product; a research corpus you keep adding papers to; a codebase or product handbook; competitive landscape; a book/course you're studying; a spec or pattern you're documenting, like this repo's OKF bundle, …)
- What are the main **entities** — the recurring things worth a concept each? These become the
  `type` vocabulary (e.g. `person`, `deal`, `metric`; or `character`, `chapter`, `theme`).
- For a captured-source bundle: what raw **sources** will be ingested, how should they route to
  those entities, and which intake locations are explicitly managed?
- For repository documentation: which parts of the repository are in scope, and how should
  components, workflows, interfaces, operations, and decisions route? Repository files remain
  evidence in place and are not raw intake.

Keep it short — a few **provisional** types and a one-line routing rule is enough to start. This is
an initial vocabulary, not a closed enum; the schema layer co-evolves as ingest reveals the domain.
`Reference` (captured source material) and `Spec Section` (the bundle's own schema documents) are
workflow types supplied by the seed, not domain choices the user needs to design.

Interaction contract:

- Inspect the workspace once, batching related reads where practical.
- Ask one concise, free-text question for everything that remains unknown.
- Do not use canned multiple-choice options for this domain-specific input.
- After the user answers, continue from this loaded procedure. Do not load `kb-init` again.
- If you propose a schema for confirmation, accept the user's answer once. After approval, scaffold
  without restating or replanning it.

**Completion criterion:** you can name the bundle's initial `type` values and either its raw sources
plus a one-line ingest routing rule, or its repository scope plus a one-line documentation routing
rule.

## 3. Write the adapted seed and schema layer

Read [../kb/example-bundle/](../kb/example-bundle/) as the source scaffold, then write its adapted
artifacts into the target. Do not first write an unmodified copy and then overwrite it: create the
directories and write each target file once with its final, domain-specific content. Work quietly
after the user's approval; do not narrate each read or write.

If a prior attempt already created a target file, it is no longer new: read that file immediately
before editing it, preserve valid work, and resume from the incomplete step. Never retry a
read-before-write failure blindly or dismiss it as a false alarm.

| Artifact | Action |
|---|---|
| `index.md` | Keep `okf_version: "0.2"` frontmatter; replace the body with this bundle's title and section list. |
| `log.md` | Start fresh with a single dated `**Creation**` entry. |
| `spec/types.md` | Keep `Spec Section` and `Reference`; replace the example domain types and set `generated` to the current producer/time. |
| `spec/conventions.md` | Replace with folder taxonomy, routing, custody, and trust rules; set `generated` to the current producer/time. |
| `concepts/*` | Remove example entities (`customers`, `orders`); leave `concepts/` empty or create domain starter folders. |
| `references/*` | Remove the synthetic example source; leave `references/` empty until a real source is ingested. |
| `knowledge/index.md` | If multi-bundle (step 1): create or update the catalog entry for this bundle. |

Use [../kb/templates/](../kb/templates/) for any new concept/index/log files.

**Completion criterion:** the bundle exists on disk as OKF v0.2; every row above is accounted for;
all created concepts use `generated` rather than legacy `timestamp`; `spec/types.md` and
`spec/conventions.md` describe *this* project; multi-bundle catalog updated if applicable.

## 4. Validate

Run [kb-lint](../kb-lint/SKILL.md) if available; otherwise verify the bundle is conformant per
[kb](../kb/SKILL.md) (SPEC §11 — the one hard rule).

**Completion criterion:** zero conformance errors.

## 5. Hand off

Tell the user the bundle is ready and where it lives. For a codebase bundle, hand off to
[kb-document](../kb-document/SKILL.md); otherwise hand off to
[kb-ingest](../kb-ingest/SKILL.md). In both cases, [kb-query](../kb-query/SKILL.md) answers from the
result. If this project uses `CLAUDE.md`/`AGENTS.md`, offer to add a one-line pointer so agents read
the bundle's root `index.md` before relevant tasks; never add it without agreement.
