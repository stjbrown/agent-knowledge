---
type: Spec Section
title: "OKF §6 — Cross-linking and paths"
description: Concepts link via standard markdown links in two forms (absolute bundle-relative now recommended); a link asserts an untyped relationship conveyed by prose, and consumers MUST tolerate broken links.
tags: [okf, spec, links, graph, paths]
timestamp: 2026-07-31
---

# Cross-linking and paths

OKF (§6) uses **standard markdown links** to express relationships between
[concepts](../concepts/concept_document.md). This is what makes a bundle graph-shaped, not just
tree-shaped: concepts form directed edges regardless of the directory hierarchy. It is the OKF
equivalent of Obsidian `[[wikilinks]]`, but using portable markdown link syntax.

> **Changed from v0.1.** This section was §5 in v0.1; it is **§6** in v0.2, and now
> also defines **path-valued fields** (§6.2) and the **`references/` convention**
> (§6.3). v0.1's written guidance was in flux over which link form to recommend; v0.2
> **settles it: absolute (bundle-relative) links are the recommended form** because
> they are stable when documents are moved within their subdirectory. See the note at
> the bottom on what this bundle does in practice.

## §6.1 Links between concepts

Two forms are supported:

* **Absolute (bundle-relative)** — begins with `/`, interpreted relative to the bundle
  root (e.g. `/tables/customers.md`). This is the **recommended** form in v0.2 because
  it survives a document moving within its subdirectory. It requires an OKF-aware
  resolver: a standard renderer resolves the leading `/` against the *host/repository*
  root, not the bundle root.
* **Relative** — a standard relative markdown path, e.g. `[Frontmatter](./frontmatter.md)`
  or `[up](../concepts/llm_wiki.md)`. Resolves in **any** renderer with no OKF-aware
  tooling. Drawback: a link breaks if the target file moves to a different directory
  depth.

## §6.2 Path-valued fields

Several fields name a path or URI: `resource`, `sources[].resource`, `computation`,
`executor.resource`, and `attester.resource` (§10). A `sources[].resource` may instead
be a scope descriptor (§5.1), in which case it is not a path. Each path-valued field
accepts an absolute URL, a bundle-relative path beginning with `/`, or a relative path.

## §6.3 The `references/` convention

A `references/` subdirectory conventionally mirrors external material, run instructions,
or code as first-class concepts within the bundle. [Sources](./citations.md),
executors, and attesters commonly point into it (e.g. `references/attesters/revenue.py`).
It is a naming convention, not a requirement.

## Link semantics

* A link asserts an **untyped relationship**; the *kind* of relationship (parent/child,
  references, joins-with, depends-on) is conveyed by the surrounding **prose**, not by
  the link itself. There is no `rel=` or edge-type vocabulary.
* Consumers treat links as **directed edges** and MAY compute backlinks ("cited by").
* Consumers **MUST tolerate broken links**. A link to a not-yet-written concept is not
  an error — it may simply mark knowledge that has not been captured yet. (The
  [lint](../operations/lint.md) operation surfaces broken links as a health signal, but
  they never invalidate a bundle.)

Whether to include the `.md` extension in link targets is a producer choice; this bundle
includes it so the links resolve when the files are browsed directly on disk or on
GitHub.

> **Note (what this bundle does).** Although v0.2 recommends the absolute
> (bundle-relative) form, **this bundle uses relative links** throughout, because it
> ships as a nested `knowledge/` subdirectory (§3 allows this) and must render
> correctly on GitHub and for any non-OKF-aware reader — where a leading `/` mislinks
> against the repository root. We converted this bundle from absolute to relative links
> (473 links across 51 files) on 2026-07-01 for exactly that reason. See
> [OKF Spec Evolution](../design/spec_evolution.md#1-link-form-is-being-reversed-recommend-relative-not-absolute).

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
