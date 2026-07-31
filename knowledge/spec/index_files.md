---
type: Spec Section
title: "OKF §8 — Index Files"
description: Optional index.md files enumerate a directory's contents for progressive disclosure; they contain no frontmatter and group concept links under headings.
tags: [okf, spec, index, reserved]
timestamp: 2026-07-31
---

# Index Files

OKF (§8) defines `index.md` as an **optional** directory listing that enumerates the directory's
contents, enabling [progressive disclosure](../concepts/progressive_disclosure.md) — letting a
human or agent see what is available before opening individual documents. It is one of the
two [reserved filenames](./reserved_filenames.md).

> **Changed from v0.1.** This section was §6 in v0.1; it is **§8** in v0.2. The rules
> are unchanged.

## Rules

* An `index.md` MAY appear in **any** directory, including the bundle root.
* It contains **no frontmatter** — with the single exception that the **root** `index.md` MAY
  carry frontmatter to declare [`okf_version`](./versioning.md).
* It groups [concept](../concepts/concept_document.md) links under **section headings**, each link
  followed by the concept's short description (SHOULD reuse the linked concept's frontmatter
  `description`).

## Format

```markdown
# Section / Group Heading

* [Title 1](relative-or-absolute-url) - short description of item 1
* [Title 2](another-url) - short description of item 2

# Another Section

* [Subdirectory](subdir/) - short description of the subdirectory
```

The [root index](../index.md) of this bundle and each section index (e.g.
[concepts](../concepts/index.md), this `spec/index.md`) follow exactly this shape. Producers MAY
generate `index.md` automatically; consumers MAY synthesize one on the fly when none is present.
Index files are maintained on every [ingest](../operations/ingest.md); keeping them current is
what makes progressive-disclosure navigation reliable. Because index files are optional, consumers
**MUST NOT** reject a bundle that lacks them.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
