---
type: Reference
title: commonplace (zby)
description: A theory-forward, review-gated framework for agent-operated knowledge — typed, linked, review-gated markdown that agents execute — and a maintained list of related systems (~70 stars).
resource: https://github.com/zby/commonplace
tags: [ecosystem, featured, review-gated, theory]
timestamp: 2026-07-01
---

# commonplace (zby)

`zby/commonplace` (~70★) describes itself as *"the theory of LLM wikis, running as one"* — a
framework for agent-operated knowledge that is **typed, linked, and review-gated** markdown the
agents execute. Homepage: <https://zby.github.io/commonplace/>.

## Why it's worth studying

* **Review-gated** is the direct embodiment of the top [critique's](./critiques.md#1-truth-maintenance-and-knowledge-base-poisoning)
  proposed fix — the agent proposes, a gate approves — rather than "the LLM owns the layer entirely."
* **Typed + linked** aligns closely with OKF's [`type`](../spec/frontmatter.md) +
  [cross-link](../spec/cross_linking.md) model; a good reference for how far to push typing.
* It maintains an **agent-curated index of related systems**
  (<https://zby.github.io/commonplace/notes/related-systems/related-systems-index/>) — itself a live
  example of a wiki used to survey its own [ecosystem](./landscape.md), and a useful
  external map to cross-check ours against.

## Relevance to us

commonplace is the most *theory-forward* project in the thread and the clearest articulation of the
review-gated stance. When we decide the default autonomy level of our [ingest](../operations/ingest.md)
skill (fully autonomous vs. propose-and-approve), this is the reference argument for the cautious
end — complementary to [the OKF-native agent's](../implementations/okf_native_agent.md) provenance-based trust
model.

# Citations

1. commonplace — <https://github.com/zby/commonplace>
2. commonplace related-systems index — <https://zby.github.io/commonplace/notes/related-systems/related-systems-index/>
