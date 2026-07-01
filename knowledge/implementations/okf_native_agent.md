---
type: Implementation
title: OKF-Native Agent
description: A deployable, OKF-native agent (built on Mastra) that reads and maintains a customer's knowledge as OKF bundles, with product-level read/write skills that encode a trust model.
tags: [implementation, okf-native, mastra, deployable, prior-art]
timestamp: 2026-07-01
---

# OKF-Native Agent

A private, deployable agent (built on [Mastra](https://mastra.ai)) that reads and maintains a
customer's knowledge as [OKF bundles](../concepts/knowledge_bundle.md). Unlike the
[personal work wiki](./personal_work_wiki.md), it is **OKF-native from the ground up** and is the
closest existing model for the format-first, portable direction this project is taking.

## Deployment model

* **One customer = one storage bucket = one deployment.** The bucket root is the agent's workspace.
* The workspace contains a `knowledge/` directory holding one or more OKF bundles ("kb"s) — each a
  self-contained, independently portable bundle with its own [`index.md`](../spec/index_files.md)
  and [`log.md`](../spec/log_files.md). A top-level `knowledge/index.md` catalogs the kbs. Multiple
  kbs coexist so one prompt can span them.
* `AGENTS.md` holds customer-specific system-prompt additions; `skills/` holds customer skills that
  merge on top of the product-level ones.
* Storage is an R2/S3 bucket via Mastra's `S3Filesystem`; memory is a local LibSQL database.

This is the same `knowledge/`-directory-of-bundles shape this repository uses — worth mirroring.

## The management skill and its trust model

It ships a product-level OKF skill that carries the spec plus a **management philosophy** aimed at
knowledge the owner can *trust* and that *compounds*. Its rules go meaningfully beyond bare OKF and
are the strongest input to our [operations](../operations/index.md) design:

* **Append-only on meaning.** OK to fix typos/links/metadata; never change what a document *asserts*.
  If a claim changes, write a new concept and **supersede** the old (`supersedes:` / `superseded_by:` /
  `status: superseded`), remove it from the index but keep it on disk. Removal from an index is a
  *tombstone, not a delete*.
* **Never lose provenance.** Every concept cites a source or is explicitly marked user-originated
  (`type: Note`, no `resource`). Sources are stored **once** as `type: Reference` and cited many
  times (N:1) — one source can spawn many concepts.
* **Conflict vs. supersede.** Mere disagreement → link with `conflicts_with` and keep **both active**;
  supersede only on a high-confidence, provenance-based change signal. Confidence comes from the
  *source's* authority, never the agent's own sense of truth.
* **Events are additive.** Releases, news, dated reports accumulate as a timeline and never supersede
  each other; a separate "latest" pointer concept is updated instead.
* **Entity-first synthesis.** Prefer durable entity/topic concepts that incoming sources feed, over
  dated snapshots; a stored synthesis is itself append-only (refreshed by superseding).
* **Make every change visible.** Append a dated `log.md` entry for every create/supersede/relink.

## Relevance to this project

It answers questions the [personal work wiki](./personal_work_wiki.md) doesn't: how to stay
OKF-conformant while adding the relationship vocabulary a living wiki needs (`status`, `supersedes`,
`conflicts_with`) as tolerated [extension keys](../spec/frontmatter.md#extensions); how to handle
contradiction and currency at [query](../operations/query.md) time; and how a portable skill can
carry the spec itself. Its append-only, supersede-don't-rewrite trust model is the basis for the
default in our portable [ingest](../operations/ingest.md) and [lint](../operations/lint.md) skills.

# Citations

1. A private, OKF-native deployable agent (Mastra-based); details from its `okf` management skill.
