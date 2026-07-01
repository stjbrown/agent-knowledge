# OKF Specification (v0.1)

These pages restate the **Open Knowledge Format v0.1** specification, one concept per spec
section, cross-linked. OKF is a minimal, vendor-neutral format for representing knowledge as a
directory of markdown files with YAML frontmatter — no schema registry, central authority, or
required tooling. The authoritative source is the [OKF SPEC.md reference](../references/okf_spec.md).

Normative keywords (MUST, SHOULD, MAY) are used in the RFC 2119 sense.

## Front Matter of the Spec

* [Motivation](./motivation.md) - why standardize on established, diffable, portable formats.
* [Terminology](./terminology.md) - bundle, concept, concept ID, frontmatter, body, link, citation.

## Structure

* [Bundle Structure](./bundle_structure.md) - a bundle is a directory tree of markdown files.
* [Reserved Filenames](./reserved_filenames.md) - `index.md` and `log.md` are special.

## Concept Documents

* [Frontmatter](./frontmatter.md) - `type` is the only required key; five recommended keys.
* [Body](./body.md) - conventional headings, no required sections.

## Linking & Reserved Files

* [Cross-linking](./cross_linking.md) - absolute and relative markdown links as directed edges.
* [Index Files](./index_files.md) - directory listings enabling progressive disclosure.
* [Log Files](./log_files.md) - date-grouped change history, newest first.
* [Citations](./citations.md) - external sources under a numbered heading.

## Conformance & Evolution

* [Conformance](./conformance.md) - the minimal bar a bundle must clear.
* [Versioning](./versioning.md) - `<major>.<minor>` and the `okf_version` declaration.
