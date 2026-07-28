# agent-knowledge

**Agent Knowledge is a portable LLM wiki system for building and maintaining project knowledge in
plain Markdown using the Open Knowledge Format (OKF).**

It turns project documents, decisions, notes, and conversations into a connected knowledge base
that improves over time. Ask a question and get a cited answer. Add a source and the agent
integrates it with what the project already knows. Run a health check and it finds stale claims,
contradictions, and orphaned pages before the wiki quietly rots.

Everything remains plain Markdown: readable without special tooling, easy to diff and review, and
portable across agents.

## From skills to Janet

Agent Knowledge began as a family of portable [Agent Skills](https://agentskills.io) called `kb-*`.
You could add them to Claude Code, Cursor, Codex, or another coding agent and teach the agent you
already use how to create, query, and maintain an OKF knowledge bundle.

Those skills are still the core of the project. Agent Knowledge has since evolved to include
**Janet**, a dedicated knowledge agent built around the same skills. Janet gives the workflow its
own CLI, interactive chat, model selection, authentication, and headless mode, while keeping the
knowledge itself open and independent of her runtime.

Janet is one way to use Agent Knowledge, not a requirement. You can:

**1. Add the skills to the agent you already use.** Install the `kb-*` skills in Claude Code,
Cursor, Codex, or one of 20+ other hosts. No new runtime is required.

**2. Run Janet directly (`npx @stjbrown/agent-knowledge@next`).** Chat with a self-contained
knowledge agent in any project, or drive her headlessly from scripts and CI. Bring your own model,
including Claude, Gemini, or GPT, through Google Vertex, Amazon Bedrock, API keys, or a Claude Max or
ChatGPT subscription.

**3. Call Janet as a subagent.** Delegate ingestion, research, queries, and knowledge maintenance to
a focused subagent while your primary agent stays on the larger task. The subagent can use Janet's
headless CLI or load the same `kb-*` skills directly.

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
# Interactive preview (also installed as `ding`, because you summon Janet with a ding)
npx @stjbrown/agent-knowledge@next
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
| `/models` · `/model [id]` | pick a configured provider and model, or switch directly by id |
| `/providers` | show detected providers and the environment variables that enable more |
| `/login <anthropic\|openai-codex> [browser\|device]` · `/logout` · `/auth` | subscription sign-in and status; device mode is available for remote OpenAI login |
| `/observability` · `/traces` | configure opt-in tracing and browse local trace history |
| `/compact` | flush the current conversation into Observational Memory now |
| `/clear` | start a blank conversation; the previous thread stays saved and recallable |
| `/cancel` | cancel the active turn; Esc or Ctrl+C does the same while Janet is working |
| `/help` · `/quit` | help; exit (or press Ctrl+C twice) |

Just type to talk to Janet; ↑/↓ recalls previous prompts.

**Models & providers.** No default provider — you choose. Janet discovers configured providers and
their current model catalogs through Mastra's native model router. The first provider cohort is
OpenAI, Anthropic, Google AI Studio, DeepSeek, Groq, Mistral, xAI, OpenRouter, Together AI,
Fireworks AI, and Cerebras. Set the provider's standard environment variable, restart Janet, and
use `/models`; `/providers` shows the exact variable names without revealing their values.

Vertex AI (ADC/service account) and Amazon Bedrock (AWS credential chain) use Janet's dedicated
cloud gateways. OpenAI and Anthropic additionally support ChatGPT/Codex and Claude Max subscription
OAuth. An explicitly exported `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` takes precedence over stored
OAuth for that process; unset it to return to subscription authentication. Any other configured
Mastra-native provider remains usable through `/model provider/model` or `--model provider/model`
even when it is not in the initial cohort. The selected model persists across restarts.

**Memory.** Janet uses Mastra Observational Memory (OM) by default. The Observer compresses older
messages and noisy tool output into durable observations as the conversation grows; the Reflector
condenses those observations over longer sessions. Raw messages remain in local storage and OM's
recall tool can recover exact details when a compressed observation is insufficient.

Memory work stays on the provider you already authenticated: Vertex and Google use Gemini Flash,
Anthropic uses Claude Haiku, OpenAI uses a mini model, and Bedrock uses Claude Haiku. Providers
without a dependable fast default use the selected model itself. To override this policy, set
`JANET_MEMORY_MODEL=provider/model`, or set `JANET_OBSERVER_MODEL` and
`JANET_REFLECTOR_MODEL` independently. `/compact` forces the current unobserved tail through the
same OM pipeline; automatic buffering and compaction remain active either way. `/clear` rotates to
a blank thread without deleting the old one or changing the knowledge bundle.

**Observability.** Tracing is strictly off by default. Run `/observability` to choose local trace
history, Phoenix, or a custom OTLP endpoint. Metadata-only capture records timing, model and tool
activity, token usage, status, and errors without prompt or response bodies. Full capture requires
an explicit warning and confirmation. Settings take effect after restarting Janet.

Local history is stored separately at `~/.agent-knowledge/observability.db` and can be inspected
with `/traces`. Phoenix runs as a separate local or remote service; Janet sends it standard
OTLP/HTTP protobuf traces and does not run a web or development server. Custom OTLP supports other
compatible collectors and backends.

Headless runs and automation can use environment configuration:

```bash
JANET_OBSERVABILITY=metadata \
JANET_OBSERVABILITY_BACKEND=phoenix \
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006 \
PHOENIX_PROJECT_NAME=janet \
janet query "What happened?" --print
```

Use `JANET_OBSERVABILITY_BACKEND=otlp` with `OTEL_EXPORTER_OTLP_ENDPOINT` for a custom collector.
Authentication headers can be supplied with `OTEL_EXPORTER_OTLP_HEADERS`; Janet never writes them
to `settings.json`. Standard `OTEL_*` variables configure an explicitly enabled run but do not
enable tracing on their own. Janet also does not load a project's `.env` automatically. See
[`OBSERVABILITY.md`](./OBSERVABILITY.md) for the architecture, privacy model, and eval roadmap.

Janet is built on [Mastra](https://mastra.ai) and lives in
[`packages/janet`](https://github.com/stjbrown/agent-knowledge/tree/janet-agent/packages/janet)
(published as `@stjbrown/agent-knowledge`, bins `janet` + `ding`). She also reports lifecycle state
natively to [Herdr](https://herdr.dev) when run inside a Herdr pane.

Janet reads local PDFs through a dedicated TypeScript extractor. Small documents return
page-delimited text directly; larger documents use a cached Markdown artifact read in bounded
chunks. Raw PDF bytes never enter model history. Visual/OCR fallback remains optional and is not
enabled yet.

Janet also fetches known public HTTP(S) URLs through a provider-neutral local reader. It validates
every redirect, blocks private and metadata networks, never executes page JavaScript, and returns
readable Markdown through the same bounded artifact/chunk pattern. This baseline needs no API key.
Web search providers (such as Tavily, Firecrawl, or Exa) and interactive browser automation remain
separate, optional capabilities and are not enabled yet.

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

![Interactive knowledge graph showing concepts, implementations, operations, references, and OKF spec sections](https://raw.githubusercontent.com/stjbrown/agent-knowledge/janet-agent/assets/knowledge-graph.png)

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

The
[`knowledge/`](https://github.com/stjbrown/agent-knowledge/tree/janet-agent/knowledge)
directory is a **conformant OKF bundle about OKF and the LLM Wiki pattern**, so the repository is
its own worked example. Browse it to see what a bundle looks like, or open the generated graph for
the interactive view. Start at
[`knowledge/index.md`](https://github.com/stjbrown/agent-knowledge/blob/janet-agent/knowledge/index.md).

## Layout

```
skills/                 # source of truth for the portable skills.sh / plugin collection
  kb/                   # hub: SKILL.md + references/ (SPEC, glossary, trust-model) + templates/ + example-bundle/
  kb-init/  kb-ingest/  kb-query/
  kb-lint/              # + scripts/conformance.mjs  (deterministic §9 check, zero-dep)
  kb-visualize/         # + scripts/graph.mjs        (graph-model extractor, zero-dep)
knowledge/              # this project's own OKF bundle (self-documenting)
packages/
  janet/                # the standalone agent (published as "agent-knowledge")
    src/skills/         # Janet-only inline skills (not exposed to skills installers)
    src/tools/          # Janet-only deterministic tools
  kb-tools/             # deterministic TS conformance + graph (compiles the committed skill .mjs)
.claude-plugin/         # plugin manifest
```

The repo is a pnpm workspace. `pnpm install && pnpm -r build` builds both packages; `pnpm -r test`
runs the conformance/graph parity tests.

## Preview testing

Janet preview releases are published to npm under the `next` tag. To install the preview on another
laptop, build an installable tarball from `janet-agent`, or run the release test matrix, see
[`TESTING.md`](https://github.com/stjbrown/agent-knowledge/blob/janet-agent/TESTING.md). Maintainers
can run `pnpm pack:janet` to execute the release checks and write the package to `artifacts/`.

## License

[MIT](./LICENSE). The vendored OKF specification (`skills/kb/references/SPEC.md`) is from
GoogleCloudPlatform/knowledge-catalog under Apache-2.0; portions of `packages/janet` (the auth
subsystem, Bedrock gateway, and Observational Memory configuration) are adapted from MastraCode
under Apache-2.0. See [NOTICE](./NOTICE).
