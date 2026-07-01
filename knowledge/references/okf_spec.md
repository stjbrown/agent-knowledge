---
type: Reference
title: OKF Specification (SPEC.md)
description: The authoritative Open Knowledge Format v0.1 specification, in the GoogleCloudPlatform/knowledge-catalog repository.
resource: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
tags: [okf, spec, source, external]
timestamp: 2026-07-01
---

# OKF Specification (SPEC.md)

The authoritative **Open Knowledge Format v0.1** specification. Our [spec section](../spec/index.md)
concepts restate it, one page per section; this reference points at the source of truth.

**Location:** `okf/SPEC.md` in [GoogleCloudPlatform/knowledge-catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf).
Raw: <https://raw.githubusercontent.com/GoogleCloudPlatform/knowledge-catalog/main/okf/SPEC.md>

## Section map

The spec is organized as: 1. Motivation (Goals / Non-goals) · 2. Terminology · 3. Bundle
Structure (3.1 Reserved filenames) · 4. Concept Documents (4.1 Frontmatter, 4.2 Body, 4.3/4.4
examples) · 5. Cross-linking (5.1 Absolute, 5.2 Relative, 5.3 Semantics) · 6. Index Files ·
7. Log Files · 8. Citations · 9. Conformance · 10. Relationship to other formats ·
11. Versioning · Appendix A (minimal example bundle).

Each maps to a concept under [`/spec`](../spec/index.md).

## Key takeaways

* Only [`type`](../spec/frontmatter.md) is a required field.
* [`index.md` and `log.md`](../spec/reserved_filenames.md) are reserved.
* [Links are untyped directed edges](../spec/cross_linking.md); consumers must tolerate broken ones.
* [Conformance](../spec/conformance.md) is deliberately minimal; consumers must be tolerant.
* OKF's differentiator (§10) is that it is a *specified* format, not a convention or product.

## Notes for the skills work

The spec ships with a **reference agent** (see [OKF README](./okf_readme.md)) that
`enrich`es bundles from BigQuery + web crawl and `visualize`s them as a self-contained HTML graph.
That reference agent is Python/BigQuery-specific; our portable skills target the same *format* but
a general (any-project) workflow driven by the [schema layer](../concepts/three_layer_architecture.md#3-the-schema).

# Citations

1. OKF SPEC.md — <https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md>
