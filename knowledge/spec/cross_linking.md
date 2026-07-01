---
type: Spec Section
title: "OKF §5 — Cross-linking"
description: Concepts link via standard markdown links in two forms; a link asserts an untyped relationship conveyed by prose, and consumers MUST tolerate broken links.
tags: [okf, spec, links, graph]
timestamp: 2026-07-01
---

# Cross-linking

OKF (§5) uses **standard markdown links** to express relationships between
[concepts](../concepts/concept_document.md). This is what makes a bundle graph-shaped, not just
tree-shaped: concepts form directed edges regardless of the directory hierarchy. It is the OKF
equivalent of Obsidian `[[wikilinks]]`, but using portable markdown link syntax.

OKF defines two link forms. The spec text of v0.1 labels the absolute form "recommended," but the
reference implementation, every shipped sample bundle, and open PR #165 all point the other way —
see the note below. **This bundle uses relative links** throughout, and we recommend them for any
bundle that may ship as a subdirectory.

## §5.1 Relative links (recommended in practice)

Standard relative markdown paths, e.g. `[Frontmatter](./frontmatter.md)` or
`[up](../concepts/llm_wiki.md)`. They resolve in **any** renderer — `cat`, a browser, GitHub, an
editor preview — with no OKF-aware tooling, which is why the reference agent mandates them and this
bundle uses them. Drawback: a link breaks if the target file moves to a different directory depth.

## §5.2 Absolute (bundle-relative) links

A link whose target begins with `/` is interpreted **from the bundle root** (e.g.
`/spec/frontmatter.md`). It survives a file moving between directories, but it **requires an
OKF-aware resolver**: a standard renderer resolves the leading `/` against the *host/repository*
root, not the bundle root, so absolute links mislink or 404 whenever the bundle is nested as a
subdirectory (§3 allows this — and it is exactly this bundle's `knowledge/` layout).

## §5.3 Link semantics

* A link asserts an **untyped relationship**; the *kind* of relationship is conveyed by the
  surrounding **prose**, not by the link itself. There is no `rel=` or edge-type vocabulary.
* Consumers treat links as **directed edges** and MAY compute backlinks ("cited by").
* Consumers **MUST tolerate broken links**. A link to a not-yet-written concept is not an error —
  it may simply mark knowledge that has not been captured yet. (The [lint](../operations/lint.md)
  operation surfaces broken links as a health signal, but they never invalidate a bundle.)

Whether to include the `.md` extension in link targets is a producer choice; this bundle includes
it so the links resolve when the files are browsed directly on disk or on GitHub.

> **Note (spec in flux):** v0.1's *written* guidance still labels the absolute form "recommended,"
> but that is being **reversed** to match practice. The reference agent forbids leading `/` ("breaks
> GitHub rendering"), every shipped [sample bundle](../design/sample_bundle_lessons.md) uses
> relative links, and open PR #165 swaps §5.1/§5.2 to recommend **relative** links. We converted
> this bundle from absolute to relative links (473 links across 51 files) on 2026-07-01 for exactly
> this reason — it renders correctly on GitHub and for any non-OKF-aware reader. See
> [OKF Spec Evolution](../design/spec_evolution.md#1-link-form-is-being-reversed-recommend-relative-not-absolute).

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
