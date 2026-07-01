---
type: Spec Section
title: "OKF §4.1 — Frontmatter"
description: The YAML metadata block on every concept — type is the only required key; title, description, resource, tags, and timestamp are recommended; unknown keys are allowed.
tags: [okf, spec, frontmatter]
timestamp: 2026-07-01
---

# Frontmatter

OKF (§4, §4.1) requires every [concept document](../concepts/concept_document.md) to begin with a
YAML frontmatter block. The frontmatter is machine-readable metadata; everything else is
[body](./body.md).

## Required

* **`type`** *(string, non-empty)* — a short string naming the kind of concept, used for
  routing, filtering, and presentation. It is **not** centrally registered — producers pick
  descriptive, self-explanatory values (e.g. `BigQuery Table`, `API Endpoint`, `Playbook`, or,
  in this bundle, `Concept`, `Spec Section`, `Operation`, `Reference`, `Implementation`).
  Consumers MUST handle unknown types gracefully, treating them as generic concepts.

`type` is the **only** required key. This is the crux of [conformance](./conformance.md).

## Recommended (in priority order)

* **`title`** — human-readable display name (consumers MAY derive one from the filename if absent).
* **`description`** — a single summarizing sentence.
* **`resource`** — a URI identifying the underlying asset the concept describes; omitted for
  abstract concepts.
* **`tags`** — a YAML list of short categorization strings.
* **`timestamp`** — ISO 8601 datetime of the last meaningful change.

## Extensions

Producers MAY add arbitrary additional keys. Consumers **SHOULD NOT reject** documents with
unrecognized fields, and SHOULD preserve them. This is what makes OKF forward-compatible and lets
domain tools layer their own metadata (e.g. Obsidian, Dataview) on top without breaking OKF
consumers.

## Example

The frontmatter of the file you are reading:

```yaml
---
type: Spec Section
title: "OKF §4.1 — Frontmatter"
description: The YAML metadata block on every concept — ...
tags: [okf, spec, frontmatter]
timestamp: 2026-07-01
---
```

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
