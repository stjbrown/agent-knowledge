---
type: Spec Section
title: "OKF §2 — Terminology"
description: The core OKF vocabulary — bundle, concept, concept ID, frontmatter, body, link, citation.
tags: [okf, spec, vocabulary]
timestamp: 2026-07-01
---

# Terminology

OKF (§2) defines the following core terms.

* **Knowledge Bundle** — a directory tree of markdown files that together form a corpus of
  knowledge. See [Knowledge Bundle](../concepts/knowledge_bundle.md) and
  [Bundle Structure](./bundle_structure.md).
* **Concept** — a single unit of knowledge, stored as one markdown file. See
  [Concept Document](../concepts/concept_document.md).
* **Concept ID** — a concept's file path within the bundle with the `.md` extension removed
  (e.g. `spec/terminology.md` → `spec/terminology`).
* **Frontmatter** — the YAML metadata block at the top of a concept document. See
  [Frontmatter](./frontmatter.md).
* **Body** — the markdown content following the frontmatter. See [Body](./body.md).
* **Link** — a standard markdown link from one concept to another, treated as a directed edge.
  See [Cross-linking](./cross_linking.md).
* **Citation** — a reference to an external source, listed under a `# Citations` heading. See
  [Citations](./citations.md).

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
