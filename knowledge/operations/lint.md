---
type: Operation
title: Lint
description: Periodically health-check the bundle for contradictions, stale claims, orphans, missing cross-references, coverage gaps, broken links, and schema violations.
tags: [operation, workflow, maintenance]
timestamp: 2026-07-01
---

# Lint

**Lint** is the periodic health-check that keeps a [compounding artifact](../concepts/compounding_artifact.md)
from drifting. Karpathy is emphatic that the lint pass is *not* optional — drift (stale claims,
orphans, silent contradictions) is the main way an LLM Wiki degrades over time.

## Checks

Drawn from the pattern and the [the personal work wiki's lint skill](../implementations/personal_work_wiki.md):

* **Schema compliance** — every [concept](../concepts/concept_document.md) has parseable
  [frontmatter](../spec/frontmatter.md) with a non-empty `type`. (This is the
  [conformance](../spec/conformance.md) bar.)
* **Contradictions** — concepts that assert conflicting facts.
* **Stale claims** — statements a newer source has superseded; stale overviews behind their
  children.
* **Orphan concepts** — pages with zero inbound [links](../spec/cross_linking.md).
* **Missing cross-references** — concepts that discuss the same entity/theme but don't link.
* **Coverage gaps** — entities mentioned repeatedly across concepts but lacking their own page;
  data gaps worth a web search.
* **Broken links** — link targets that don't exist. Per §5.3/§9 these are a *health signal only*
  and never invalidate the bundle — a broken link may just mark unwritten knowledge.

## Output

Report findings grouped by check, with severity (error / warning / info). Optionally
auto-fix what is safe (stale overviews, missing cross-links) and flag the rest. Append a summary
to the [log](../spec/log_files.md). A good lint pass also *suggests* new questions to investigate
and new sources to seek — turning maintenance into a source of new [ingest](./ingest.md)
and [query](./query.md) work.

# Citations

1. [Karpathy — LLM Wiki gist](../references/karpathy_llm_wiki.md)
2. [personal work wiki](../implementations/personal_work_wiki.md)
