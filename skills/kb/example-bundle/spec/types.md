---
type: Spec Section
title: Concept Types
description: The type vocabulary this bundle uses.
tags: [schema, meta]
timestamp: 2026-01-01T00:00:00Z
---

# Concept Types

The `type` values used by concepts in this bundle. OKF requires only that `type` be non-empty; this
list is *this bundle's* convention, so the `kb-*` skills route consistently. Extend it as the domain
grows.

| type | Meaning | Lives in |
|---|---|---|
| `Spec Section` | A rule about how this bundle is organized (like this file). | `spec/` |
| `customer` | A person or org that places orders. | `concepts/` |
| `order` | A purchase made by a customer. | `concepts/` |
| `Reference` | A mirror of external source material (points at it via `resource`). | `references/` |

Replace these with your own domain's entities (e.g. `person`, `deal`, `metric`, `character`,
`chapter`).
