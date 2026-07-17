---
name: kb-lint
description: Health-check a knowledge bundle for conformance and drift; optionally auto-fix safe issues.
disable-model-invocation: true
version: 0.1.0
tags: [knowledge, okf, lint, conformance]
---

# kb-lint — health-check the bundle

Keep a [bundle](../kb/SKILL.md) trustworthy as it **compounds** by catching **drift** — the decay a
growing knowledge base accumulates. Two passes: a **deterministic conformance** check (mechanical,
scripted) and a **drift audit** (fuzzy, judgment). Run both; report findings by severity. With
`fix`, repair what is safe.

## 1. Conformance (deterministic)

Run the bundled checker against the target bundle (default `knowledge/`). It is a zero-dependency
Node script (`node >=18`); `<skill-dir>` is this skill's directory — `${CLAUDE_SKILL_DIR}` under
Claude Code, or whatever path your host exposes for the skill:

```
node "<skill-dir>/scripts/conformance.mjs" <bundle-dir>
```

It reports **ERROR** (a hard [SPEC](../kb/references/SPEC.md) §9 failure — no parseable frontmatter,
or a missing/empty `type`) and **warn** (soft: broken links, non-ISO log dates). Broken links are
explicitly tolerated by the spec (§5.3) — never a conformance failure.

**Completion criterion:** the checker has run and every ERROR it reported is listed for the report
(and fixed, if in `fix` mode).

## 2. Drift audit (judgment)

The checker can't see meaning. Audit the bundle for the ways a compounding artifact rots — this is
the legwork that makes lint worth running. Cover every check:

- **Contradictions** — concepts asserting conflicting facts that aren't linked `conflicts_with`.
- **Stale claims** — statements a newer source has superseded but that were never marked
  `superseded_by`; overviews behind their children.
- **Orphans** — concepts with zero inbound [cross-links](../kb/references/glossary.md) (index/log
  exempt; overviews exempt).
- **Missing cross-references** — concepts about the same entity/theme that don't link to each other.
- **Coverage gaps** — entities named repeatedly across concepts but lacking their own concept; data
  gaps a source or web search could fill.
- **Provenance gaps** — concepts making external claims with no `# Citations` / Reference.

**Completion criterion:** every check above has been run across the whole bundle and its findings
recorded — not a sample.

## 3. Report

Present findings grouped by check, each tagged:

- **Error** — §9 conformance failures. The bundle is non-conformant until fixed.
- **Warning** — drift that degrades trust (contradictions, stale claims, orphans, broken links).
- **Info** — suggestions (coverage gaps, new concepts or sources worth adding).

Turn coverage gaps into concrete next moves: questions to investigate, sources to
[ingest](../kb-ingest/SKILL.md). Append a dated summary (counts + notable findings) to the bundle's
`log.md` — append-only.

**Completion criterion:** a severity-grouped report is delivered and a `log.md` summary appended.

## Fix mode

If invoked with `fix`, repair only what is **safe and unambiguous**, then re-report what was fixed
vs. what needs a human:

- **Safe to auto-fix:** stale overviews (regenerate from children), missing cross-links, malformed
  log dates, broken links with an obvious target, index entries out of sync with files.
- **Never auto-fix:** anything that changes a claim's meaning. A contradiction or a stale *claim* is
  resolved by [ingest](../kb-ingest/SKILL.md) under the [trust model](../kb/references/trust-model.md)
  (**supersede**/**conflict**) — never by editing meaning in place here. Flag these for the user.

**Completion criterion:** every safe issue is fixed and every meaning-level issue is flagged (not
touched); the re-report distinguishes the two.
