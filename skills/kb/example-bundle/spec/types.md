---
type: Spec Section
title: Concept Types
description: The type vocabulary this bundle uses.
tags: [schema, meta]
generated: { by: process:agent-knowledge-example, at: 2026-01-01T00:00:00Z }
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
| `Reference` | A captured source recorded once with honest provenance. | `references/` |

Keep the workflow types `Spec Section` and `Reference`. Replace `customer` and `order` with a small,
provisional set of domain entities (e.g. `person`, `deal`, `metric`, `character`, `chapter`) and
extend that set as the domain becomes clearer.
