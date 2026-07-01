---
type: Reference
title: "OKF vs. RAG — infographic"
description: A two-panel infographic contrasting traditional RAG (search all PDFs every query) with OKF (read once, compile one markdown concept per file, answer by following links). Useful as marketing/explainer art.
tags: [okf, rag, infographic, marketing, visual, explainer]
timestamp: 2026-07-01
---

# OKF vs. RAG — infographic

A two-panel infographic that visualizes the [RAG vs. LLM Wiki](../concepts/rag_vs_llm_wiki.md)
contrast this bundle argues in prose. Captured from social media; provenance is unverified (see
[below](#provenance)). Kept here as an explainer/marketing asset for the published repository, and
because it is a crisp, self-contained statement of the core value proposition.

This is exactly the pattern SPEC §8 sanctions: external material (the images) is mirrored **inside**
the bundle under [`assets/`](../spec/citations.md#where-a-citation-may-point) and wrapped as a
first-class `Reference` concept, with the canonical asset kept alongside derived text (the
descriptive alt text and prose below) — see [citations](../spec/citations.md#canonical-source-vs-derived-text).

## Panel 1 — Without OKF (traditional RAG)

![Without OKF: a company has 100 PDFs; to answer "How is revenue calculated?" the AI searches all
100 PDFs, retrieves chunks from several (Revenue Calculation.pdf, Payment Service.pdf, Database
Schema.pdf, Finance Dashboard.pdf), combines and reasons over them, and generates an answer — then
must search all 100 PDFs again the next time the same question is asked.](../assets/images/okf-vs-rag-without-okf.png)

The setup: a company has 100 PDFs (Employee Handbook, Database Schema, Payment Service, Revenue
Calculation, …). A user asks *"How is revenue calculated?"* **Without OKF (traditional RAG)** the AI
(1) searches all 100 PDFs, (2) retrieves relevant chunks from many of them, (3) combines and reasons
over the chunks, (4) generates an answer — and, critically, **"next time the same question is asked,
it has to search all 100 PDFs again."** Nothing is retained; the work is redone every query. This is
the [amnesia problem](../concepts/rag_vs_llm_wiki.md).

## Panel 2 — With OKF

![With OKF: the AI reads all 100 PDFs once and understands the content, then creates one markdown
file per concept (Revenue.md, Payments.md, Orders.md, Users.md, Incident_Response.md, …). Each file
has YAML frontmatter (type, title) and body prose with "Depends on" / "Related" cross-links. To
answer "How is revenue calculated?" the AI opens Revenue.md and follows its links to Payments.md and
Orders.md.](../assets/images/okf-vs-rag-with-okf.png)

**With OKF** the AI (1) reads all 100 PDFs **once** and understands them, (2) creates **one markdown
file per concept** — `Revenue.md`, `Payments.md`, `Orders.md`, `Users.md`, `Incident_Response.md`.
Each concept has [frontmatter](../spec/frontmatter.md) (`type`, `title`) and a body with `Depends on`
/ `Related` [cross-links](../spec/cross_linking.md) — e.g. `Revenue.md` (`type: metric`) says
"Revenue is the sum of all successful payments," depends on Payments, related to Orders. (4) To
answer the question, the AI **opens `Revenue.md` and follows links** to `Payments.md` → `Orders.md`
only as needed — [progressive disclosure](../concepts/progressive_disclosure.md) over a
[compounding artifact](../concepts/compounding_artifact.md) instead of re-searching raw sources.

## Why it's a good explainer

* It reduces the whole pitch to one image pair: **compile once and follow links** vs. **re-search
  every time** — the same point as [RAG vs. LLM Wiki](../concepts/rag_vs_llm_wiki.md).
* It uses concrete, business-legible concepts (revenue, payments, orders) rather than abstract nouns.
* It shows real OKF mechanics — one file per concept, `type`/`title` frontmatter, `Related`/`Depends
  on` links — matching what the [sample bundles](../design/sample_bundle_lessons.md) actually look like.

Candidate use: repository `README`, a landing page, or slides. Note the "one file per concept"
framing leans toward atomic concepts — a maintenance/style choice, not an OKF rule (see
[sample bundles](../design/sample_bundle_lessons.md)).

## Provenance

Both panels were captured as screenshots (2026-07-01). The second image includes a partially-visible
social-media sidebar (handles such as `@TheAI…`), indicating the pair circulated on social media, but
the **original author/source is unverified**. Per the bundle's trust convention
([never invent a source](../ecosystem/critiques.md#1-truth-maintenance-and-knowledge-base-poisoning)),
this is recorded as *unknown / third-party social infographic* rather than attributed to a fabricated
URL. **Confirm rights/attribution before using publicly.** If the original post is located, add it
to the citations below.

# Citations

1. Two-panel "OKF vs. RAG" infographic — source unverified (social media, captured 2026-07-01).
