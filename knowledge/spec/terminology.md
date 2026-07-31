---
type: Spec Section
title: "OKF §2 — Terminology"
description: The core OKF v0.2 vocabulary — bundle, concept, frontmatter, body, link, plus the new provenance, trust, and attestation terms.
tags: [okf, spec, vocabulary]
timestamp: 2026-07-31
---

# Terminology

OKF (§2) defines the following core terms.

## Structure

* **Knowledge Bundle** (or **bundle**) — a self-contained, hierarchical collection of knowledge
  documents; the unit of distribution. See [Knowledge Bundle](../concepts/knowledge_bundle.md) and
  [Bundle Structure](./bundle_structure.md).
* **Concept** — a single unit of knowledge within a bundle, stored as one markdown document. It may
  describe a tangible asset (a table, an API), an abstract idea (a metric, a business process), or
  anything in between. See [Concept Document](../concepts/concept_document.md).
* **Concept ID** — a concept's file path within the bundle with the `.md` suffix removed
  (e.g. `spec/terminology.md` → `spec/terminology`).
* **Frontmatter** — the YAML metadata block delimited by `---` at the top of a markdown file. See
  [Frontmatter](./frontmatter.md).
* **Body** — everything in the file after the frontmatter. See [Body](./body.md).
* **Link** — a standard markdown link from one concept to another, used to express relationships
  beyond the implicit parent/child hierarchy; treated as a directed edge. See
  [Cross-linking](./cross_linking.md).

## Provenance & trust (new in v0.2)

* **Source** — a material a concept derives from, external or internal to the bundle, recorded in
  the `sources` frontmatter field. See [Provenance, Trust & Lifecycle](./provenance_trust_lifecycle.md).
* **Provenance** — the set of sources a concept derives from.
* **Credibility signal** — an objective, per-source fact (`author`, `usage_count`, `last_modified`)
  used to infer trust; OKF records the signals, not a verdict.
* **Actor** — a string identifying who or what performed an action, using `<producer>/<version>` for
  agents, `human:<id>` for people, and `process:<id>` for automated processes. See
  [Actor Convention](./actor_convention.md).
* **Trust tier** — a level derived from a concept's `verified` field: *unverified*,
  *machine-confirmed*, or *human-reviewed*.

## Attestation (new in v0.2)

* **Attested Computation** — a concept (`type: Attested Computation`) carrying a sanctioned way to
  compute a value, so a consumer can confirm the value was produced by running it. See
  [Attested Computations](./attested_computations.md).
* **Executor** — run instructions or code that executes a computation and returns a receipt.
* **Receipt** — the evidence a run returns, shaped by `executor.receipt`; a runtime artifact, not
  stored in the bundle.
* **Attester** — deterministic (no-LLM) code that inspects a receipt and returns a verdict.

> **Changed from v0.1:** v0.1 also defined **Citation** ("a reference to an external source, listed
> under a `# Citations` heading"). v0.2 supersedes the `# Citations` body list with the `sources`
> frontmatter family and keyed markdown footnotes — see [Citations](./citations.md). All of the
> provenance, trust, and attestation terms above are new in v0.2.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
