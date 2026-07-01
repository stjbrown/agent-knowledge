---
type: Reference
title: okf-harness (pumblus)
description: An agent-first local harness for OKF-compatible LLM Wikis — one of the few community projects targeting the OKF format explicitly (~17 stars).
resource: https://github.com/pumblus/okf-harness
tags: [ecosystem, featured, okf-native, harness]
timestamp: 2026-07-01
---

# okf-harness (pumblus)

`pumblus/okf-harness` (~17★) is an *"agent-first local harness for OKF-compatible LLM Wikis."* Stars
aside, it is significant because it is one of the **very few** community projects in the
[ecosystem](./landscape.md) that targets [OKF](../spec/index.md) by name rather than a
bespoke convention.

## Why it's worth studying

* It shares our core bet: **OKF-conformant bundles as the substrate**, agent as the operator.
* "Local harness" framing is adjacent to our "portable skills" framing — worth comparing how it
  structures [ingest](../operations/ingest.md)/[query](../operations/query.md) around a conformant
  bundle, and whether it stays strictly conformant or extends the format.
* Together with `equationalapplications/expo-llm-wiki` (which cites the OKF SPEC) and our sibling
  [the OKF-native agent](../implementations/okf_native_agent.md), it marks the small but real OKF-native cohort.

## Relevance to us

This is the most direct "someone else is doing OKF" data point. Before we finalize skill design,
it's worth reading okf-harness to avoid reinventing conventions and to see where a second
implementer felt the [spec](../spec/index.md) needed extending (a strong signal for where OKF v0.1 is
thin — e.g. relationship/state vocabulary, which [the OKF-native agent](../implementations/okf_native_agent.md)
also had to add).

# Citations

1. okf-harness — <https://github.com/pumblus/okf-harness>
