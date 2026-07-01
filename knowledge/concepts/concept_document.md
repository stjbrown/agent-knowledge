---
type: Concept
title: Concept Document
description: The OKF term for a single unit of knowledge — a UTF-8 markdown file with a YAML frontmatter block and a markdown body.
tags: [okf, vocabulary]
timestamp: 2026-07-01
---

# Concept Document

A **concept document** (or *concept*) is a single unit of knowledge in a
[knowledge bundle](./knowledge_bundle.md): a UTF-8 markdown file with a
[YAML frontmatter block](../spec/frontmatter.md) followed by a [markdown body](../spec/body.md).
Every `.md` file in a bundle is a concept document *except* the reserved
[`index.md` and `log.md`](../spec/reserved_filenames.md).

Every file you are reading in this bundle's `concepts/`, `spec/`, `operations/`,
`implementations/`, and `references/` directories is a concept document.

## Concept ID

A concept's identifier is its file path within the bundle with the `.md` extension removed.
For example, this file's concept ID is `concepts/concept_document`. Concept IDs are how concepts
are referenced and how [cross-links](../spec/cross_linking.md) resolve.

## Anatomy

* **Frontmatter** — machine-readable metadata. Only [`type`](../spec/frontmatter.md) is required;
  `title`, `description`, `resource`, `tags`, and `timestamp` are recommended.
* **Body** — human- and agent-readable markdown prose, with conventional headings such as
  `# Schema`, `# Examples`, and `# Citations` when applicable. See [Body](../spec/body.md).

A concept may be **bound to a resource** (e.g. a database table, with a `resource` URI) or
**abstract** (e.g. a playbook or, as here, an idea) with no `resource`. Every concept in this
bundle is abstract.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
