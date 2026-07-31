---
type: Reference
title: OKF Specification (SPEC.md)
description: The authoritative Open Knowledge Format v0.2 specification, in the GoogleCloudPlatform/knowledge-catalog repository.
resource: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
tags: [okf, spec, source, external]
timestamp: 2026-07-31
---

# OKF Specification (SPEC.md)

The authoritative **Open Knowledge Format v0.2** specification. Our [spec section](../spec/index.md)
concepts restate it, one page per section; this reference points at the source of truth. (This
bundle previously restated **v0.1**; it was re-specced to v0.2 on 2026-07-31 — see
[Changes from v0.1](../spec/changes_from_v01.md).)

**Location:** `okf/SPEC.md` in [GoogleCloudPlatform/knowledge-catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf).
Raw: <https://raw.githubusercontent.com/GoogleCloudPlatform/knowledge-catalog/main/okf/SPEC.md>

## Section map

The v0.2 spec is organized as: 1. Motivation (Goals / Non-goals) · 2. Terminology · 3. Bundle
Structure (3.1 Reserved filenames) · 4. Concept Documents (4.1 Frontmatter, 4.2 Body, 4.3/4.4
examples) · 5. Provenance, trust, and lifecycle (5.1 `sources` + credibility signals, 5.2
`generated`/`verified`, 5.3 Trust tiers, 5.4 `status`, 5.5 `stale_after`) · 6. Cross-linking and
paths (6.1 Links, 6.2 Path-valued fields, 6.3 `references/` convention) · 7. Actor convention ·
8. Index Files · 9. Log Files · 10. Attested Computations (10.1–10.6) · 11. Conformance ·
12. Versioning · 13. Changes from v0.1 · Appendix A (worked income-statement example).

Each maps to a concept under [`/spec`](../spec/index.md).

## Key takeaways

* Only [`type`](../spec/frontmatter.md) is a required field; a concept carrying just `type` is fully
  conformant.
* v0.2 makes **provenance, trust, lifecycle, and attestation first-class** while staying minimal —
  see [Provenance, Trust & Lifecycle](../spec/provenance_trust_lifecycle.md) and
  [Attested Computations](../spec/attested_computations.md).
* Two breaking changes from v0.1: [`timestamp` → `generated.at`](../spec/frontmatter.md) and the
  [`# Citations` body list → `sources` frontmatter](../spec/citations.md).
* [`index.md` and `log.md`](../spec/reserved_filenames.md) are still the only reserved filenames.
* [Links are untyped directed edges](../spec/cross_linking.md); consumers must tolerate broken ones.
* [Conformance](../spec/conformance.md) is deliberately minimal; consumers must be tolerant.

## Notes for the skills work

The spec ships with a **reference agent** (see [OKF README](./okf_readme.md)) that
`enrich`es bundles from BigQuery + web crawl and `visualize`s them as a self-contained HTML graph.
That reference agent is Python/BigQuery-specific; our portable skills target the same *format* but
a general (any-project) workflow driven by the [schema layer](../concepts/three_layer_architecture.md#3-the-schema).

# Citations

1. OKF SPEC.md — <https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md>
