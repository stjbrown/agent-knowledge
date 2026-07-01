---
type: Concept
title: OKF Spec Evolution (open PRs & proposals)
description: Our reading of the open pull requests and proposals on GoogleCloudPlatform/knowledge-catalog — where OKF v0.1 is still in flux (link form, required frontmatter, an emerging trust/provenance axis) and what it means for our build.
tags: [okf, spec, evolution, design-input, analysis]
timestamp: 2026-07-01
---

# OKF Spec Evolution

Reading the [open PRs](https://github.com/GoogleCloudPlatform/knowledge-catalog/pulls) on the OKF
repo is the best signal for **what in v0.1 is still moving** — and several threads land directly on
decisions this project must make. Captured as of 2026-07-01; treat as a snapshot, re-check before
finalizing skills.

## 1. Link form is being *reversed* (recommend relative, not absolute)

The single most decision-relevant thread. The [spec](../spec/cross_linking.md) currently *recommends*
absolute bundle-relative (`/…`) links, but the reference agent's prompt **forbids** them ("never
start a link with `/` — that breaks GitHub rendering") and every shipped
[sample bundle](./sample_bundle_lessons.md) uses **relative** links. PRs **#165**, **#58**,
**#66**, **#110**, **#161** all converge on fixing the spec to match practice:

* **#165** swaps §5.1/§5.2 so **relative links become "recommended"** (they resolve in any renderer —
  `cat`, browser, GitHub, editor — with no OKF tooling), and reframes absolute as "requires an
  OKF-aware resolver."
* The failure mode: a leading `/` resolves to the **repository/host root**, not the bundle root,
  whenever a bundle ships as a subdirectory (§3 explicitly allows this) — exactly our layout
  (`knowledge/` inside a larger repo).

**Implication for us — done.** We originally chose *absolute* links throughout this bundle. On
2026-07-01 we **converted the whole bundle to relative links** (473 links across 51 files) so it
renders correctly on GitHub and for any non-OKF-aware reader, aligning with the reference agent, the
sample bundles, and #165's direction. Note the *spec-text* PR is unlikely to merge soon — as of this
writing #165/#66/#110 are all open with **no maintainer review, only CLA-bot activity** — but the
decision doesn't depend on it: relative is already the de-facto-correct form for a nested bundle.
See the [cross-linking spec page](../spec/cross_linking.md).

## 2. Only `type` is required — confirmed and being enforced

PRs **#145**, **#64**, **#161** fix the reference implementation, which wrongly treated `title` /
`description` / `timestamp` as REQUIRED and would reject spec-minimal bundles. The spec is
authoritative: **only [`type`](../spec/frontmatter.md) is required**; the four-key check is a
producer *quality bar*, not conformance. This **validates our
[conformance](../spec/conformance.md) checker** (type-only) exactly.

## 3. A trust / provenance / reliability axis is emerging

Multiple independent efforts are converging on the very problem we identified as our
[differentiator](../ecosystem/competitor_comparison.md) and the ecosystem's top
[critique](../ecosystem/critiques.md). This is the thread to watch most closely:

* **#58 (§12 Trust & safety)** — consumers MUST treat bundle contents as untrusted **data, never
  instructions** (prompt-injection); OKF gives no built-in authenticity guarantee. Also reconciles
  the §6↔§11 frontmatter contradiction and adds README/LICENSE/CONTRIBUTING as ignored files.
* **#159 (`reliability`)** — an optional frontmatter convention for *epistemic* reliability: a
  maturity ladder (`confidence` + `basis` → corroboration tiers), with honesty rules like
  "signed ≠ verified" and "`verified` requires ≥2 sources."
* **#50 (`sources`)** — optional machine-readable provenance alongside the human `# Citations`
  section (which source systems produced this, can it be refreshed/audited, content digest).
* Related issues #92/#94 (groundedness), #140 (integrity/signing), #99 (policy receipts).

**Implication for us.** Our planned [trust model](../ecosystem/critiques.md) (append-only, supersede,
`conflicts_with`) is squarely aligned with where OKF itself is heading — good. But the format may
**standardize the field names** (`reliability`, `sources`, `confidence`). We should adopt *their*
emerging names as [extension keys](../spec/frontmatter.md#extensions) rather than invent our own, and
treat ingested source content as untrusted data (a real prompt-injection surface for
[ingest](../operations/ingest.md)).

## 4. Reserved-file handling is tightening

**#149** fixes the reference impl to exclude `log.md` (not just `index.md`) from concept
enumeration — it had been showing up as an `Unknown` node. **#58** proposes treating
`README.md`/`LICENSE.md`/`CONTRIBUTING.md` as ignored non-concepts so a plain README doesn't make a
bundle non-conformant. Our [checker](../spec/conformance.md) already handles `index.md`/`log.md`; we
should add the README/LICENSE tolerance when we harden it.

## 5. Domain (hand-authored) bundles are being legitimized

**#144** adds a hand-authored **cricket** bundle (vs. the DB-generated samples), with per-bundle
`spec/types.md`, `spec/provenance.md`, and `spec/sample-size.md` files, a novel `story` type, and
additive keys (`source_boundary`, `entity_id`, `same_as`). This directly validates two of our
bets: (a) **domain-knowledge bundles** are first-class OKF (our case, not just data catalogs), and
(b) **putting the taxonomy/conventions in per-bundle `spec/` files** is a real pattern — essentially
the [schema layer](../concepts/three_layer_architecture.md#3-the-schema) we want to formalize, and
which this very bundle already uses (`/spec`).

## 6. Keeping source material *in* the bundle (§8 + discussion #91)

An easy-to-miss clause of SPEC **§8**: citation links MAY point into a **`references/` subdirectory
that mirrors external material as first-class OKF concepts** — i.e. the spec explicitly blesses
storing PDFs, images, transcripts, and `.mov` files *inside* the bundle, wrapped as
`type: Reference` concepts, rather than only linking out to URLs.

Discussion **#91** (opened by this project's author) resolves the "where do I keep source docs"
question, with the community answer: **separate the canonical source from the derived text** — keep
a stable pointer to the original asset in the bundle *and* carry extracted text/summary for
retrieval; keep genuinely incidental material external. See our [citations](../spec/citations.md)
page, which now documents this, and the [infographic](../references/okf_vs_rag_infographic.md) reference that
applies it.

## Resolved decisions for this bundle

* **Link form → relative (done 2026-07-01).** Converted all 473 links across 51 files from absolute
  (`/…`) to relative, per §1 above.
* **Trust-model field names → adopt upstream (pending build).** When we build the skills, use the
  emerging OKF names (`reliability`, `sources`, `confidence`, `status`/`supersedes`/`superseded_by`/
  `conflicts_with`) as [extension keys](../spec/frontmatter.md#extensions) rather than inventing our
  own, and treat ingested source content as untrusted data.
* **Reserved/ignored files → widen the checker (pending build).** Add README/LICENSE/CONTRIBUTING
  tolerance (per #58) alongside the existing `index.md`/`log.md` handling.

# Citations

1. OKF pull requests — <https://github.com/GoogleCloudPlatform/knowledge-catalog/pulls>
2. PR #165 (relative links), #145/#64/#161 (required frontmatter), #58 (trust/safety), #159 (reliability), #50 (sources), #149 (reserved files), #144 (cricket domain bundle)
