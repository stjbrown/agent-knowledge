---
type: Spec Section
title: "OKF §7 — Actor convention"
description: A single string convention for identity fields (generated.by, verified[].by) distinguishing agents/tools, humans, and automated processes.
tags: [okf, spec, actor, trust]
timestamp: 2026-07-31
---

# Actor convention

OKF v0.2 (§7) defines a single convention for the identity fields `generated.by` and
`verified[].by` (§5.2). Section 5.1 applies the same convention to the credibility signal
`sources[].author`:

* **`<producer>/<version>`** — for agents and tools, e.g. `reference_agent/gemini-2.5-pro`.
* **`human:<id>`** — for a person, e.g. `human:ahormati`.
* **`process:<id>`** — for an automated process, e.g. `process:finance-nightly`.

> **New in v0.2.** v0.1 had no actor convention because it had no identity fields.
> Producers MUST use the `human:` prefix for hand-authored or human-confirmed content,
> because consumers that classify [trust tiers](./provenance_trust_lifecycle.md) (§5.3)
> key off exactly that prefix to distinguish **human-reviewed** from
> **machine-confirmed**.

## Why a prefix and not a type field

Encoding the actor kind in the string itself keeps identity a single portable value
that survives round-tripping and needs no side table. The `human:` prefix is the one
load-bearing distinction — it is what promotes a concept to the highest trust tier — so
it is made syntactically unambiguous rather than inferred.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
