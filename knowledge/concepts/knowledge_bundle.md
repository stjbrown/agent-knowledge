---
type: Concept
title: Knowledge Bundle
description: The OKF term for a directory tree of concept documents — the unit of production, exchange, and consumption.
tags: [okf, vocabulary]
timestamp: 2026-07-01
---

# Knowledge Bundle

A **knowledge bundle** (or just *bundle*) is the OKF unit of knowledge: a directory tree of
markdown [concept documents](./concept_document.md) plus optional reserved
[index](../spec/index_files.md) and [log](../spec/log_files.md) files. It is the OKF formalization
of the "wiki" layer in the [three-layer architecture](./three_layer_architecture.md).

See [Bundle Structure](../spec/bundle_structure.md) for the normative rules. In short:

* A bundle is just a directory — no manifest or database is required.
* It can be distributed as a git repository (recommended), an archive (tar/zip), or a
  subdirectory of a larger repository. This repository uses the last form: the bundle lives in
  `knowledge/`.
* Its internal organization is domain-independent; producers arrange concepts as they see fit.
* It may declare its format version via `okf_version` in the root
  [index file](../spec/index_files.md) — see [Versioning](../spec/versioning.md).

Because a bundle is plain markdown and YAML, anyone can produce one (people, agents on any
framework, export pipelines) and anyone can consume one (file servers, Obsidian/Notion, LLMs,
search indexes, graph viewers). This vendor-neutrality is the whole point of
[OKF](../spec/index.md).

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
