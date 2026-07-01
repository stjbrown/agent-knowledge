---
type: Reference
title: OKF README & Reference Agent
description: The OKF README and the reference agent that produces bundles (enrich) and renders them as a self-contained interactive graph (visualize).
resource: https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf
tags: [okf, reference-agent, source, external]
timestamp: 2026-07-01
---

# OKF README & Reference Agent

The `okf/` directory of [GoogleCloudPlatform/knowledge-catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)
contains the [spec](./okf_spec.md), a **reference agent**, sample recipes, and example
bundles (GA4, Stack Overflow, Bitcoin).

## The reference agent

Produces an OKF [bundle](../concepts/knowledge_bundle.md) in two passes:

* **BQ pass** — one concept per object from BigQuery metadata alone.
* **Web pass** — the LLM acts as a crawler: it fetches seed URLs via a `fetch_url` tool and
  follows outbound links that look like authoritative docs, then either enriches an existing
  concept, mints a `references/<slug>` concept, or skips. Safety rails: `--web-max-pages` cap and
  a same-domain `--web-allowed-host` filter; `--no-web` skips crawling.

### `enrich`

```
python -m reference_agent enrich \
    --source bq --dataset <project>.<dataset> \
    --web-seed-file <seeds.txt> --out ./bundles/<name>
```

`--concept <type>/<name>` (repeatable) iterates on a single concept.

### `visualize`

```
python -m reference_agent visualize --bundle ./bundles/<name>
```

Writes a **self-contained interactive `viz.html`** (Cytoscape.js graph + marked for markdown,
both from CDN, no backend, no data leaves the page): force-directed graph colored by
[`type`](../spec/frontmatter.md), edges from [cross-links](../spec/cross_linking.md), a detail panel
with frontmatter + rendered body, a "Cited by" backlinks list, plus search, type filter, and
switchable layouts.

## Relevance to this project

The reference agent shows the *producer* and *consumer* ends of OKF working end-to-end. It is
domain-coupled (BigQuery + web crawl). Our contribution is a **portable** producer/maintainer: the
generic [ingest](../operations/ingest.md) / [query](../operations/query.md) / [lint](../operations/lint.md)
skills, usable in any project, over the same format. The `visualize` command is directly reusable
on any conformant bundle — including this one.

# Citations

1. OKF README — <https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf>
