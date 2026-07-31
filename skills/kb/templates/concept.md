---
type: <TYPE>
title: <Human-readable title>
description: <One sentence summarizing this concept.>
# resource: <canonical URI>   # only for concepts bound to a real external asset; omit if abstract
tags: [<tag>, <tag>]
generated: { by: <producer>/<version>, at: <YYYY-MM-DDThh:mm:ssZ> }
# status: draft | stable | deprecated   # omit for the stable default
# stale_after: <YYYY-MM-DD>             # only when a real freshness boundary is known
# sources:
#   - id: <stable-source-id>             # required when a body footnote uses this source
#     resource: <url-or-bundle-path>     # required within every source entry
#     title: <Human-readable source label>
---

<Opening sentence: what this concept is, in prose. Link related concepts inline with relative
markdown links, e.g. [another concept](../section/other.md) — the relationship is carried by this
prose, not the link.>

# <Section heading>

<Body content. Favor structural markdown — headings, lists, tables, fenced code — over freeform
prose. Conventional headings when applicable: `# Schema`, `# Examples`, `# Computation`.>

<!-- For living repository documentation, use `# Repository evidence` with concept-relative links
instead of creating one Reference concept per source file. -->

<A source-backed claim may use a keyed footnote.>[^<stable-source-id>]

[^<stable-source-id>]: <Human-readable source label matching `sources[].id`>
