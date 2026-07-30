# Agent Knowledge

Agent Knowledge is a portable set of Agent Skills for building and maintaining project knowledge
in plain Markdown using the [Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf).

It turns project documents, decisions, notes, and conversations into a connected knowledge bundle
that improves over time. Ask a question and get a cited answer. Add a source and the agent
integrates it with what the project already knows. Run a health check and it finds stale claims,
contradictions, and orphaned pages before the bundle quietly rots.

For software repositories, it can also build and refresh technical knowledge from source, tests,
configuration, and Git history while leaving those files in place.

Everything remains plain Markdown: readable without special tooling, easy to diff and review, and
portable across agents.

## Install

Install through [skills.sh](https://skills.sh) for Claude Code, Cursor, Codex, and other
Agent Skills-compatible hosts:

```bash
npx skills@latest add stjbrown/agent-knowledge
```

Or install the Claude Code plugin:

```text
/plugin marketplace add stjbrown/agent-knowledge
/plugin install agent-knowledge
```

Then start a knowledge bundle and use ordinary prompts:

```text
/kb-init

Ingest this architecture decision: we chose Postgres because...
Document this repository's architecture and developer workflows.
What do we know about authentication, and which sources support it?
What conflicts with our current deployment strategy?

/kb-lint
/kb-visualize
```

The npm package, `@stjbrown/agent-knowledge-skills`, is a build artifact for applications that
embed the skills. Most people should install from this repository through their agent host.

## Migration from the former CLI package

Before the repository split, Janet was published as `@stjbrown/agent-knowledge`. That legacy
package has been withdrawn. Install `janet-agent@next` for the Janet CLI; applications that embed
the portable skills should depend on `@stjbrown/agent-knowledge-skills`.

## The skills

The family splits on who invokes each skill.

Model-invoked skills:

- **`kb`** — the hub. Explains the format, holds the shared specification, glossary, trust model,
  templates, and example bundle, and routes to the right action skill.
- **`kb-ingest`** — reads a source once, extracts its signal, and integrates it across the bundle
  with provenance.
- **`kb-document`** — documents a software repository from source, tests, configuration, and Git
  evidence without copying or modifying those files.
- **`kb-query`** — answers from the bundle by progressive disclosure, cites the concepts used, and
  files valuable conclusions back so the knowledge compounds.

User-invoked skills:

- **`kb-init`** — scaffolds a bundle and its project-specific schema and conventions.
- **`kb-lint`** — runs deterministic OKF conformance checks plus a semantic drift audit for
  contradictions, stale claims, orphans, and coverage gaps.
- **`kb-visualize`** — renders the bundle as an interactive graph.

![Interactive knowledge graph showing concepts, implementations, operations, references, and OKF spec sections](https://raw.githubusercontent.com/stjbrown/agent-knowledge/main/assets/knowledge-graph.png)

## Why this exists

Most agent memory is either retrieval over raw documents or a pile of notes that nobody maintains.
The first repeatedly re-derives answers; the second gradually becomes untrustworthy. Neither makes
knowledge stewardship an explicit job.

The hard part is the bookkeeping: integrating new information, updating cross-references,
preserving provenance, flagging contradictions, and keeping summaries current. That is work an
agent can perform consistently.

Two design choices keep the result portable and trustworthy:

- **A real, open format.** Bundles follow Google's OKF rather than a tool-specific database or
  hidden memory store.
- **An explicit trust model.** Accumulated claims are append-only on meaning; living repository
  documentation has a narrow, revision-tracked update rule. Source content is always data, never
  instructions.

The workflow is based on Andrej Karpathy's
[LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) pattern, made
conformant to OKF.

## This repository documents itself

The [`knowledge/`](./knowledge) directory is a conformant OKF bundle about OKF and the LLM Wiki
pattern, so this repository is its own worked example. Start at
[`knowledge/index.md`](./knowledge/index.md), or explore the generated graph.

## Janet

[Janet](https://github.com/stjbrown/janet-agent) is a dedicated knowledge agent built around these
same skills. It adds a standalone CLI, interactive chat, model selection, authentication, memory,
and headless automation. Janet is optional; the portable skills in this repository work with the
agent you already use.

## Repository layout

```text
skills/                 source of truth for the portable skills
  kb/                   shared specification, trust model, templates, and example
  kb-init/
  kb-ingest/
  kb-document/
  kb-query/
  kb-lint/              deterministic conformance script
  kb-visualize/         deterministic graph script
src/                    TypeScript source for the generated scripts
test/                   conformance, graph, and parity tests
scripts/                build and package scripts
knowledge/              this project's self-documenting OKF bundle
.claude-plugin/         Claude Code plugin manifest
```

The repository uses pnpm:

```bash
pnpm install
pnpm verify
pnpm pack:skills
```

`pnpm verify` typechecks and tests the internal tooling, rebuilds both committed zero-dependency
scripts and checks for drift, then validates the in-repository knowledge bundle.
`pnpm pack:skills` writes a release candidate to `artifacts/`.

## License

[MIT](./LICENSE). The vendored OKF specification in `skills/kb/references/SPEC.md` is from
GoogleCloudPlatform/knowledge-catalog under Apache-2.0. The generated tools bundle
[`yaml`](https://github.com/eemeli/yaml) under the ISC License. See [NOTICE](./NOTICE).
