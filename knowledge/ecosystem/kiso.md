---
type: Reference
title: kiso (oak-invest)
description: A Java publishing engine that turns OKF bundles into static websites for humans and AI agents, emitting llms.txt and sitemap.xml. An OKF consumer, not a producer.
resource: https://github.com/oak-invest/kiso
tags: [ecosystem, featured, okf-native, publishing, consumer]
timestamp: 2026-07-01
---

# kiso (oak-invest)

`oak-invest/kiso` (~11★) is *"a publishing engine that turns
[Open Knowledge Format](../spec/index.md) bundles into static websites for humans and AI agents."*
Written in Java, distributed as a native-image CLI and a GitHub Action.

## What it is (and isn't)

kiso sits on the **consumer** side of OKF, whereas okf-skills, the OKF-native agent, and this project sit
on the **producer/maintainer** side. It reads a conformant [bundle](../concepts/knowledge_bundle.md)
and generates a static site:

```bash
kiso-cli build --source=examples/kb-google-example --destination=public
```

Notably it emits **`llms.txt` and `sitemap.xml`** alongside the HTML — i.e. it publishes the same
bundle for *both* human browsers and AI agents. Its example bundle (`kb-google-example`) is a
near-copy of the official [GA4 sample](../design/sample_bundle_lessons.md), confirming those bundles
are becoming the ecosystem's de-facto interop test.

## Why it matters to us

* **It validates the "produce once, consume many" thesis** at the heart of
  [OKF](../spec/motivation.md): kiso is proof that a bundle we produce with our skills can be consumed
  by a completely independent tool (a different language, a different vendor) with no coordination —
  the whole point of adopting a [spec](../spec/index.md) over a bespoke convention.
* **`llms.txt` + `sitemap.xml` output** is a concrete idea for making a published bundle
  agent-consumable on the open web — a possible downstream target for bundles our skills maintain.
* Because it consumes the [GA4 sample bundle](../design/sample_bundle_lessons.md) directly, kiso is a
  ready-made **conformance smoke test**: if kiso can build our bundle into a site, we're
  interoperable.

## Relevance to us

kiso is not a competitor — it is the consumer half of the ecosystem our producer skills feed. It
strengthens the case for strict [conformance](../spec/conformance.md): the more independent consumers
like kiso exist, the more valuable it is that our output is genuinely spec-conformant rather than
"markdown that mostly works." Worth keeping as a downstream target and interop check.

# Citations

1. kiso — <https://github.com/oak-invest/kiso>
