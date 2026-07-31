---
type: Spec Section
title: "OKF §5.1 — Provenance (sources)"
description: "Provenance moves to a sources frontmatter list; per-claim attribution uses markdown footnotes keyed to a source id."
tags: [okf, spec, citations, provenance, sources]
timestamp: 2026-07-31
---

# Provenance

In OKF v0.2 (§5.1), the materials a concept derives from are recorded in a
**`sources`** frontmatter list rather than a body `# Citations` heading. This keeps
*external* provenance (where the knowledge came from) in structured frontmatter,
distinct from *internal* [cross-links](./cross_linking.md) (how concepts relate) in
the body.

> **Changed from v0.1.** v0.1 recommended a numbered **`# Citations`** heading at the
> bottom of a [concept document](../concepts/concept_document.md). v0.2 supersedes
> that list with the `sources` frontmatter family (§13.1). Consumers SHOULD read
> `sources` and MAY still parse a legacy `# Citations` body list for v0.1 documents.

## The `sources` list

```yaml
sources:
  - id: ga4-schema
    resource: https://developers.google.com/analytics/bigquery/export-schema
    title: GA4 BigQuery Export schema
    author: team:ga4-docs
    usage_count: 5000
    last_modified: 2026-05-30
usage_window: { from: 2026-06-01, to: 2026-06-30 }
```

Each entry:

- **`resource`** — REQUIRED within an entry. Names either a concrete artifact a
  consumer can follow or a scope descriptor it cannot (e.g. `all queries in
  BigQuery project X`).
- **`id`** — Optional stable key used to attribute individual claims. SHOULD be
  present when the body cites the source.
- **`title`** — Optional human-readable label.
- **Credibility signals** (all optional): `author` (an actor, §7 — an authority
  signal), `usage_count` (how often `resource` was exercised over `usage_window` —
  an adoption/liveness signal), and `last_modified` (when the source itself last
  changed — a recency signal, distinct from `generated.at`).
- **`usage_window`** — Written once as a sibling of `sources`, it frames every
  `usage_count` with a `{ from, to }` range; a single entry MAY override it.

OKF records objective per-source signals rather than a stored credibility *score* — a
score is subjective, unportable, and goes stale. Credibility is *inferred* from the
signals, the same way [trust tiers](./conformance.md) are.

## Where a source's `resource` may point

A `sources[].resource` accepts (§6.2):

1. an **absolute URL** to the external source;
2. a **bundle-relative path** to another concept; or
3. a path into a **`references/` subdirectory that mirrors external material as
   first-class OKF concepts.**

That third option is the spec's blessing for keeping source material *inside* the
bundle: PDFs, images, transcripts, `.mov` files, captured web pages. Store the asset
under `references/` and wrap it in a `type: Reference` concept that points at it — the
source becomes a citable, linkable node in the graph rather than an external URL that
may rot. **Lineage is expressed through links, not a dedicated field:** when a
`resource` points at another OKF concept, the derivation edge already exists in the
bundle graph (§6), so a consumer MAY recurse into that source's own `sources` and let
credibility propagate.

## Per-claim attribution: footnotes

To attribute a specific claim, use a markdown footnote whose label is a
`sources[].id`:

```markdown
The `events_` table is sharded daily as `events_YYYYMMDD`.[^ga4-schema]

[^ga4-schema]: GA4 BigQuery Export schema
```

The footnote label is the join key into `sources`; consumers resolve attribution
through the matching entry, not by parsing the footnote prose. Labels are **keyed**
rather than positional (`sources[0]`) because agents constantly rewrite these
documents — a positional index misattributes silently the moment the list is
reordered, whereas a stable `id` survives reordering.

## Canonical source vs. derived text

A useful discipline: **separate the canonical source from the derived text.** A
`references/` concept holds a *stable pointer* to the original asset (via `resource`
or an embedded/linked file) **and** carries extracted text, a summary, or a
description — so the source is preserved for provenance while the derived text stays
useful for retrieval (agents can read it without opening a binary). The practical
rule: if a document is part of the knowledge base, keep a stable pointer to it *in*
the bundle; if it is merely incidental supporting material, cite it externally and
leave it out. This bundle applies the pattern in
[OKF vs. RAG infographic](../references/okf_vs_rag_infographic.md) (images stored
under [`assets/`](../references/okf_vs_rag_infographic.md), wrapped in a Reference
concept with descriptive alt text).

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
