---
type: Spec Section
title: "OKF §4.1 — Frontmatter"
description: The YAML metadata block on every concept — type is the only required key; title/description/resource/tags are recommended; v0.2 adds the optional provenance, trust, and lifecycle families.
tags: [okf, spec, frontmatter]
timestamp: 2026-07-31
---

# Frontmatter

OKF (§4, §4.1) requires every [concept document](../concepts/concept_document.md) to begin with a
YAML frontmatter block, delimited by `---` on its own line at the start of the file and a closing
`---` on its own line. The frontmatter is machine-readable metadata; everything else is
[body](./body.md).

## Required

* **`type`** *(string, non-empty)* — a short string naming the kind of concept, used for
  routing, filtering, and presentation. It is **not** centrally registered — producers pick
  descriptive, self-explanatory values (e.g. `BigQuery Table`, `API Endpoint`, `Playbook`,
  `Attested Computation`, or, in this bundle, `Concept`, `Spec Section`, `Operation`, `Reference`,
  `Implementation`). Consumers MUST handle unknown types gracefully, treating them as generic
  concepts.

`type` is the **only** required key; **a concept carrying just `type` is fully conformant**
(see [Conformance](./conformance.md)).

## Recommended

* **`title`** — human-readable display name (consumers MAY derive one from the filename if absent).
* **`description`** — a single summarizing sentence.
* **`resource`** — a URI identifying the underlying asset the concept describes; omitted for
  abstract concepts.
* **`tags`** — a YAML list of short categorization strings.

## Optional families (new in v0.2)

The **provenance**, **trust**, and **lifecycle** families, and the **computation** fields for
Attested Computation concepts, may also appear. All are optional; their absence carries meaning (an
unverified concept is distinguishable from a verified one) but never causes rejection.

* **`sources`** — the materials a concept derives from, with per-source credibility signals
  (`author`, `usage_count`, `last_modified`) and the `usage_window` sibling.
* **`generated`** — `{ by, at }`; how the current content was produced (`by` is an
  [actor](./actor_convention.md); `at` marks the last meaningful content change).
* **`verified`** — a list of `{ by, at }` verification events; drives [trust tiers](./provenance_trust_lifecycle.md#53-trust-tiers).
* **`status`** — `draft | stable | deprecated` (absent ⇒ `stable`).
* **`stale_after`** — an absolute `YYYY-MM-DD` date; the concept is stale on/after it.

See [Provenance, Trust & Lifecycle](./provenance_trust_lifecycle.md) for the full family and
[Attested Computations](./attested_computations.md) for `runtime`, `parameters`, `computation`,
`executor`, and `attester`.

## Extensions

Producers MAY add arbitrary additional keys. Consumers **SHOULD** preserve unknown keys when
round-tripping and **MUST NOT** reject documents with unrecognized fields. This is what makes OKF
forward-compatible and lets domain tools layer their own metadata on top without breaking OKF
consumers.

## Example

```yaml
---
type: BigQuery Table
title: Customer Orders
description: One row per completed customer order across all channels.
resource: https://console.cloud.google.com/bigquery?...
tags: [sales, orders, revenue]
generated: { by: reference_agent/gemini-2.5-pro, at: 2026-05-28T14:30:00Z }
---
```

> **Changed from v0.1 (breaking):** v0.1 recommended a **`timestamp`** key (ISO 8601 datetime of the
> last meaningful change). In v0.2 that is **superseded by `generated.at`** inside the `generated`
> family. Consumers MAY fall back to a legacy `timestamp` when `generated` is absent, so v0.1
> bundles remain consumable. The spec pages *in this bundle* still carry `timestamp` in their own
> frontmatter because this bundle is authored in v0.1 (`okf_version: "0.1"`) while documenting v0.2 —
> see [Versioning](./versioning.md) and [Changes from v0.1](./changes_from_v01.md).

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
