---
type: Spec Section
title: "OKF §1 — Motivation"
description: Why OKF standardizes on markdown + YAML frontmatter, and what it explicitly declines to do.
tags: [okf, spec]
timestamp: 2026-07-31
---

# Motivation

OKF (§1) argues that knowledge should be stored in established formats that are already
**readable, parseable, diffable, and portable** — markdown for prose, YAML for metadata, a
directory for structure, git for history. Rather than invent a new container, OKF standardizes
only the minimum needed to make a corpus **self-describing**: a required
[`type`](./frontmatter.md) on every [concept](../concepts/concept_document.md) and a couple of
[reserved filenames](./reserved_filenames.md).

## Continuously agent-maintained knowledge (v0.2)

v0.2 sharpens the motivation around a shift: a knowledge corpus is increasingly **not authored once
and then read — it is continuously written and maintained by agents.** When most concepts are
machine-generated, a consumer needs answers plain markdown-plus-frontmatter does not make
first-class:

1. What was this created from, and how was it verified? (**provenance**)
2. How much should I trust it? (**trust**)
3. Is it still true? (**freshness**)
4. Is it the current version? (**lifecycle**)
5. Was this number produced the way we said it must be? (**attestation**)

v0.2 makes provenance, trust, lifecycle, and attestation **first-class** while keeping the format
minimally opinionated — see [Provenance, Trust & Lifecycle](./provenance_trust_lifecycle.md) and
[Attested Computations](./attested_computations.md). It standardizes only the small set of structural
conventions needed to make a corpus self-describing; anything beyond that is left to the producer.

> **Changed from v0.1:** v0.1's motivation stopped at "established, diffable, portable formats." The
> four qualities above (readable/parseable/diffable/portable) carry forward unchanged; the
> five-question provenance/trust/freshness/lifecycle/attestation framing and the new frontmatter
> families are the v0.2 addition.

## Goals

1. Define a **universal format** that producers (people, agents, export pipelines) can write into.
2. **Inform consumers** (agents, UIs, search indexes, deterministic code) how to read and traverse
   a corpus without bespoke integration.
3. **Facilitate exchange** of knowledge between tools, teams, and models.
4. **Standardize the small set of frontmatter fields** that make an agent-maintained corpus
   **trustable**, without prescribing any runtime.

## Non-goals

OKF deliberately does *not*:

* Define a fixed **taxonomy** of concept types — see [Frontmatter](./frontmatter.md); `type`
  values are producer-chosen and open.
* Prescribe **storage, serving, or query infrastructure** — no required database, server, embedding
  store, or SDK.
* **Replace domain schemas** (Avro, Protobuf, OpenAPI) — OKF references them (via `resource` and
  prose) rather than subsuming them.
* Specify a **packaging or invocation standard** for the code an executor or attester points at
  (§10). OKF fixes the interface, not the packaging.

This minimalism is what lets OKF describe knowledge bases as different as a BigQuery catalog and
this LLM-Wiki-about-LLM-Wikis. It is also why OKF is a good fit for the
[LLM Wiki](../concepts/llm_wiki.md) pattern, which is likewise deliberately unopinionated about
domain structure.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
