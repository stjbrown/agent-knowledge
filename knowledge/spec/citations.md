---
type: Spec Section
title: "OKF §8 — Citations"
description: External sources should be listed under a numbered # Citations heading at the bottom of a concept document.
tags: [okf, spec, citations]
timestamp: 2026-07-01
---

# Citations

OKF (§8) recommends that external sources be listed under a numbered **`# Citations`** heading at
the **bottom** of a [concept document](../concepts/concept_document.md). This distinguishes
*external* provenance (where the knowledge came from) from *internal*
[cross-links](./cross_linking.md) (how concepts relate to each other).

## Format

```markdown
# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
2. Vannevar Bush, "As We May Think," The Atlantic, July 1945.
```

Entries may be markdown links (to external URLs or to [reference](../references/index.md) concepts
within the bundle) or plain prose for offline sources. Citations are a `# Citations`
[body](./body.md) convention — they are recommended when applicable, not required. In this
bundle, concept pages cite the [references](../references/index.md) they were compiled from, so the
bundle records its own provenance.

## Where a citation may point

§8 explicitly allows three citation targets:

1. an **absolute URL** to the external source;
2. a **bundle-relative path** to another concept; or
3. a path into a **`references/` subdirectory that mirrors external material as first-class OKF
   concepts.**

That third option is the spec's blessing for keeping source material *inside* the bundle:
PDFs, images, transcripts, `.mov` files, captured web pages. Store the asset under `references/`
and wrap it in a `type: Reference` concept that points at it — the source becomes a citable,
linkable node in the graph rather than an external URL that may rot.

## Canonical source vs. derived text

A useful discipline (from OKF discussion #91): **separate the canonical source from the derived
text.** The `references/` concept holds a *stable pointer* to the original asset (via `resource` or
an embedded/linked file) **and** carries extracted text, a summary, or a description — so the source
is preserved for provenance while the derived text stays useful for retrieval (agents can read it
without opening a binary). The practical rule: if a document is part of the knowledge base, keep a
stable pointer to it *in* the bundle; if it is merely incidental supporting material, cite it
externally and leave it out. This bundle applies the pattern in
[OKF vs. RAG infographic](../references/okf_vs_rag_infographic.md) (images stored under
[`assets/`](../references/okf_vs_rag_infographic.md), wrapped in a Reference concept with descriptive
alt text).

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
