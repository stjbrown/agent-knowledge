---
type: Spec Section
title: "OKF §4.2 — Body"
description: The markdown content after the frontmatter — standard markdown, no required sections, with conventional headings used when applicable.
tags: [okf, spec, body]
timestamp: 2026-07-01
---

# Body

OKF (§4.2) defines the **body** as the standard markdown content following the
[frontmatter](./frontmatter.md). The body is where prose, schemas, and examples live —
content for humans and LLMs to read. There are **no required sections**.

## Conventional headings

When applicable, OKF recommends these headings so consumers can find common content
predictably:

* **`# Schema`** — for a resource-bound concept, the asset's columns/fields (§4.3).
* **`# Examples`** — usage examples.
* **`# Citations`** — external sources; see [Citations](./citations.md) (§8).

These are conventions, not requirements. A concept with nothing to schematize simply omits
`# Schema`.

## Resource-bound vs. abstract concepts

* **Bound to a resource** (§4.3) — the concept describes a concrete asset, carries a `resource`
  URI in frontmatter, and typically has a `# Schema` section. Example from the spec: a BigQuery
  Table with a schema table, join notes, and citations.
* **Not bound to a resource** (§4.4) — the concept is abstract (a playbook, a theme, an idea),
  has no `resource`, and structures its body however suits it. Example from the spec: a Playbook
  with trigger and steps sections. Every concept in *this* bundle is abstract.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
