---
type: Spec Section
title: "OKF §3.1 — Reserved Filenames"
description: index.md and log.md have defined meanings and MUST NOT be used for concept documents; every other .md file is a concept.
tags: [okf, spec, structure]
timestamp: 2026-07-01
---

# Reserved Filenames

OKF (§3.1) reserves exactly two filenames, which may appear in any directory:

* **`index.md`** — a directory listing. See [Index Files](./index_files.md).
* **`log.md`** — a change history. See [Log Files](./log_files.md).

These names **MUST NOT** be used for [concept documents](../concepts/concept_document.md). Every
other `.md` file in a bundle **is** a concept document and is therefore subject to the
[frontmatter](./frontmatter.md) rules.

The practical consequence: reserved files are *not* concepts, so they are exempt from the
`type` requirement. In fact they carry **no frontmatter at all**, with a single exception — the
**root `index.md`** MAY carry frontmatter solely to declare
[`okf_version`](./versioning.md). This bundle's [root index](../index.md) does exactly that;
all other index files (and this `log.md`) have no frontmatter.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
