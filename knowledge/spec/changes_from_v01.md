---
type: Spec Section
title: "OKF §13 — Changes from v0.1"
description: v0.2 supersedes v0.1 as a minor bump except for two deliberate breaking changes (timestamp and the # Citations list), each with a consumer fallback; everything else is additive.
tags: [okf, spec, versioning, migration, changelog]
timestamp: 2026-07-31
---

# Changes from v0.1

OKF v0.2 (§13) supersedes v0.1 and is a **minor version bump** under [§12](./versioning.md),
**except for two deliberate breaking changes** called out below because they rename or
retire v0.1 fields. A v0.1 bundle stays consumable by a v0.2 consumer under the
fallbacks noted here.

## §13.1 Breaking changes

* **`timestamp` is superseded by `generated.at`.** A concept's last content change is now
  recorded as `generated: { by, at }` ([§5.2](./provenance_trust_lifecycle.md)).
  *Fallback:* consumers MAY fall back to a legacy `timestamp` when `generated` is absent.
* **The body `# Citations` list is superseded by `sources`.** Provenance moves to
  frontmatter ([§5.1](./citations.md)). *Fallback:* consumers SHOULD read `sources` and
  MAY still parse a legacy `# Citations` body list for v0.1 documents.

## §13.2 Additive changes

All additive — new optional keys, one new concept type, one new conventional heading:

* **Provenance / trust / lifecycle families** (§5): `sources` (+ `usage_window`),
  `generated`, `verified`, `status`, `stale_after`, and derived trust tiers.
* **[Actor convention](./actor_convention.md)** (§7): `<producer>/<version>`,
  `human:<id>`, `process:<id>`.
* **[Attested Computation](./attested_computations.md) concept** (§10) and its contract
  fields (`runtime`, `parameters`, `computation`, `executor`, `attester`).
* **`# Computation`** conventional [body](./body.md) heading (§4.2).
* **Path-valued fields and the `references/` convention** made explicit in
  [§6](./cross_linking.md); absolute (bundle-relative) links now recommended.

## Section renumbering

Because v0.2 inserts §5 (provenance/trust/lifecycle) and §7 (actor convention), later
sections shift:

| Section | v0.1 | v0.2 |
|---|---|---|
| Cross-linking | §5 | §6 |
| Index files | §6 | §8 |
| Log files | §7 | §9 |
| Citations → Provenance | §8 | §5.1 |
| Conformance | §9 | §11 |
| Versioning | §11 | §12 |

## What it means for this bundle

This bundle *documents* OKF v0.2 across its `spec/` pages while remaining *authored* in
v0.1 — its [root index](../index.md) still declares `okf_version: "0.1"`. Migrating the
bundle's own frontmatter to conform to v0.2 (adding `generated`/`sources`, moving
citations, etc.) is a separate future exercise. See
[OKF Spec Evolution](../design/spec_evolution.md).

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
