---
type: Spec Section
title: "OKF §11 — Conformance"
description: The minimal bar a bundle must clear — parseable frontmatter with a non-empty type on every concept, well-formed reserved files — plus SHOULD-level rules for the optional families, and the things consumers must not reject over.
tags: [okf, spec, conformance, trust]
timestamp: 2026-07-31
---

# Conformance

OKF (§11) sets a deliberately low bar. A bundle **conforms with OKF v0.2** if:

1. Every non-reserved `.md` file has **parseable YAML frontmatter**;
2. That frontmatter has a **non-empty [`type`](./frontmatter.md)**; and
3. Any [reserved files](./reserved_filenames.md) present follow their structures
   ([index](./index_files.md) §8, [log](./log_files.md) §9).

That is the entire *required* producer obligation. `type` is the only always-required key.

> **Changed from v0.1.** This section was §9 in v0.1; it is **§11** in v0.2. The three
> hard requirements are unchanged, but v0.2 adds SHOULD-level rules for the optional
> **provenance / trust / lifecycle** (§5) and **computation** (§10) families, and
> expands the list of things consumers MUST NOT reject over.

## When the optional families are present

When the trust, lifecycle, provenance, or computation families appear, producers SHOULD
follow §5 through §10, and consumers:

* **MUST** treat a bare `verified` mapping as a one-element list (§5.2).
* **MUST NOT** reject a concept for missing any optional family (§5.3).
* **SHOULD** derive [trust tiers](./frontmatter.md) and staleness only from the fields
  specified in the spec.
* **SHOULD** surface, not silently drop, a failing
  [attestation](./attested_computations.md) (§10.5).

## Trust tiers (§5.3)

Consumers derive an advisory trust tier from `verified`, lowest to highest:

* No `verified` key ⇒ **unverified**.
* `verified` by non-`human:` actors only ⇒ **machine-confirmed**.
* `verified` by a `human:<id>` actor ⇒ **human-reviewed**.

A concept with no trust frontmatter is still consumable. Trust tiers are advisory
signals, **not access control**.

## What consumers MUST NOT reject over

To keep OKF tolerant and forward-compatible, consumers **MUST NOT** reject a bundle for any of:

* missing **optional** frontmatter fields;
* **unknown `type`** values;
* **unknown additional frontmatter keys** (and SHOULD preserve them when round-tripping);
* **broken [links](./cross_linking.md)**; or
* **missing [index files](./index_files.md)**.

## Checklist for this bundle

The [lint](../operations/lint.md) operation and the repo's conformance check verify:

* [x] every concept document has frontmatter with a non-empty `type`;
* [x] reserved `index.md`/`log.md` carry no frontmatter (except the root index's `okf_version`);
* [x] the root [index](../index.md) declares `okf_version: "0.1"` (this bundle is authored in v0.1 while documenting v0.2);
* [x] log date headings use `YYYY-MM-DD`.

Broken links are reported by lint as a health signal but, per §6 and §11, never affect
conformance.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
