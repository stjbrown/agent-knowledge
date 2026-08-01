---
name: kb-lint
description: Health-check a knowledge bundle for conformance and drift; optionally auto-fix safe issues.
disable-model-invocation: true
version: 0.3.2
tags: [knowledge, okf, lint, conformance]
---

# kb-lint — health-check the bundle

Keep a [bundle](../kb/SKILL.md) trustworthy as it **compounds** by catching **drift** — the decay a
growing knowledge base accumulates. Two passes: a **deterministic conformance** check (mechanical,
scripted) and a **drift audit** (fuzzy, judgment). Run both; report findings by severity. With
`fix`, repair what is safe.

## 1. Conformance (deterministic)

For a bundle-wide format or lifecycle migration, first inventory active metadata with the same
frontmatter-aware checker:

```
node "<skill-dir>/scripts/conformance.mjs" <bundle-dir> --inventory --json
```

The inventory parses only each concept's leading YAML frontmatter and reports body `# Citations`
separately. Its `observations` include counts and exact paths for every active top-level key and
status value; `legacy_citations` counts citation sections, numbered items, separately defined
footnote sources, total source records, and common citation shapes; `structured_sources` counts the
postflight concepts, entries, and entries carrying `resource`. An absent observation means zero. Do
not use repository-wide grep to classify active metadata because prose and fenced examples can contain
inactive field names and lifecycle values. Resolve every reported frontmatter error before planning
from the counts.

Run the bundled checker against the target bundle (default `knowledge/`). It is a zero-dependency
Node script (`node >=18`); `<skill-dir>` is this skill's directory — `${CLAUDE_SKILL_DIR}` under
Claude Code, or whatever path your host exposes for the skill:

```
node "<skill-dir>/scripts/conformance.mjs" <bundle-dir>
```

It reports **ERROR** for a hard [SPEC](../kb/references/SPEC.md) §11 failure and **warn** for
producer-profile defects in optional v0.2 fields, broken links, non-ISO log dates, and stale dates.
Optional-family warnings never make the bundle non-conformant. Broken links are explicitly
tolerated by §6.1.

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
- **Provenance gaps** — concepts making external claims with neither OKF v0.2 `sources` nor a legacy
  `# Citations` / Reference trail.
- **v0.2 metadata drift** — `sources` entries without `resource`, footnote labels without a matching
  `sources[].id`, malformed `generated`/`verified` actors or dates, invalid lifecycle values, and
  Attested Computations missing their required runtime or computation contract.
- **Repository drift** — for living repository documentation, missing paths in
  `sources[].resource`, evidence that no longer supports the documented behavior, or source changes
  since `spec/repository_state.md`'s `documented_revision` that affect a concept without a
  corresponding update. A lingering `documented_worktree: true` there requires comparison with the
  current working tree. Skip this check when repository evidence or Git history is unavailable.
- **Schema drift** — types used but absent from `spec/types.md`; documented types that no longer
  describe their concepts; spelling/case variants; or one overloaded type hiding several recurring,
  materially distinct entity kinds. Treat unused documented types as Info, not an error.

**Completion criterion:** every check above has been run across the whole bundle and its findings
recorded — not a sample.

## 3. Report

Present findings grouped by check, each tagged:

- **Error** — §11 conformance failures. The bundle is non-conformant until fixed.
- **Warning** — drift that degrades trust (contradictions, stale claims, orphans, broken links).
- **Info** — suggestions (coverage gaps, new concepts or sources worth adding).

Turn coverage gaps into concrete next moves: questions to investigate, sources to
[ingest](../kb-ingest/SKILL.md), or repository evidence to inspect through
[kb-document](../kb-document/SKILL.md). Append a dated summary (counts + notable findings) to the
bundle's `log.md` — append-only.

**Completion criterion:** a severity-grouped report is delivered and a `log.md` summary appended.

## Fix mode

If invoked with `fix`, repair only what is **safe and unambiguous**, then re-report what was fixed
vs. what needs a human:

- **Safe to auto-fix:** stale overviews (regenerate from children), missing cross-links, malformed
  log dates, broken links with an obvious target, index entries out of sync with files.
- **Never auto-fix:** anything that changes a claim's meaning. A contradiction or a stale *claim* is
  resolved by [ingest](../kb-ingest/SKILL.md) under the [trust model](../kb/references/trust-model.md)
  (**supersede**/**conflict**) — never by editing meaning in place here. Type renames, merges,
  splits, deprecations, and migrations also require user confirmation; report the proposed schema
  change and affected concepts together. Route living repository behavior that needs a meaning
  update to [kb-document](../kb-document/SKILL.md), which applies the trust model's narrow
  versioned-repository exception with source evidence and a revision log.

**Completion criterion:** every safe issue is fixed and every meaning-level issue is flagged (not
touched); the re-report distinguishes the two.
