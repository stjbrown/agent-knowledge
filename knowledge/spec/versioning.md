---
type: Spec Section
title: "OKF §11 — Versioning"
description: OKF uses <major>.<minor> versioning; minor bumps are backward-compatible, major bumps may break; a bundle declares okf_version in its root index.md.
tags: [okf, spec, versioning]
timestamp: 2026-07-01
---

# Versioning

OKF (§11) versions the format as **`<major>.<minor>`**:

* **Minor** bumps add backward-compatible features. A consumer written for `0.1` should keep
  working against a `0.2` bundle.
* **Major** bumps may introduce breaking changes.

The current specification is **v0.1**.

## Declaring a version

A bundle MAY declare the format version via an **`okf_version`** key in the **root
[`index.md`](./index_files.md)** frontmatter. This is the *only* place frontmatter is
permitted in an index file (see [Reserved Filenames](./reserved_filenames.md)). This bundle's
[root index](../index.md) declares:

```yaml
---
okf_version: "0.1"
---
```

The declaration is optional; a bundle without it is still a bundle, and consumers infer a
best-effort version.

## Relationship to other formats (§10)

The spec also notes (§10) that OKF resembles [LLM Wiki](../concepts/llm_wiki.md) repositories, tools
like Obsidian and Notion, and "metadata-as-code" approaches — but differs by being an actual
**specification** with a conformance bar, rather than a convention or a product. That is the whole
reason to adopt it here even while the spec is young: a written spec is portable in a way that a
per-project convention is not.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
