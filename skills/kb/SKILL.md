---
name: kb
description: >-
  Bundle — portable OKF knowledge base (markdown + frontmatter). Use when the user wants to
  start a wiki, ingest a source, query the bundle, lint or visualize it; or when the repo has a
  knowledge/ bundle that should inform the task. Other kb-* skills reach here for SPEC, glossary,
  and trust model.
---

# kb — bundles

**Hub** for the `kb-*` family: vocabulary, shared reference, routing. Knowledge **compounds** —
compiled once, kept current, not re-derived per query. Does not modify a bundle — routes to the
skill that does.

## Key terms

[reference/glossary.md](reference/glossary.md) defines the vocabulary. Minimum before routing:
**Bundle**, **Ingest**, **Progressive disclosure**, **Trust model** (see
[trust-model.md](reference/trust-model.md)).

## The one hard rule

A bundle is **conformant** iff every non-reserved `.md` file has parseable YAML frontmatter with a
non-empty `type`. Everything else is soft guidance — consumers MUST tolerate missing optional fields,
unknown types, and broken links. Never reject a bundle over them. Full rules:
[reference/SPEC.md](reference/SPEC.md) §9.

## Route to the right skill

| The user wants to… | Use |
|---|---|
| Start a new bundle | [`kb-init`](../kb-init/SKILL.md) |
| Capture, ingest, file, or process a source (note, transcript, PDF, image, URL) | [`kb-ingest`](../kb-ingest/SKILL.md) |
| Ask what the bundle knows; look something up; explore connections | [`kb-query`](../kb-query/SKILL.md) |
| Health-check the bundle (**drift**, orphans, contradictions, conformance) | [`kb-lint`](../kb-lint/SKILL.md) |
| See the bundle as a graph | [`kb-visualize`](../kb-visualize/SKILL.md) |

If a `knowledge/` bundle exists and would inform the current task, consult it via
[`kb-query`](../kb-query/SKILL.md) before answering from scratch — even when the user didn't ask an
explicit knowledge question.

## Shared reference (single source of truth)

Every `kb-*` skill reads these rather than restating them, so the family stays consistent:

- [reference/SPEC.md](reference/SPEC.md) — OKF v0.1, vendored verbatim.
- [reference/glossary.md](reference/glossary.md) — leading words and definitions.
- [reference/trust-model.md](reference/trust-model.md) — the maintenance rules.
- [templates/](templates/) — `concept.md`, `index.md`, `log.md` starters.
- [example-bundle/](example-bundle/) — a tiny conformant bundle: a worked example, and the seed
  `kb-init` copies from.
