---
type: Spec Section
title: "OKF §3.1 — Reserved Filenames"
description: index.md and log.md have defined meanings and MUST NOT be used for concept documents; every other .md file is a concept.
tags: [okf, spec, structure]
timestamp: 2026-07-31
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

## Tags are not a reserved file (v0.2)

v0.2 clarifies that **tags remain a first-class concept via the [`tags`](./frontmatter.md)
frontmatter field**, but OKF does **not** specify a separate file format for aggregating documents by
tag. A consumer that wants a tag-browsing view synthesizes one at consumption time by scanning
frontmatter — there is no reserved `tags.md` or tag-index filename.

> **Changed from v0.1:** the two reserved filenames (`index.md`, `log.md`) are unchanged. v0.2 only
> adds the explicit note above that tag aggregation is a consumption-time view, not a third reserved
> file.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
