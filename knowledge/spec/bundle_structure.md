---
type: Spec Section
title: "OKF §3 — Bundle Structure"
description: A bundle is a directory tree of markdown files, distributable as a git repo, an archive, or a subdirectory; its internal organization is domain-independent.
tags: [okf, spec, structure]
timestamp: 2026-07-01
---

# Bundle Structure

OKF (§3) defines a [bundle](../concepts/knowledge_bundle.md) as a **directory tree of markdown
files**. There is no manifest, index database, or required tooling — the filesystem *is* the
structure.

## Distribution

A bundle MAY be distributed as:

* a **git repository** (recommended — you get diffs, blame, and PR review for free);
* an **archive** (tar/zip); or
* a **subdirectory** of a larger repository.

This repository uses the subdirectory form: the bundle is `knowledge/` inside a repo that will
also hold the portable skills.

## Organization

The internal organization is **domain-independent**. Producers arrange concepts into whatever
directory hierarchy suits the domain; OKF does not mandate any particular folders. Directories
can carry [index files](./index_files.md) to support
[progressive disclosure](../concepts/progressive_disclosure.md), and concepts link freely across
directories via [cross-links](./cross_linking.md), making the bundle graph-shaped rather than
strictly tree-shaped.

The only filename constraints are the two [reserved filenames](./reserved_filenames.md).

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
