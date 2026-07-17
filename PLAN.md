# Plan: `janet` — an npx-deployable Mastra agent for agent-knowledge

## Context

`agent-knowledge` today is a family of `kb-*` **skills** (markdown `SKILL.md` prompts + two Python
helper scripts) that run inside a *host* agent (Claude Code, Cursor, etc.) installed via skills.sh or
the Claude plugin. It has no runtime of its own.

We want to copy the **packaging pattern** of a standalone, npx-installable agent CLI (like
`langchain-ai/openwiki`, and — more directly — Mastra's own `mastracode`), but keep
agent-knowledge's **purpose**: create and manage an OKF knowledge bundle (NOT generate code docs).

The result is a new agent — **persona/command `janet`** (after The Good Place's all-knowing
repository-of-knowledge assistant), shipped in the **package `agent-knowledge`** — built on **native
Mastra primitives + the `AgentController` layer** (not `@mastra/code-sdk`, and not rolling our own
agent loop). It **reuses the repo's existing `kb-*` skills** as its behavior (via Mastra's native
workspace-skills feature, which follows the same Agent Skills spec the skills already conform to),
ships a **clean minimal TUI**, supports a **headless one-shot** mode for CI/scripts, and is
**all-TypeScript, no Python**.

Reference implementation studied: `~/projects/mastra/mastracode` (`sdk` = `@mastra/code-sdk`, `tui`
= `mastracode` bin). We borrow its *patterns* and strip its heavy extras (browser, voice, MCP, goals,
plugins, OM, web, multi-mode).

## Decisions locked in (from discussion)

- Persona named **Janet**; published package name stays **`agent-knowledge`**; **two bins from the
  same entry point: `janet` and `ding`** (you summon Janet with a ding). So `npx agent-knowledge`,
  `janet`, and `ding` all work. Known, accepted: the Janet programming language also installs a
  `janet` binary — `ding` doubles as the collision-free alias.
- **Directory-based by default** (like Claude Code / pi): `janet` operates on the **current working
  directory**. Run it in `~/sharks/` → that dir is the project, the bundle is `~/sharks/knowledge/`,
  and threads/history are scoped to that dir. No global "current project" state.
- Lean fresh app on `@mastra/core` + `AgentController`; no `@mastra/code-sdk`.
- Ships a clean pi-tui TUI (interactive default) **and** a headless one-shot path.
- Reuse existing in-repo `kb-*` skills; do not fork the prompts.
- **Layered skill resolution**: npm-shipped copy (external, always present) + common-dir discovery
  (`.agents/skills` / `.claude/skills`, project & `~`) that *shadows* it (local > external), so a
  user's `npx skills add` copy is shared with their host agents. Never a hard dependency on a
  network install.
- All TypeScript. Port the two Python scripts to TS; commit zero-dep `.mjs` into the skills folders.
- Rename `skills/kb/reference/` → `skills/kb/references/` (Agent Skills spec dir name) and fix links.
- **Full multi-provider model selection, no default provider** (like mastracode): support everything
  Mastra's model router does — Anthropic (API key + Claude Max OAuth), OpenAI (API key + ChatGPT/Codex
  OAuth), Amazon Bedrock (AWS credential chain / bearer token), Google Vertex/Gemini, and custom
  OpenAI-compatible endpoints. First run prompts the user to pick a provider + model; the choice
  persists and is switchable at runtime (`/models`, `/login`) and via headless flag/env. This
  reintroduces mastracode's model-resolution + gateway + auth/OAuth + onboarding subsystem (detailed
  in Part D). Still excluded: browser, voice, MCP, goals, plugins, OM, web UI, multi-mode.

## Reference material (for the implementer)

**Local source (primary — all file:line citations in this plan are verified against these):**
- `~/projects/mastra/mastracode` — the reference implementation. `sdk/src/` is where most cited
  files live: `agents/{model,workspace,mastracode-gateway}.ts`, `providers/{claude-max,
  amazon-bedrock-gateway}.ts`, `auth/**`, `onboarding/**`, `headless/**`; TUI patterns in
  `tui/src/tui/` (`mastra-tui.ts`, `onboarding-inline.ts`).
- `~/projects/mastra` — the Mastra **monorepo**; `packages/core/src/agent-controller/` is the
  authoritative source for `AgentController`/session APIs cited here. **Caveat (step zero):**
  mastracode builds against `workspace:*`, so treat the monorepo as "what the API looks like" and
  the **published** `@mastra/core` as "what we can actually use" — diff them before building.

**Docs (for the published-API side):**
- Mastra: <https://mastra.ai/docs> — agents, memory, workspaces/skills, model router, storage
  (LibSQL). In this environment, the `mastra` skill retrieves current docs and the `mastra api` CLI
  can inspect a running instance — prefer those over pretrained knowledge for API signatures.
- Agent Skills spec (what `skills/*/SKILL.md` conforms to): <https://agentskills.io>.
- AI SDK providers: <https://ai-sdk.dev/providers/ai-sdk-providers/google-vertex> (**net-new Vertex
  gateway — the most docs-dependent piece, no mastracode reference**),
  <https://ai-sdk.dev/providers/ai-sdk-providers/amazon-bedrock>, plus anthropic / openai /
  openai-compatible provider pages.
- pi-tui: no real docs — the API reference is mastracode's own `tui/src/` usage plus the pi-mono
  repo (<https://github.com/badlogic/pi-mono>). Pin `@earendil-works/pi-tui@0.80.6` (mastracode's
  known-good version) rather than chasing latest.
- Herdr: <https://herdr.dev/docs> (integrations, `herdr pane report-agent` socket API); the `herdr`
  skill in this environment covers the CLI.

## Target repo topology (pnpm monorepo)

```
agent-knowledge/                    # repo root = pnpm workspace (private)
  pnpm-workspace.yaml               # NEW: packages: ["packages/*"]
  package.json                      # NEW root: private, workspace scripts (build/test)
  skills/                           # EXISTING — source of truth (references/ rename + .mjs scripts)
  knowledge/                        # EXISTING OKF bundle (unchanged)
  .claude-plugin/plugin.json        # EXISTING — unchanged (still lists ./skills/*)
  packages/
    kb-tools/                       # NEW private pkg: TS conformance + graph (importable + builds .mjs)
      src/{conformance.ts,graph.ts,index.ts}
      scripts/build-skill-scripts.mjs   # esbuild → committed skills/*/scripts/*.mjs
    janet/                          # NEW published pkg "agent-knowledge", bin "janet"
      src/
        main.ts                     # bin entry (#!/usr/bin/env node) — arg dispatch
        agent/{controller.ts,agent.ts,workspace.ts,model.ts,storage.ts,skills-paths.ts}
        gateways/{custom.ts,bedrock.ts,vertex.ts}   # Part D — provider dispatch (vertex net-new)
        auth/{pkce,authorization-input,device-code,types,storage}.ts + providers/{anthropic,openai-codex}.ts  # lifted
        onboarding/{packs.ts,settings.ts,wizard.ts} # no-default first-run + settings.json
        headless/{run.ts,policy.ts,format.ts,flags.ts}
        tui/{index.ts,state.ts,layout.ts,events.ts,render-scheduler.ts,handlers/*,model-picker.ts,login.ts}
        commands.ts                 # subcommand → skill directive mapping
      tsup.config.ts                # entries: main(cli), headless, index ; esm ; node>=22
```

The publishable package is `packages/janet` (`name: "agent-knowledge"`,
`bin: { janet: "./dist/main.js", ding: "./dist/main.js" }`, `files: ["dist","skills"]`). A `prepack` step copies repo-root
`skills/` into `packages/janet/skills` (gitignored build artifact) so npm ships the fallback copy.
Repo-root `skills/` stays the single source for skills.sh and the Claude plugin.

## Part A — Skills refactor (source of truth)

1. **Rename** `skills/kb/reference/` → `skills/kb/references/` (`SPEC.md`, `glossary.md`,
   `trust-model.md`). Update every `../kb/reference/...` link across `skills/kb/SKILL.md`,
   `kb-ingest`, `kb-query`, `kb-lint`, `kb-init`, the templates, and `README.md`
   (`grep -rn "kb/reference" skills README.md`).
2. **Port scripts to TS** in `packages/kb-tools/src/`:
   - `conformance.ts` ← `skills/kb-lint/scripts/conformance.py` (deterministic OKF §9; exit-code +
     `--json`; export `checkConformance(bundleDir)`).
   - `graph.ts` ← `skills/kb-visualize/scripts/graph.py` (graph-model JSON: nodes/types/edges/
     cited_by; export `extractGraph(bundleDir)`).
   Preserve behavior exactly (verify against current Python output for parity).
3. **Build committed `.mjs`**: `build-skill-scripts.mjs` esbuild-bundles each to a zero-dep single
   file at `skills/kb-lint/scripts/conformance.mjs` and `skills/kb-visualize/scripts/graph.mjs`.
   **Keep the `.py` files until the parity snapshot tests (Verification #1) pass in CI** — they are
   the parity oracle. Delete them in a follow-up commit once green.
4. **Update SKILL.md invocations**: `python3 …conformance.py <dir>` → `node …conformance.mjs <dir>`
   (same for `graph.py`). Keep `${CLAUDE_SKILL_DIR}` for Claude Code; **verify** the Mastra sandbox
   path the agent uses (skill tool returns the skill dir) resolves the script — adjust wording to be
   host-neutral if needed.
5. **Frontmatter**: add optional `version` and `tags` to each `SKILL.md` (Agent Skills spec).
   `disable-model-invocation` on kb-init/lint/visualize is a Claude Code field; harmless to Mastra.

## Part B — Deterministic tools package (`packages/kb-tools`)

Private workspace package. Two roles: (1) imported by `janet` for a fast, LLM-free conformance path;
(2) source that compiles the committed skill `.mjs`. Zero runtime deps (pure Node). Vitest tests run
both against `knowledge/`.

## Part C — The `janet` Mastra app (`packages/janet`)

### Directory-based operation (cwd = project)

Core UX, matching Claude Code / pi and mastracode's project model:

- **`projectPath = process.cwd()`** by default. Everything Janet does is scoped to it. Optional
  `-C/--dir <path>` overrides the working dir (like `git -C`); optional `--bundle <path>` overrides
  the bundle location within it.
- **Bundle resolution:** the bundle is `<cwd>/knowledge/` by default (the kb convention). If it
  exists, ingest/query/lint/viz operate on it. If it doesn't, Janet says so and offers
  `janet init` (kb-init) rather than guessing. `janet init` scaffolds `<cwd>/knowledge/`.
- **Whole-dir context:** the workspace `filesystem.basePath = projectPath`, so Janet can read the
  surrounding project (README, notes, local files) for ingest/schema inference, while writes stay
  within the bundle per the skills. (`allowedPaths` still adds the bundled-skills dir + tmp.)
- **Per-directory threads/history:** `resourceId` derived from the git remote if present, else the
  absolute cwd (mastracode's scheme) — so conversation continuity is per-project and shared across
  clones/worktrees of the same repo. Config is project-local `<cwd>/.agent-knowledge/` layered over
  global `~/.agent-knowledge/`.

### Agent + controller wiring

Wiring mirrors the **minimal viable subset** confirmed in `mastracode/sdk/src/index.ts`
(`bootLocalAgentController`) and `packages/core/src/agent-controller`:

- **storage.ts** — `new LibSQLStore({ url: 'file:<config>/threads.db' })` (`@mastra/libsql`); wrap in
  `MastraCompositeStore` for the controller (`AgentControllerConfig.storage` type). Config dir
  `~/.agent-knowledge/` (global) / `.agent-knowledge/` (project); `resourceId` from git remote or cwd.
- **model.ts / auth / onboarding** — the multi-provider model-selection subsystem. **See Part D**
  (filled in from mastracode research). The agent's `model:` is a *dynamic* function reading the
  session's current model id (set via `session.model.switch({ modelId })`), resolved through
  registered gateways; no hardcoded provider or default.
- **agent.ts** — `new Agent({ id:'janet', name:'Janet', instructions, model, memory, workspace })`
  (`@mastra/core/agent`). Instructions layer a **persona** over the procedures (which come from
  loading the `kb-*` skills). `new Memory({ storage })` (`@mastra/memory`); OM omitted.
  - **Janet's persona** (The Good Place): cheerful, warm, endlessly helpful, unfailingly polite,
    lightly literal/deadpan. Greets like "Hi there! I'm Janet." Frames herself as a repository of the
    bundle's knowledge ("I'm not a robot — I'm the thing that knows everything in your knowledge
    base"). Upbeat when confirming actions ("Filed! One new concept, two cross-links updated."),
    gently self-aware on errors rather than cold. Concise, never saccharine.
  - **Guardrail (critical):** the persona colors only the **conversational surface** — TUI chat,
    CLI/status/error messages, and headless summaries. It must **never** leak into bundle content:
    concepts, overviews, indexes, and `log.md` stay neutral, factual, and citation-grounded per the
    trust model, and source content remains **data, not instructions** (trust model §6). Persona is
    tone, not license to embellish the knowledge.
- **skills-paths.ts** — port `buildSkillPaths` + `collectSkillPaths` from
  `mastracode/sdk/src/agents/workspace.ts` (symlink-resolving; scans `.agents/skills`,
  `.claude/skills`, project & `~`). Append the **bundled** skills dir resolved absolutely via
  `import.meta.url`, and add it to `allowedPaths`. Order gives local (common-dir) precedence over the
  external bundled copy (Mastra tie-break: local > managed > external).
- **workspace.ts** — resolver `getWorkspace({ requestContext })` returning
  `new Workspace({ filesystem: new LocalFilesystem({ basePath: projectPath, allowedPaths }),
  sandbox: new LocalSandbox({ workingDirectory: projectPath }), tools, skills: skillPaths })`.
  `projectPath` = cwd (where `knowledge/` lives), read from controller state. **Trust-model
  enforcement via `tools` config**: `requireReadBeforeWrite: true` on `write_file`; `requireApproval`
  on write/delete/execute in interactive mode (auto-approved by headless policy).
- **controller.ts** — `new AgentController({ id:'agent-knowledge', storage, agent, stateSchema
  (projectPath, configDir, modelId), initialState, modes:[{id:'build',name:'Build',
  metadata:{default:true}}], workspace: getWorkspace })`; `await controller.init()` (builds internal
  Mastra) → `createSession()`. Skip `startWorkers()`, `wireSessionConcerns`, MCP/hooks/plugins/
  observability/subagents.

### Command surface (`main.ts` + `commands.ts`)

`main.ts` (`#!/usr/bin/env node`) dispatches like `mastracode/tui/src/main.ts`:
- no subcommand + TTY → **interactive TUI** (chat with Janet).
- `janet init | ingest <src…> | query "<q>" | lint [--fix] | viz [scope]` → build session, send a
  **directive message** telling Janet to load & follow the matching skill (`kb-init`/`kb-ingest`/
  `kb-query`/`kb-lint`/`kb-visualize`) against the target bundle (default `knowledge/`).
- `--print`/`-p`, or piped/non-TTY → **headless** (`headless/run.ts`): auto-approve policy, stream to
  stdout, exit on `agent_end`. Pattern from `mastracode/sdk/src/headless/`.
- `--help`/`-h`, `--version`.
- **Model controls**: interactive `/models`, `/login`, `/logout`, `/api-keys`, `/custom-providers`,
  `/setup`; headless `--model 'provider/model'` / `JANET_MODEL` (Part D). First interactive run with no
  configured provider launches the onboarding wizard; headless with no model exits non-zero.
- `janet lint` runs **kb-tools `checkConformance` in-process** (deterministic half, no tokens) then
  the agent for the drift audit — preserves determinism + CI-gateability.

### Clean TUI (`src/tui`)

Minimal pi-tui (`@earendil-works/pi-tui`) chat, reimplementing only the core the research identified:
`state.ts` (TUI + chat/editor/footer Containers + Editor), `layout.ts` (buildLayout), `events.ts`
(~8 event types: agent_start/end, message_start/update/end, tool_start/end, error), `render-scheduler.ts`
(80ms coalesce), `handlers/message.ts` (streaming markdown), spinner + one status line (shows current
model), theme. Consumes the agent via `session.subscribe(listener)` (serialized event queue) +
`session.sendMessage`. Plus a small **model/auth surface** (Part D): a model picker (`/models`), a
login dialog (`/login`), and the first-run onboarding wizard — rebuilt on pi-tui `SelectList`,
reusing mastracode's *flow logic* not its widgets. Drop the rest
(voice/browser/MCP/goals/plugins/OM/threads UI/@-autocomplete/subagents).

## Part D — Model selection, auth & onboarding (multi-provider, no default)

Replicates mastracode's model/auth subsystem; the auth layer is largely lifted (Apache-2.0 →
attribute in NOTICE). No hardcoded provider or default model — first run makes the user choose.

**OAuth posture (decided): mirror mastracode exactly.** Ship the same Claude Max OAuth flow
(Claude Code public client ID + `claudeCodeMiddleware` identity injection + required beta headers)
and Codex OAuth (Codex CLI client ID), with no extra ToS gating or disclaimers — same as
`mastracode@0.31.0` on npm. One deviation, matching mastracode's own practice: where mastracode
passes `originator: 'mastracode'` on Codex device auth, we pass `originator: 'janet'`. Accepted
risk: if a provider revokes third-party OAuth use, these providers break for all such tools at once;
API-key/Bedrock/Vertex paths are unaffected.

### Model resolution (`src/agent/model.ts`)

- Agent `model:` is a **dynamic function** `getDynamicModel({ requestContext })` (pattern:
  `mastracode/sdk/src/agents/model.ts:151`): reads the session's current model id
  (`ctx.session.modelId`) and calls `resolveModel(modelId)`. If none set → throw
  `"No model selected. Use /models (or --model) first."`.
- `resolveModel(modelId)` (pattern: `model.ts:74`): parse `providerId/bareModelId`; special-case
  `amazon-bedrock` → Bedrock gateway; special-case `vertex` → **new** Vertex gateway (see below);
  everything else → the custom gateway, which falls back to core's `ModelRouterLanguageModel`
  (models.dev registry) for Google Gemini + ~150 providers.
- Runtime switch: `session.model.switch({ modelId })`
  (`packages/core/src/agent-controller/session.ts:1494`), persisted per-mode.

### Gateways (registered `gateways: [bedrock, vertex, custom]` on the controller)

Core prepends its `defaultGateways` (Netlify, Mastra, **ModelsDev**), so models.dev is the catch-all.
- **Custom gateway** (reimplement patterns from `mastracode-gateway.ts`, don't lift — it's bound to
  `@mastra/core/llm`): dispatch by provider → `createAnthropic` (API key **or** Claude-Max OAuth via
  an OAuth `fetch` wrapper), `createOpenAI().responses()` (API key **or** Codex OAuth + `-codex` model
  remap), `createOpenAICompatible` (custom endpoints), fallback `ModelRouterLanguageModel`.
- **Bedrock gateway** — lift `hasAwsCredentials()` + `bedrockProvider()`
  (`mastracode/sdk/src/providers/amazon-bedrock-gateway.ts:22,60`): `createAmazonBedrock({ region,
  credentialProvider: fromNodeProviderChain() })`; `amazon-bedrock/<id>`; `AWS_REGION`,
  `AWS_BEARER_TOKEN_BEDROCK`. Deps `@ai-sdk/amazon-bedrock`, `@aws-sdk/credential-providers`.
- **Vertex gateway — NET-NEW (beyond mastracode; you specifically want it).** A small gateway
  modeled on the Bedrock one using `@ai-sdk/google-vertex` (`createVertex`) with ADC /
  service-account auth (`GOOGLE_APPLICATION_CREDENTIALS` or ambient ADC; `GOOGLE_VERTEX_PROJECT` /
  `GOOGLE_VERTEX_LOCATION`); model prefix `vertex/<model>`. (Plain Google **Gemini Developer API**
  via `GOOGLE_GENERATIVE_AI_API_KEY` already works through core's models-dev gateway — no new code.)

### Auth (`src/auth/` — lift from `mastracode/sdk/src/auth/`)

- **Verbatim** (zero coupling): `pkce.ts`, `authorization-input.ts`, `device-code.ts` (RFC-8628),
  `types.ts`, `providers/anthropic.ts` (paste-code PKCE, Claude Max), `providers/openai-codex.ts`
  (browser-callback **and** device modes, extracts `ChatGPT-Account-ID`). Optionally
  `providers/{xai,github-copilot}.ts`.
- **One-edit lift**: `AuthStorage` (`auth/storage.ts`) — swap `getAppDataDir` for our data-dir
  resolver. Gives `auth.json` (chmod `0600`), OAuth auto-refresh in `getApiKey()`, `apikey:<provider>`
  slots, env-fallback loading, and `PROVIDER_DEFAULT_MODELS`.
- **Reimplement (~40 lines/provider)**: the OAuth `fetch` wrappers (patterns:
  `providers/claude-max.ts:151`, `providers/openai-codex.ts:147`) — reload creds → `getApiKey()`
  (auto-refresh) → strip inbound auth headers → set `Authorization: Bearer` (+ `anthropic-beta`/
  `anthropic-version`, or `ChatGPT-Account-ID`/endpoint rewrite). **`claudeCodeMiddleware` identity
  injection (`claude-max.ts:54`) is REQUIRED for Anthropic Max OAuth** — copy it.
- Auth resolution shape: OAuth cred → `{ bearerToken: 'oauth' }` sentinel (real token injected by the
  fetch wrapper); else `{ apiKey }`; key order = stored api_key slot → env var (`resolveProviderAuth`,
  `mastracode-gateway.ts:314`).

### Onboarding & runtime selection (no default)

- **First-run wizard** (flow from `tui/src/tui/onboarding-inline.ts`, rebuilt on our TUI): steps
  welcome → **auth** (list OAuth providers + explicit "skip / use API keys or `/login` later"; nothing
  preselected) → **model pack** (build/plan/fast presets gated by reachable providers via
  `getAvailableModePacks(access)`, `onboarding/packs.ts:55`; warns but proceeds if none) → yolo → done.
  Drop the OM-pack step. Persist to `settings.json` (`applyOnboardingResult` field set:
  `onboarding.completedAt/version`, `models.activeModelPackId`, per-mode defaults). `ProviderAccess`
  derived live from `AuthStorage` + env (`buildProviderAccess`, `mastra-tui.ts:927`).
- **Interactive commands**: `/models` (picker from `controller.listAvailableModels()`,
  `agent-controller.ts:1206`), `/login`, `/logout`, `/api-keys`, `/custom-providers`, `/setup`.
- **Headless model selection**: `--model 'provider/model'` flag or `JANET_MODEL` env → `session.model
  .switch()` before the turn; if unset and no persisted selection, exit non-zero with the "select a
  model / run `janet` once to onboard, or set a provider env/credential" message (no silent default).
- **Storage locations**: `auth.json` + `settings.json` live in the **global** app-data dir
  (`~/.agent-knowledge/`), since credentials/model choice are machine-wide; threads DB stays keyed by
  per-dir `resourceId` (Part C).

## Dependencies (`packages/janet`)

`@mastra/core` (>=1.1.0 — workspace/skills/agent-controller), `@mastra/memory`, `@mastra/libsql`,
`ai`, `@earendil-works/pi-tui`, `zod`, `chalk`/`strip-ansi`.
Model providers (Part D): `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/openai-compatible`,
`@ai-sdk/amazon-bedrock` + `@aws-sdk/credential-providers` (Bedrock), `@ai-sdk/google-vertex`
(Vertex — net-new). Google Gemini Developer API needs no direct dep (core's models-dev gateway).
Dev: `tsup`, `tsx`, `typescript`, `esbuild` (kb-tools), `vitest`. `engines.node >=22`, `type: module`.

## Verification

1. **Parity**: `pnpm --filter kb-tools test` — TS conformance/graph output matches the Python
   originals on `knowledge/` (snapshot). Only after this is green in CI are the `.py` files deleted.
2. **Build**: `pnpm build` → `packages/janet/dist/main.js` exists; `build-skill-scripts.mjs`
   regenerates the committed `.mjs`; `git diff` shows them in sync (add a CI drift check).
3. **Deterministic lint**: `node packages/janet/dist/main.js lint` on `knowledge/` → 0 conformance
   errors (matches current state).
4. **Headless query**: `ANTHROPIC_API_KEY=… janet query "what is OKF?" --model anthropic/<model> -p`
   → cited answer from the bundle; exit 0. With no model + no persisted selection → exits non-zero
   with the "select a model" message (no silent default).
4b. **Provider matrix** (your machine): confirm a turn works via `--model` for `vertex/<model>` (ADC),
   `amazon-bedrock/<id>` (AWS chain), and Codex OAuth (`janet /login` → openai-codex); plus first-run
   `janet` onboarding lets you pick with nothing preselected.
5. **Ingest**: `janet ingest ./tmp/note.md -p` → new `type:Reference` + concept(s), index + `log.md`
   updated, per trust model.
6. **Viz**: `janet viz` → writes a self-contained `knowledge/viz.html`.
7. **TUI smoke**: `janet` opens the chat, one round-trip streams and renders.
8. **Skill layering**: works with only the bundled copy; then `npx skills add stjbrown/agent-knowledge`
   into `.agents/skills` and confirm the common-dir copy shadows the bundled one (and is shared with a
   host agent).
9. **Packaging**: `npm pack --dry-run` in `packages/janet` shows `dist/` + `skills/` shipped;
   `npx ./agent-knowledge-*.tgz lint` runs from the tarball, and a global install from the tarball
   exposes **both** `janet` and `ding` on PATH (same entry point).

## Phase 2 — Herdr integration (**native support ships with launch; upstream listing is a buzz lever**)

> Everything above is **Phase 1** (the `janet` agent). The **launch requirement** is only what we
> control in this repo: native `HERDR_PANE_ID` state reporting + `--thread` session restore, built and
> tested locally against a Herdr instance. This needs **no upstream PR** — native reporting works in
> any Herdr pane today. The **upstream contribution** (bundled installer + docs listing on
> herdr.dev) is explicitly *not* a launch requirement: it depends on Herdr maintainer coordination we
> don't control, and its release timing is a marketing call — ship with launch or hold as a follow-up
> "drop" for a second wave of attention alongside Claude Code, Codex, MastraCode, etc.

**Goal:** `janet` appears on <https://herdr.dev/docs/integrations/> as a first-class agent, installable
via `herdr integration install janet`, at the **highest tier** (lifecycle authority + native session
restore). Herdr = a terminal multiplexer for coding agents ("one terminal, the whole herd").

**Template:** the **MastraCode** integration — janet is Mastra/`AgentController`-based, so it maps
1:1. MastraCode: a hook in `~/.mastracode/hooks.json` + `hooks/herdr-agent-state.sh` reports
lifecycle state + thread identity (no screen-manifest fallback — the hook is authoritative), and
Herdr resumes with `mastracode --thread <id>`.

**Launch-blocking (janet side, this repo — no upstream dependency):**

- **Lifecycle reporting (native):** when running inside a Herdr pane (detect `HERDR_PANE_ID` /
  `HERDR_ENV`), map `AgentController` events to Herdr state — `agent_start` → `working`,
  `agent_end` → `idle`, tool-approval/suspension → `blocked` — and call
  `herdr pane report-agent "$HERDR_PANE_ID" --source janet --agent janet --state <state>` directly
  from janet's event subscription. We own the loop, so no hook file is needed.
- **Session restore** — add a `janet --thread <id>` (or `--resume <id>`) flag so Herdr can
  reattach a pane after a server restart. Piggybacks on Phase 1's per-dir thread identity
  (`resourceId` + libSQL threads). **Phase 1 dependency:** ensure the thread id is stable, exposed,
  and resumable.
- Report the thread id on session start so Herdr can store the native reference.

**Follow-up, not launch-blocking (Herdr side, upstream contribution):** submit a bundled `janet`
integration (hook script mirroring MastraCode's `herdr-agent-state.sh` + docs entry) so
`herdr integration install janet` works and janet is documented + version-tracked
(`herdr integration status`). This is the piece that yields the public listing/publicity; it requires
Herdr maintainer coordination, so it is best-effort by launch and its announcement timing is a
marketing call.

**Verification (launch-blocking items only):**
- Run `janet` inside a Herdr pane → pane shows `working` during a turn, `blocked` on approval, `idle`
  when done (`herdr agent list`, `herdr pane read`) — via native `HERDR_PANE_ID` reporting alone,
  no hook installed.
- Restart the Herdr server → pane restores via `janet --thread <id>`.
- (Upstream, when it lands: `herdr integration install janet` writes the hook;
  `herdr integration status` shows janet + version.)

**Notes:** the local `herdr` CLI + socket API (`herdr pane report-agent` / `report-metadata`) is the
integration surface; a Herdr instance is needed to test the launch-blocking items locally.

## Notes / risks to confirm during implementation

- How the Mastra sandbox exposes the skill dir path to `execute_command` for the `.mjs` scripts
  (vs Claude Code's `${CLAUDE_SKILL_DIR}`) — keep SKILL.md host-neutral.
- `MastraCompositeStore` vs bare `LibSQLStore` for the controller's `storage` field (type wants
  composite) — confirm the minimal wrap.
  - **RESOLVED:** `LibSQLStore extends MastraCompositeStore` — pass it directly, no wrap.
- **Vertex gateway is net-new** (mastracode has no Vertex): validate `@ai-sdk/google-vertex` +
  ADC/service-account auth end-to-end; it's the one provider without a proven mastracode reference.
  - **RESOLVED (E2E-verified):** Claude models route via `@ai-sdk/google-vertex/anthropic`
    (`createVertexAnthropic`), Gemini via `createVertex`; ADC just works. Full cited kb-query
    answers confirmed for BOTH `vertex/claude-opus-4-1` and `vertex/claude-opus-4-8`.
  - **Region matters:** newest Claude models (opus-4-8) are served from the `global` endpoint,
    not regional ones like `us-east5` (which 404/quota-fail for 4.8). The AI SDK special-cases
    `location: "global"` to the region-less `aiplatform.googleapis.com` host, so janet defaults
    `GOOGLE_VERTEX_LOCATION` to `global`; override via env for region-pinned deployments.

### Hard-won implementation findings (Mastra 1.51.0)

- **Workspace `skills` paths must be RELATIVE to the workspace root** — absolute paths are
  rejected ("path is outside the workspace"). Janet symlinks the npm-bundled kb-* skill dirs into
  `<project>/.agent-knowledge/skills/` and configures `skills: [".agent-knowledge/skills"]`;
  symlink targets go in `LocalFilesystem.allowedPaths`. A real (non-symlink) dir there is left
  alone, so a user's `npx skills add` copy shadows the bundled one.
- **`state.yolo === true` is the session-wide auto-approve gate** (core reads it directly). It
  must be part of the controller `stateSchema` + `initialState`. Without it every tool call
  suspends for approval, and resume-per-tool degrades the run (identical-message loops until max
  output length). Headless sets `yolo: true`; interactive keeps approvals.
- Headless approval backstop uses `session.respondToToolApproval({ decision: "approve" })`
  (mastracode's API), not `approveToolCall`.
- Version pins matter: match mastracode's known-good set (`ai@^6`, `@ai-sdk/*@^3`), NOT latest
  (`ai@7`/`@ai-sdk/*@4` are a provider-spec major ahead of core).
- Agent must be constructed with the workspace (agent-level `workspace:`) — the controller's
  `workspace:` resolver alone doesn't feed `agent.resolveSkills()`, so skill tools never wire.
- **Anthropic Max OAuth** requires the `claudeCodeMiddleware` system-identity injection — without it
  requests are rejected. **Codex OAuth** needs the `-codex` model remap + `ChatGPT-Account-ID` header.
- **Licensing**: lifted `auth/` files are Apache-2.0 from mastracode — record in `NOTICE`.
- Model/provider scope grows the build beyond a "lean" agent (adds gateways + auth + onboarding), but
  still excludes browser/voice/MCP/goals/plugins/OM/web. **Confirmed as intended scope**, including
  the mastracode-parity OAuth posture (see Part D).
