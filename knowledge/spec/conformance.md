---
type: Spec Section
title: "OKF §9 — Conformance"
description: The minimal bar a bundle must clear — parseable frontmatter with a non-empty type on every concept, well-formed reserved files — and the things consumers must not reject over.
tags: [okf, spec, conformance]
timestamp: 2026-07-01
---

# Conformance

OKF (§9) sets a deliberately low bar. A bundle **conforms** if:

1. Every non-reserved `.md` file has **parseable YAML frontmatter**;
2. That frontmatter has a **non-empty [`type`](./frontmatter.md)**; and
3. Any [reserved files](./reserved_filenames.md) present follow their structures
   ([index](./index_files.md), [log](./log_files.md)).

That is the entire producer obligation.

## What consumers MUST NOT reject over

To keep OKF tolerant and forward-compatible, consumers **MUST NOT** reject a bundle for any of:

* missing **optional** fields (`title`, `description`, `resource`, `tags`, `timestamp`);
* **unknown `type`** values;
* **unknown frontmatter keys**;
* **broken [links](./cross_linking.md)**; or
* **missing [index files](./index_files.md)**.

## Checklist for this bundle

The [lint](../operations/lint.md) operation and the repo's conformance check verify:

* [x] every concept document has frontmatter with a non-empty `type`;
* [x] reserved `index.md`/`log.md` carry no frontmatter (except the root index's `okf_version`);
* [x] the root [index](../index.md) declares `okf_version: "0.1"`;
* [x] log date headings use `YYYY-MM-DD`.

Broken links are reported by lint as a health signal but, per §5.3 and §9, never affect
conformance.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
