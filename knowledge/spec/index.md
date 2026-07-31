# OKF Specification (v0.2)

These pages restate the **Open Knowledge Format v0.2** specification, one concept per spec
section, cross-linked. OKF is a minimal, vendor-neutral format for representing knowledge as a
directory of markdown files with YAML frontmatter — no schema registry, central authority, or
required tooling. v0.2 adds optional provenance, trust, and lifecycle frontmatter and an Attested
Computation concept type. The authoritative source is the
[OKF SPEC.md reference](../references/okf_spec.md).

Normative keywords (MUST, SHOULD, MAY) are used in the RFC 2119 sense.

> **On this bundle:** these pages *document* v0.2, but the bundle itself is still *authored* in
> v0.1 (the [root index](../index.md) declares `okf_version: "0.1"`). See
> [Changes from v0.1](./changes_from_v01.md).

## Front Matter of the Spec

* [Motivation](./motivation.md) - why standardize on established, diffable, portable formats.
* [Terminology](./terminology.md) - bundle, concept, frontmatter, body, link, source, actor, trust tier.

## Structure

* [Bundle Structure](./bundle_structure.md) - a bundle is a directory tree of markdown files.
* [Reserved Filenames](./reserved_filenames.md) - `index.md` and `log.md` are special.

## Concept Documents

* [Frontmatter](./frontmatter.md) - `type` is the only required key; recommended and optional families.
* [Body](./body.md) - conventional headings (`# Schema`, `# Examples`, `# Computation`), no required sections.

## Provenance, Trust & Identity

* [Provenance, Trust & Lifecycle](./provenance_trust_lifecycle.md) - `sources`, `generated`, `verified`, `status`, `stale_after` (§5).
* [Provenance (sources)](./citations.md) - the `sources` list and per-claim footnote attribution (§5.1).
* [Actor Convention](./actor_convention.md) - `<producer>/<version>`, `human:<id>`, `process:<id>` (§7).

## Linking & Reserved Files

* [Cross-linking & Paths](./cross_linking.md) - markdown links as directed edges; path-valued fields; `references/` (§6).
* [Index Files](./index_files.md) - directory listings enabling progressive disclosure (§8).
* [Log Files](./log_files.md) - date-grouped change history, newest first (§9).

## Computation

* [Attested Computations](./attested_computations.md) - a sanctioned, checkable way to compute a value (§10).

## Conformance & Evolution

* [Conformance](./conformance.md) - the minimal bar a bundle must clear (§11).
* [Versioning](./versioning.md) - `<major>.<minor>` and the `okf_version` declaration (§12).
* [Changes from v0.1](./changes_from_v01.md) - two breaking changes with fallbacks; everything else additive (§13).
