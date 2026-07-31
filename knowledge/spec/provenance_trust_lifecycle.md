---
type: Spec Section
title: "OKF §5 — Provenance, trust, and lifecycle"
description: Optional frontmatter families that make where a concept came from, how much to trust it, and whether it is still current answerable from frontmatter alone.
tags: [okf, spec, provenance, trust, lifecycle, sources]
timestamp: 2026-07-31
---

# Provenance, trust, and lifecycle

OKF v0.2 (§5) introduces three frontmatter families that make "where did this come
from," "how much should I trust it," and "is it still current" answerable from
frontmatter. **All are optional**, and their *absence carries meaning*: an unverified
concept is distinguishable from a verified one, but is never rejected (§11).

> **New in v0.2.** These families did not exist in v0.1. A v0.1 concept simply lacks
> them and is consumed as **unverified**, with `generated.at` falling back to a legacy
> `timestamp` where present (§13).

## §5.1 Provenance — `sources`

Records the materials a concept derives from. Covered in detail on the
[Provenance](./citations.md) page: a `sources` list with a REQUIRED per-entry
`resource`, an optional stable `id` for per-claim footnote attribution, and optional
credibility signals (`author`, `usage_count`, `last_modified`) framed by a shared
`usage_window`.

## §5.2 Trust — `generated` and `verified`

Kept distinct because who *wrote* a concept need not be who *confirmed* it.

```yaml
generated: { by: reference_agent/gemini-2.5-pro, at: 2026-06-20T22:53:05Z }
verified:
  - { by: human:ahormati, at: 2026-06-25T09:00:00Z }
  - { by: process:finance-nightly, at: 2026-06-26T02:00:00Z }
```

* **`generated.by`** — REQUIRED within `generated`. An [actor](./actor_convention.md) (§7).
* **`generated.at`** — ISO 8601 datetime marking the content's last meaningful change.
  Supersedes v0.1's `timestamp`.
* **`verified`** — a list of `{ by, at }` verification events. Multiple entries capture
  independent checks (a human sign-off plus a nightly process). "How recently" is the
  latest `at`. It is independent of `generated.at`: content can change without
  re-confirmation, and facts can be re-confirmed without regeneration.
* A single verifier MAY be written as one `{ by, at }` mapping without the list dash;
  **consumers MUST treat a bare mapping as a one-element list.**

## §5.3 Trust tiers

Consumers derive an advisory tier from `verified`, lowest to highest:

* No `verified` key ⇒ **unverified**.
* `verified` by non-`human:` actors only ⇒ **machine-confirmed**.
* `verified` by a `human:<id>` actor ⇒ **human-reviewed**.

Tiers are inferred, not stored, and are **not access control**. A concept with no trust
frontmatter is still consumable (§11).

## §5.4 Lifecycle — `status`

```yaml
status: stable        # draft | stable | deprecated
```

* `draft` — not yet reviewed; possibly incomplete.
* `stable` — default; ready for consumption.
* `deprecated` — kept for links and history; no longer current.

Absent `status` ⇒ `stable`.

## §5.5 Lifecycle — `stale_after`

```yaml
stale_after: 2026-09-23   # absolute date; content is stale on/after this day
```

Optional absolute date (`YYYY-MM-DD`). A concept is stale when `today >= stale_after`.
An absolute date (not a relative TTL) keeps the staleness decision a plain date
comparison with no reference to when the concept was read.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
