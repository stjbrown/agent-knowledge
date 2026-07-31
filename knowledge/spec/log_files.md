---
type: Spec Section
title: "OKF §9 — Log Files"
description: Optional log.md files record date-grouped change history, newest first, with ISO 8601 date headings and conventional leading bold words.
tags: [okf, spec, log, reserved]
timestamp: 2026-07-31
---

# Log Files

OKF (§9) defines `log.md` as an **optional** record of a bundle's (or directory's) change
history. It is the second [reserved filename](./reserved_filenames.md) and, like index files,
carries **no frontmatter**.

> **Changed from v0.1.** This section was §7 in v0.1; it is **§9** in v0.2. The format
> is unchanged.

## Rules

* A `log.md` MAY appear at any level of the hierarchy.
* It is a flat list of **date-grouped** entries, **newest first**.
* Date headings **MUST** use the ISO 8601 `YYYY-MM-DD` form.
* Log entries are prose; leading bold words such as `**Creation**`, `**Update**`,
  `**Deprecation**` are **conventional, not required** — they make entries scannable and
  greppable.

## Format

```markdown
# Directory Update Log

## 2026-07-01
* **Creation** — Wrote the spec section.
* **Update** — Revised the frontmatter page after re-reading §4.1.

## 2026-06-30
* **Initialization** — Bootstrapped the bundle.
```

## Relation to the LLM Wiki log

In the [LLM Wiki](../concepts/llm_wiki.md) pattern the log is the append-only, chronological ledger
of every agent action — [ingests](../operations/ingest.md), [queries](../operations/query.md) filed
back, and [lint](../operations/lint.md) passes. Consistent entry prefixes make it parseable with
plain unix tools (e.g. `grep "^## " log.md | head`). This bundle's [log](../log.md) follows the OKF
form. The rule of thumb inherited from the pattern: **the log is append-only — never edit or
delete existing entries.**

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
[^karpathy]: [Karpathy — LLM Wiki gist](../references/karpathy_llm_wiki.md)
