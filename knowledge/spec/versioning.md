---
type: Spec Section
title: "OKF §12 — Versioning"
description: OKF uses <major>.<minor> versioning; minor bumps are backward-compatible, major bumps may break; a bundle declares okf_version in its root index.md. Current version is 0.2.
tags: [okf, spec, versioning]
timestamp: 2026-07-31
---

# Versioning

OKF (§12) versions the format as **`<major>.<minor>`**:

* **Minor** bumps introduce backward-compatible additions (new optional fields, new
  conventional section headings). A consumer written for `0.1` should keep working
  against a `0.2` bundle.
* **Major** bumps may make breaking changes (renaming required fields, changing
  reserved filenames).

The current specification is **v0.2**.

> **Changed from v0.1.** This page tracked v0.1 and lived at §11. In v0.2 versioning
> is §12, and v0.2 is the current version. v0.2 is itself a minor bump under this
> scheme *except* for two deliberate breaking changes it calls out (§13.1): the
> `timestamp` field is superseded by `generated.at`, and the body `# Citations` list
> is superseded by `sources`. Both carry consumer fallbacks, so a v0.1 bundle stays
> consumable by a v0.2 consumer.

## Declaring a version

A bundle MAY declare the format version via an **`okf_version`** key in the **root
[`index.md`](./index_files.md)** frontmatter. This is the *only* place frontmatter is
permitted in an index file (see [Reserved Filenames](./reserved_filenames.md)).
Consumers that do not understand the declared version SHOULD attempt best-effort
consumption rather than refusing the bundle.

The declaration is optional; a bundle without it is still a bundle, and consumers
infer a best-effort version.

> **Note on this bundle.** This bundle *documents* OKF v0.2 but is still *authored*
> in v0.1 (its [root index](../index.md) declares `okf_version: "0.1"`). The spec
> content on these pages describes v0.2; the bundle's own frontmatter conforms to
> v0.1 until a separate migration re-authors it.

## Considered and deferred (§12)

v0.2 explicitly leaves several items to a future revision: the full runtime protocol
(receipt and verdict wire formats, the attestation lifecycle), the attester ABI and
sandboxing, attestation caching, and semantic-layer templates (Looker, dbt) where the
[attester](./attested_computations.md) comparison shifts from SQL equality to
model-and-binding equality.

## Relationship to other formats

OKF resembles [LLM Wiki](../concepts/llm_wiki.md) repositories, tools like Obsidian
and Notion, and "metadata-as-code" approaches — but differs by being an actual
**specification** with a conformance bar, rather than a convention or a product. That
is the whole reason to adopt it here even while the spec is young: a written spec is
portable in a way that a per-project convention is not.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
