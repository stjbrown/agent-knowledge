---
type: Spec Section
title: "OKF §6 — Index Files"
description: Optional index.md files enumerate a directory's contents for progressive disclosure; they contain no frontmatter and group concept links under headings.
tags: [okf, spec, index, reserved]
timestamp: 2026-07-01
---

# Index Files

OKF (§6) defines `index.md` as an **optional** directory listing that enumerates the directory's
contents, enabling [progressive disclosure](../concepts/progressive_disclosure.md). It is one of the
two [reserved filenames](./reserved_filenames.md).

## Rules

* An `index.md` MAY appear in **any** directory.
* It contains **no frontmatter** — with the single exception that the **root** `index.md` MAY
  carry frontmatter to declare [`okf_version`](./versioning.md).
* It groups [concept](../concepts/concept_document.md) links under **section headings**, each link
  followed by the concept's short description.

## Format

```markdown
# Section / Group Heading

* [Title 1](relative-or-absolute-url) - short description of item 1
* [Title 2](another-url) - short description of item 2
```

The [root index](../index.md) of this bundle and each section index (e.g.
[concepts](../concepts/index.md), this `spec/index.md`) follow exactly this shape. Index files are
maintained on every [ingest](../operations/ingest.md); keeping them current is what makes
progressive-disclosure navigation reliable. Because index files are optional, consumers
**MUST NOT** reject a bundle that lacks them.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
