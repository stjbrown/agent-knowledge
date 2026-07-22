# agent-knowledge

**Janet builds and maintains a portable LLM wiki in plain Markdown using the Open Knowledge Format
(OKF).**

Run Janet directly, call her as a subagent, or add her knowledge-management skills to the coding
agent you already use. In every form, she turns project documents, decisions, notes, and
conversations into a connected Markdown knowledge base that improves over time.

Ask a question and get a cited answer. Add a source and Janet integrates it with what the project
already knows. Run a health check and she finds stale claims, contradictions, and orphaned pages
before the wiki quietly rots.

Everything remains plain Markdown: readable without special tooling, easy to diff and review, and
portable across agents.

## Ways to work with Janet

**1. Run Janet directly (`npx @stjbrown/agent-knowledge`).** Use the self-contained CLI in any
project and chat with Janet, or drive her headlessly from scripts and CI. Bring your own model,
including Claude, Gemini, or GPT, through Google Vertex, Amazon Bedrock, API keys, or a Claude Max or
ChatGPT subscription.

**2. Call Janet as a subagent.** Delegate ingestion, research, queries, and knowledge maintenance to
a focused subagent while your primary agent stays on the larger task. The subagent can use Janet's
headless CLI or load the same `kb-*` skills directly.

**3. Add Janet's skills to the agent you already use.** The knowledge-tending behavior is packaged
as [Agent Skills](https://agentskills.io) for Claude Code, Cursor, Codex, and 20+ other hosts. No new
runtime is required; your existing agent gains the `kb-*` capabilities.

Every mode is powered by the same `kb-*` skills. The standalone Janet CLI adds its own runtime,
model selection, and TUI around them.

---

## Janet

Janet (after *The Good Place*'s all-knowing repository-of-knowledge) is the standalone agent. She
operates on the **current directory**: run her in `~/project/` and the bundle is `~/project/knowledge/`,
with conversation history scoped to that project.

`--bundle <path>` may select a different bundle inside the project. Janet intentionally rejects
bundle paths outside the project workspace so its filesystem boundary remains meaningful.

```bash
# Interactive chat (also installed as `ding` — you summon Janet with a ding)
npx @stjbrown/agent-knowledge
# or, once installed globally:
janet
```

First run walks you through picking a model from the providers you actually have configured. After
that:

```bash
janet init                       # scaffold a knowledge/ bundle here
janet ingest ./notes/rfc-42.md   # read a source and integrate it
janet query "how does auth work, and what supports it?"
janet lint                       # conformance + drift audit
janet viz                        # write an interactive graph (knowledge/graph.html)
```

Add `-p` (or pipe/redirect) for **headless** one-shot mode — streams to stdout, exits on completion,
CI-friendly. Headless query/lint runs are read-only; init/ingest/viz may edit the workspace, while
shell commands and Git commits require explicit `--allow-exec`. `janet lint` runs a deterministic,
token-free OKF conformance check before the agent's drift audit, so it is usable as a CI gate.

**Inside the chat:**

| Command | |
|---|---|
| `/models` · `/model [id]` | pick a model from an arrow-key list, or switch by id |
| `/login <anthropic\|openai-codex> [browser\|device]` · `/logout` · `/auth` | subscription sign-in and status; device mode is available for remote OpenAI login |
| `/help` · `/quit` | help; exit (or double Ctrl+C) |

Just type to talk to Janet; ↑/↓ recalls previous prompts.

**Models & providers.** No default provider — you choose. Janet supports Google Vertex AI (Claude +
Gemini, via ADC/service account), Amazon Bedrock (AWS credential chain), Anthropic and OpenAI (API
key **or** subscription OAuth), and Google Gemini (API key). Set the choice once (`--model`,
`JANET_MODEL`, or the first-run picker) and it persists.

Janet is built on [Mastra](https://mastra.ai) and lives in [`packages/janet`](./packages/janet)
(published as `@stjbrown/agent-knowledge`, bins `janet` + `ding`). She also reports lifecycle state natively to
[Herdr](https://herdr.dev) when run inside a Herdr pane.

---

## The skills

Install via [skills.sh](https://skills.sh) for Claude Code, Cursor, Codex, and 20+ other agents:

```bash
npx skills@latest add stjbrown/agent-knowledge
```

Or as a Claude Code plugin:

```text
/plugin marketplace add stjbrown/agent-knowledge
/plugin install agent-knowledge
```

Then start a knowledge base and use ordinary prompts:

```text
/kb-init

Ingest this architecture decision: we chose Postgres because...
What do we know about authentication, and which sources support it?
What conflicts with our current deployment strategy?

/kb-lint       # find broken links, stale claims, contradictions, and gaps
/kb-visualize  # explore the bundle as an interactive graph
```

![Interactive knowledge graph showing concepts, implementations, operations, references, and OKF spec sections](./assets/knowledge-graph.png)

The family splits on **who invokes them**. **Model-invoked** skills the agent reaches for on its own
when the task fits; **user-invoked** skills you trigger deliberately by name.

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

## Why this exists

Most agent "memory" is either retrieval over raw documents or a pile of notes that nobody maintains.
The first repeatedly re-derives answers; the second gradually becomes untrustworthy. Neither makes
knowledge stewardship an explicit job.

The hard part of a useful knowledge base is the bookkeeping: integrating new information, updating
cross-references, preserving provenance, flagging contradictions, and keeping summaries current.
That is exactly the work an agent can perform consistently.

Two design choices keep the result portable and trustworthy:

- **A real, open format.** Bundles follow Google's
  [Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)
  rather than a tool-specific database or hidden memory store.
- **An explicit trust model.** Meaning is append-only: the agent supersedes claims with provenance
  instead of silently rewriting history, and treats source content as data, never as instructions.

The workflow is based on Andrej Karpathy's
[LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) pattern, made conformant
to OKF.

## This repo documents itself in OKF

The [`knowledge/`](./knowledge/) directory is a **conformant OKF bundle about OKF and the LLM Wiki
pattern** — so the repository is its own worked example. Browse it to see what a bundle looks like, or
open the generated graph for the interactive view. Start at [`knowledge/index.md`](./knowledge/index.md).

## Layout

```
skills/                 # source of truth for both Janet and the skills.sh / plugin installs
  kb/                   # hub: SKILL.md + references/ (SPEC, glossary, trust-model) + templates/ + example-bundle/
  kb-init/  kb-ingest/  kb-query/
  kb-lint/              # + scripts/conformance.mjs  (deterministic §9 check, zero-dep)
  kb-visualize/         # + scripts/graph.mjs        (graph-model extractor, zero-dep)
knowledge/              # this project's own OKF bundle (self-documenting)
packages/
  janet/                # the standalone agent (published as "agent-knowledge")
  kb-tools/             # deterministic TS conformance + graph (compiles the committed skill .mjs)
.claude-plugin/         # plugin manifest
```

The repo is a pnpm workspace. `pnpm install && pnpm -r build` builds both packages; `pnpm -r test`
runs the conformance/graph parity tests.

## Pre-release testing

Janet is not published to npm yet. To build an installable tarball from `janet-agent`, install it on
another laptop, or run the public-preview test matrix, see [`TESTING.md`](./TESTING.md). Maintainers
can run `pnpm pack:janet` to execute the release checks and write the package to `artifacts/`.

## License

[MIT](./LICENSE). The vendored OKF specification (`skills/kb/references/SPEC.md`) is from
GoogleCloudPlatform/knowledge-catalog under Apache-2.0; portions of `packages/janet` (the auth
subsystem and Bedrock gateway) are adapted from MastraCode under Apache-2.0. See [NOTICE](./NOTICE).
