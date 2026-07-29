# Glossary

The vocabulary of the `kb-*` skills and OKF. Terms are **leading words** — reused verbatim across
skills, prompts, and a bundle's own concept names so the shared language makes both execution and
invocation reliable.

## Structure

- **Bundle (knowledge bundle)** — a directory tree of markdown concepts, the unit of production and
  exchange. OKF's own term for the `knowledge/` package. May be shipped as a git repo, an archive,
  or a subdirectory of a larger repo. A project MAY contain several bundles under one `knowledge/`
  folder, each self-contained, with a top-level `knowledge/index.md` cataloging them.
- **Concept** — one markdown file: one idea, entity, asset, or claim. Has a YAML frontmatter block
  and a markdown body.
- **Concept ID** — a concept's path within the bundle with `.md` removed (`people/jane.md` →
  `people/jane`). How concepts are referenced.
- **Reserved files** — `index.md` (directory listing) and `log.md` (change history). Not concepts;
  carry no frontmatter (except the root `index.md`, which may declare `okf_version`).
- **Schema layer** — the bundle's domain rules: its `type` vocabulary, folder taxonomy, naming, and
  ingest routing conventions. Lives in `spec/` (as OKF concepts) so generic `kb-*` skills read it and
  fit any domain. What [kb-init](../../kb-init/SKILL.md) writes; what makes a bundle portable.

## Frontmatter

- **type** *(required)* — a short, producer-chosen string naming the kind of concept (e.g. `person`,
  `deal`, `metric`, `Reference`). The only required field.
- **Recommended** — `title`, `description`, `resource` (a canonical URI, for concepts bound to a real
  asset), `tags`, `timestamp` (ISO 8601).
- **Extension keys** — any additional keys are allowed and preserved. The trust model uses
  `status`, `supersedes`, `superseded_by`, `conflicts_with`.

## Content types

- **Reference** — a concept (`type: Reference`) that mirrors external **source** material and points
  at it via `resource`, keeping the source *in* the bundle. Distinct from synthesis: a Reference is
  a faithful pointer + extract, not our opinion.
- **Synthesis** — a concept that is *our* analysis, comparison, or roll-up. It cites references; it
  is not one.
- **Overview** — a synthesized roll-up of a section, regenerated from its child concepts.

## Navigation

- **Progressive disclosure** — read `index.md` first, follow section indexes, then follow
  cross-links only into relevant concepts. Scales to hundreds of concepts with no embeddings; add a
  search tool only when a bundle outgrows it.
- **Cross-link** — a standard markdown link from one concept to another; a directed, untyped edge
  whose meaning is carried by the surrounding prose. Prefer **relative** links (they render
  everywhere, including GitHub, when the bundle is nested).
- **Compounding** — the property that makes the effort worthwhile: every ingested source and every
  filed-back answer makes the bundle richer, rather than being re-derived per query.

## Maintenance (trust model)

- **Ingest** — read a raw source, extract its signal, and integrate it across the bundle.
- **Supersede** — replace a claim by writing a *new* concept and marking the old one
  `status: superseded` with `superseded_by`, keeping it on disk for history. Never rewrite a claim
  in place.
- **Conflict** — when new information merely disagrees, link the two with `conflicts_with` and keep
  both active; do not silently pick a winner.
- **Drift** — the decay a compounding bundle accumulates (stale claims, orphans, contradictions,
  missing links). What [kb-lint](../../kb-lint/SKILL.md) fights.
