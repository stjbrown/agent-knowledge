# agent-knowledge

**Build and maintain a portable knowledge base that your coding agent actually keeps up to date.**

`agent-knowledge` is a family of agent skills (`kb-*`) for creating and maintaining a **knowledge
bundle** — a directory of markdown files with YAML frontmatter in the
[Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf).
Knowledge is **compiled once and kept current**, not re-derived from raw sources on every question.
It's plain markdown + git: readable without tooling, diffable in review, portable across any agent.

Based on Andrej Karpathy's [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
pattern, made conformant to OKF and shipped as skills you can drop into any project.

## Why this exists

Most agent "memory" is either RAG (the model re-reads your raw docs and re-derives the answer every
single query — nothing accumulates) or a pile of notes that goes stale because keeping it current is
nobody's job. The tedious part of a knowledge base isn't the reading or the thinking — it's the
**bookkeeping**: updating cross-references, flagging contradictions, keeping summaries current. That
is exactly what an agent is good at and never gets bored doing.

`agent-knowledge` makes the agent a disciplined **wiki maintainer**:

- **Ingest** a source once → the agent extracts the signal and integrates it across the bundle.
- **Query** the bundle → it navigates by links, answers with citations, and files good answers back.
- **Lint** it → it catches drift (contradictions, stale claims, orphans) before the base rots.

Two things set it apart from other agent-wiki tools: it targets a **real, specified format (OKF)** so
your knowledge is portable and never locked in, and it applies an opinionated **trust model** —
append-only on meaning, supersede-with-provenance, never a silent rewrite — so the base stays
trustworthy as it grows.

## Install

Via [skills.sh](https://skills.sh) (works with Claude Code, Cursor, Codex, and 20+ agents):

```bash
npx skills@latest add stjbrown/agent-knowledge
```

Or as a Claude Code plugin:

```bash
/plugin marketplace add stjbrown/agent-knowledge
/plugin install agent-knowledge
```

## Quickstart

```
1. /kb-init          → scaffold a knowledge/ bundle, tailored to your domain
2. "ingest this…"    → drop a note, transcript, PDF, or URL; the agent files it
3. "what do we know about X?"  → ask; the agent answers from the bundle, with citations
4. /kb-lint          → periodically health-check the bundle
5. /kb-visualize     → see it as an interactive graph
```

## The skills

The family splits on **who invokes them**. **Model-invoked** skills the agent can reach for on its
own when the task fits; **user-invoked** skills you trigger deliberately by name.

**Model-invoked**

- **`kb`** — the hub. Explains the format, holds the shared spec / glossary / trust model /
  templates, and routes to the right skill. Other `kb-*` skills read its reference as their single
  source of truth.
- **`kb-ingest`** — read a raw source once, extract its signal, and integrate it across the bundle
  under the trust model. The heart of the system.
- **`kb-query`** — answer a question from the bundle (or surface relevant context for another task)
  by progressive disclosure, cite the concepts used, and file valuable answers back so the base
  compounds.

**User-invoked**

- **`kb-init`** — scaffold a new bundle (default `knowledge/`, custom path, multi-bundle aware) and
  write its per-project schema layer (concept types + conventions) so the generic skills fit your
  domain.
- **`kb-lint`** — health-check the bundle: a deterministic OKF conformance pass plus a drift audit
  (contradictions, stale claims, orphans, coverage gaps), with an optional safe `fix` mode.
- **`kb-visualize`** — render the bundle as an interactive graph — native UI where the host supports
  it, otherwise a self-contained HTML file.

## This repo documents itself in OKF

The [`knowledge/`](./knowledge/) directory is a **conformant OKF bundle about OKF and the LLM Wiki
pattern** — so the repository is its own worked example. Browse it to see what a bundle looks like,
or open [`knowledge/viz.html`](./knowledge/viz.html) for the interactive graph. Start at
[`knowledge/index.md`](./knowledge/index.md).

## Layout

```
skills/
  kb/                 # hub: SKILL.md + references/ (SPEC, glossary, trust-model) + templates/ + example-bundle/
  kb-init/  kb-ingest/  kb-query/
  kb-lint/            # + scripts/conformance.py  (deterministic §9 check, no deps)
  kb-visualize/       # + scripts/graph.py        (graph-model extractor, no deps)
knowledge/            # this project's own OKF bundle (self-documenting) + viz.html
.claude-plugin/       # plugin manifest
```

## License

[MIT](./LICENSE). The vendored OKF specification (`skills/kb/references/SPEC.md`) is from
GoogleCloudPlatform/knowledge-catalog under Apache-2.0; see [NOTICE](./NOTICE).
