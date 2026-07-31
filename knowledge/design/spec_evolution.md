---
type: Concept
title: OKF Spec Evolution (open PRs & proposals)
description: How OKF evolved from the v0.1 proposals into v0.2, which decisions shipped, and how the portable skills adopted them.
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
[differentiator](../ecosystem/competitor_comparison_v2.md) and the ecosystem's top
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

## 7. What v0.2 shipped (2026-07-31)

OKF **v0.2** was published, and it lands directly on the threads above. Several v0.1
"in flux" items are now resolved in the normative spec (documented across our
[spec/](../spec/index.md) pages; full delta in [Changes from v0.1](../spec/changes_from_v01.md)):

* **Link form (§1) — settled the *other* way in the text, but our decision holds.** v0.2's
  [§6](../spec/cross_linking.md) **recommends absolute (bundle-relative) links** for
  move-stability. That is the opposite of PR #165's direction, but it *requires an
  OKF-aware resolver* — which a nested `knowledge/` bundle rendered on GitHub does not
  have. So our relative-links decision stands for this bundle; we simply now differ from
  the recommended form deliberately and say so on the page.
* **Trust / provenance / reliability axis (§3) — landed as a first-class family.** v0.2
  §5 adds [`sources`](../spec/citations.md) (provenance with per-source credibility
  signals), [`generated`/`verified`](../spec/provenance_trust_lifecycle.md) (trust) with
  derived **trust tiers**, and `status`/`stale_after` (lifecycle), plus an
  [actor convention](../spec/actor_convention.md) (§7). This is close to, but *not*
  identical to, the emerging names we planned to borrow (`reliability`, `confidence`) —
  v0.2 records **objective per-source signals** and infers credibility rather than
  storing a score. We should align our trust-model extension keys to v0.2's actual names.
* **Provenance vs. body citations (§6/§3) — breaking change.** The v0.1 body
  `# Citations` list is **superseded by `sources`** frontmatter, and `timestamp` is
  **superseded by `generated.at`** — both with consumer fallbacks (§13.1).
* **Attested Computations (new, §10).** A wholly new concept type: a sanctioned,
  deterministically checkable computation. No v0.1 antecedent; see
  [Attested Computations](../spec/attested_computations.md).
* **Keeping source in the bundle (§6) — retained.** The `references/` convention (§6.3)
  survives from v0.1 §8 discussion #91.

Two v0.1-flux items from above are **not yet resolved in v0.2 text**: the README/LICENSE
ignored-file tolerance (#58, §4 here) is not called out in v0.2 conformance, and the
`reliability`/`confidence` epistemic ladder (#159) did not ship — v0.2 chose objective
signals over a stored confidence score.

## Resolved decisions for this bundle

* **Link form → relative (done 2026-07-01; still holds under v0.2).** Converted all 473 links across
  51 files from absolute (`/…`) to relative, per §1 above. v0.2 §6 now *recommends* absolute, but
  that needs an OKF-aware resolver a nested GitHub-rendered bundle lacks, so relative remains correct
  here — see §7.
* **Spec pages migrated to v0.2 (done 2026-07-31).** Rewrote the `spec/` pages to document OKF v0.2,
  added `provenance_trust_lifecycle.md`, `actor_convention.md`, `attested_computations.md`, and
  `changes_from_v01.md`, and updated both indexes. The bundle stays *authored* in v0.1
  (`okf_version: "0.1"`) — re-authoring its own frontmatter to v0.2 is a separate future exercise.
* **Portable skills → v0.2 producer/consumer (done 2026-07-31).** The hub now vendors the
  authoritative v0.2 spec; new scaffolds emit `okf_version: "0.2"`; writing skills use structured
  `sources`, keyed footnotes, honest `generated` actors, lifecycle/freshness fields, and Attested
  Computation rules. Query, lint, and visualization consume the new trust families while preserving
  the §13 fallbacks for declared v0.1 bundles. `supersedes`/`superseded_by` remain explicit project
  extensions rather than OKF claims. Migrating this repository's own v0.1-authored bundle remains a
  separate dogfooding exercise.
* **Reserved/ignored files → keep the checker strict.** v0.2 did not adopt #58's proposed
  README/LICENSE/CONTRIBUTING exception: `index.md` and `log.md` remain the only reserved markdown
  filenames. The checker therefore continues to treat any other `.md` file inside a bundle as a
  concept requiring frontmatter and `type`.

# Citations

1. OKF pull requests — <https://github.com/GoogleCloudPlatform/knowledge-catalog/pulls>
2. PR #165 (relative links), #145/#64/#161 (required frontmatter), #58 (trust/safety), #159 (reliability), #50 (sources), #149 (reserved files), #144 (cricket domain bundle)
