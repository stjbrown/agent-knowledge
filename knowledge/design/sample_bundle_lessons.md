---
type: Concept
title: Lessons from the OKF Sample Bundles
description: Our analysis of the three reference OKF bundles (ga4, stackoverflow, crypto_bitcoin) — what their structure, frontmatter, and linking conventions teach us about authoring conformant bundles.
tags: [okf, examples, analysis, design-input]
timestamp: 2026-07-01
---

# OKF Sample Bundles

The OKF repo ships three reference bundles produced by the
[reference agent](../references/okf_readme.md): **ga4** (17 files), **stackoverflow** (53 files), and
**crypto_bitcoin** (8 files). All three describe BigQuery public datasets. Reading them is the best
way to see the [spec](../spec/index.md) as *practiced* rather than *stated* — and several of their
conventions differ from choices we made in this bundle, which is useful design input.

## Shared structure

All three use the same shallow, domain-driven layout:

```
<bundle>/
  index.md              # root: a "# Subdirectories" list, NO frontmatter, NO okf_version
  datasets/             # the dataset concept + index.md
  tables/               # one concept per table + index.md
  references/           # (ga4, stackoverflow) enums, metrics, joins, licenses + index.md
  viz.html              # generated visualizer output, checked in
```

Only two `type` values do the heavy lifting: **`BigQuery Table`** (resource-bound) and
**`Reference`** (abstract). Consistent with the spec's advice to pick few, descriptive types.

## What they confirm

* **Reserved files carry no frontmatter.** Every `index.md` is just a markdown list; none declare
  `okf_version` — confirming that declaration is genuinely optional (we chose to include it).
* **Resource-bound concepts** (`tables/*.md`, `datasets/*.md`) set a real `resource` URI (the
  BigQuery REST endpoint) and lead with a `# Schema` section — the §4.3 pattern.
* **Abstract concepts** (`references/*.md` — enums like `post_type_ids`, metrics, joins) omit
  `resource` and just carry prose + a SQL snippet — the §4.4 pattern.
* **`# Citations`** appears at the bottom as a bulleted list of URLs (sometimes plain, sometimes
  markdown links) — looser than a numbered list, still conformant.
* **`timestamp`** is a full ISO-8601 datetime (`'2026-05-28T22:53:05+00:00'`), quoted — worth
  matching for machine-friendliness (we used date-only).

## What surprised me (and what it teaches)

1. **Root `index.md` is minimal — a `# Subdirectories` list, not a full catalog.** Progressive
   disclosure is done by *drilling into each directory's* `index.md`, not by one big root index.
   Our root index is much richer. Both conform; theirs scales better to large bundles, ours is
   friendlier to a human reader landing at the top. A portable skill should probably generate the
   minimal per-directory style by default.
2. **No bundle has a `log.md`.** The reference agent produces bundles as a *snapshot* from a source
   of truth (BigQuery), so there's no change history to keep. This confirms `log.md` matters for the
   *incrementally-maintained* [LLM Wiki](../concepts/llm_wiki.md) use case (our case,
   [personal work wiki](../implementations/personal_work_wiki.md), [the OKF-native agent](../implementations/okf_native_agent.md)) but is
   genuinely optional for generated catalogs.
3. **They use relative links (`../references/metrics/event_count.md`), not the recommended
   bundle-absolute (`/…`) form.** The [spec](../spec/cross_linking.md) *recommends* absolute; the
   reference bundles use relative. A reminder that "recommended" ≠ "required," and that relative
   links are what actually renders on GitHub and in the visualizer. (We chose absolute for stability;
   worth revisiting when we decide what the skills emit.)
4. **The `events_` table concept is enormous** — one file with the full nested BigQuery schema
   (hundreds of fields). OKF does not force atomicity; a concept can be as large as its resource. This
   contrasts with [the OKF-native agent's](../implementations/okf_native_agent.md) "prefer atomic concepts"
   guidance — atomicity is a *maintenance* choice for living wikis, not an OKF rule.

## Implications for our skills

* Default to **per-directory `index.md`** catalogs (progressive disclosure) rather than one giant
  root index.
* Make **`log.md` conditional** on the use case: incremental wiki → yes; generated snapshot → no.
* Decide a **link-form policy** (absolute vs. relative) and apply it consistently; the ecosystem is
  split, so pick one and document why.
* Use **full ISO-8601 datetimes** for `timestamp`.
* Don't over-enforce **atomicity** at the format layer — make it a schema-layer/style preference.

# Citations

1. OKF sample bundles — <https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf/bundles>
2. [OKF README & Reference Agent](../references/okf_readme.md)
