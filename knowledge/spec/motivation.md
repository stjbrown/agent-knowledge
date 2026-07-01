---
type: Spec Section
title: "OKF §1 — Motivation"
description: Why OKF standardizes on markdown + YAML frontmatter, and what it explicitly declines to do.
tags: [okf, spec]
timestamp: 2026-07-01
---

# Motivation

OKF (§1) argues that knowledge should be stored in established formats that are already
**readable, parseable, diffable, and portable** — markdown for prose, YAML for metadata, a
directory for structure, git for history. Rather than invent a new container, OKF standardizes
only the minimum needed to make a corpus **self-describing**: a required
[`type`](./frontmatter.md) on every [concept](../concepts/concept_document.md) and a couple of
[reserved filenames](./reserved_filenames.md).

## Goals

1. Define a **universal format** that knowledge-enrichment agents can produce.
2. **Inform consumption agents** how to read a corpus without bespoke integration.
3. **Facilitate exchange** of knowledge between tools, teams, and models.
4. **Standardize the few required fields** that make a bundle self-describing.

## Non-goals

OKF deliberately does *not*:

* Define a fixed **taxonomy** of concept types — see [Frontmatter](./frontmatter.md); `type`
  values are producer-chosen and open.
* Prescribe **infrastructure** — no required database, server, embedding store, or SDK.
* **Replace domain schemas** — OKF references them (via `resource` and prose) rather than
  subsuming them.

This minimalism is what lets OKF describe knowledge bases as different as a BigQuery catalog and
this LLM-Wiki-about-LLM-Wikis. It is also why OKF is a good fit for the
[LLM Wiki](../concepts/llm_wiki.md) pattern, which is likewise deliberately unopinionated about
domain structure.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
