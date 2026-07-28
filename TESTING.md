# Janet pre-release testing

This guide is the release-candidate test plan for Janet. It covers building from the public
`janet-agent` branch, sharing an installable package with another laptop, testing authentication and
the model runtime, and recording results without exposing credentials.

Preview releases are published to npm under the `next` tag. Use
`npx @stjbrown/agent-knowledge@next` for a registry installation test. Use a branch checkout or the
tarball produced from that checkout when testing an unpublished candidate or reproducing the exact
contents of a release.

## Minimum release gate

Complete these checks before promoting Janet to npm's `latest` tag and announcing the public
release:

- [ ] Test on at least two laptops or clean user environments.
- [ ] Build and verify the package from a clean `janet-agent` checkout.
- [ ] Install only the resulting tarball on the second machine; do not run Janet from the source
  tree there.
- [ ] Complete OpenAI browser OAuth on one machine and device OAuth on the other.
- [ ] Confirm OAuth persists after Janet exits and restarts.
- [ ] Complete one full lifecycle: initialize, ingest, query with citations, lint, and visualize.
- [ ] Confirm ordinary skill loading, questions, reads, and edits do not display approval gates.
- [ ] Confirm shell execution still asks for approval and headless mode remains fail closed.
- [ ] Confirm Esc, Ctrl+C, and `/cancel` stop an active run without exiting Janet.
- [ ] Confirm observability is off by default with no trace database or OTLP requests.
- [ ] Test metadata-only local tracing and one Phoenix or custom OTLP export.
- [ ] Record the commit, package checksum, environment, provider, and result for each run.

Anthropic OAuth, an API-key provider, and Bedrock are valuable additional coverage but do not need
to block the preview if they are clearly described as experimental or unverified.

## Share the branch

The branch is public at:

<https://github.com/stjbrown/agent-knowledge/tree/janet-agent>

A developer can build it directly:

```bash
git clone --branch janet-agent --single-branch https://github.com/stjbrown/agent-knowledge.git
cd agent-knowledge

node --version
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm pack:janet
```

Node.js 22.13 or newer is required. `pack:janet` builds the workspace, typechecks Janet, runs all tests,
checks the in-repo OKF bundle, regenerates the standalone skill scripts, and creates:

```text
artifacts/stjbrown-agent-knowledge-0.1.0-beta.6.tgz
```

Before sharing it, record the source revision and checksum:

```bash
git rev-parse HEAD
shasum -a 256 artifacts/stjbrown-agent-knowledge-0.1.0-beta.6.tgz
git status --short
```

The working tree should be clean after packaging. Share the tarball and its checksum together using
your normal file-sharing channel. The recipient needs Node.js 22.13 or newer, but does not need pnpm or
the source repository.

## Install the shared tarball

### Isolated installation (recommended for testing)

This keeps the package installation itself in a temporary directory:

```bash
JANET_INSTALL_DIR="$(mktemp -d /tmp/janet-install.XXXXXX)"
npm install \
  --cache "$JANET_INSTALL_DIR/npm-cache" \
  --prefix "$JANET_INSTALL_DIR" \
  /path/to/stjbrown-agent-knowledge-0.1.0-beta.6.tgz

"$JANET_INSTALL_DIR/node_modules/.bin/janet" --version
"$JANET_INSTALL_DIR/node_modules/.bin/ding" --help
```

Create a separate disposable project so Janet is not accidentally tested against this repository:

```bash
JANET_PROJECT_DIR="$(mktemp -d /tmp/janet-project.XXXXXX)"
"$JANET_INSTALL_DIR/node_modules/.bin/janet" -C "$JANET_PROJECT_DIR"
```

Keep those two paths in the same terminal session. A new shell will not retain the variables.

### Global installation (optional convenience check)

```bash
JANET_NPM_CACHE="$(mktemp -d /tmp/janet-npm-cache.XXXXXX)"
npm install \
  --cache "$JANET_NPM_CACHE" \
  --global \
  /path/to/stjbrown-agent-knowledge-0.1.0-beta.6.tgz
janet --version
ding --help
```

Do not use `sudo npm install`. If the global npm prefix is not writable, use the isolated method.

## Test matrix

### 1. Startup and first-run behavior

- Run `janet --version` and `janet --help` from the installed package.
- Start Janet in an empty project.
- Confirm the displayed knowledge path points inside that project.
- Run `/auth`; a new machine should report no stored credentials.
- Run `/help` and verify the documented commands render correctly.

### 2. OpenAI OAuth and models

On laptop A:

```text
/login openai-codex browser
```

On laptop B:

```text
/login openai-codex device
```

After authorization:

```text
/auth
/models
```

Expected results:

- `/auth` reports `openai-codex: OAuth (subscription)`.
- The picker offers GPT-5.6 Sol, Terra, and Luna, plus supported earlier tiers.
- Selecting Sol displays `openai/gpt-5.6-sol`.
- `/model gpt-5.6-sol` also normalizes to `openai/gpt-5.6-sol`.
- A simple message receives a real response.

Exit Janet, launch it again in the same project, run `/auth`, and send another message. Login and
the model selection should persist without another authorization flow.

### 3. Permissions and interaction

Send:

```text
Can you start a new wiki for me?
```

Expected results:

- `skill` runs without an approval prompt.
- `ask_user` displays the actual setup question without a separate approval prompt.
- Workspace reads and writes do not ask for approval in the interactive session.
- A proposed shell command does ask for approval.
- Choosing `n` declines it; choosing `a` grants that category only for the current session.

Start a long-running request and cancel it three separate times:

1. Press Esc.
2. Press Ctrl+C.
3. Enter `/cancel`.

Each should stop the active turn, remove the spinner, and leave Janet ready for another message.
Pressing Ctrl+C twice in quick succession should still exit Janet.

### 4. Complete wiki lifecycle

Use a small source document containing several concrete facts and a date.

1. Initialize the bundle through conversation or `janet init`.
2. Ingest the source with `janet ingest /path/to/source.md`.
3. Ask a question whose answer requires the source.
4. Verify the response cites bundle concepts or source provenance rather than inventing support.
5. Run `janet lint`; the bundle should be conformant.
6. Run `janet viz`; verify the generated graph opens and contains the new concepts.
7. Restart Janet in the same project and confirm the conversation and bundle remain usable.

Also run the deterministic lint without a model:

```bash
"$JANET_INSTALL_DIR/node_modules/.bin/janet" -C "$JANET_PROJECT_DIR" lint
```

Introduce one deliberate conformance error in the disposable bundle and confirm `janet lint` exits
non-zero. Restore the file afterward and confirm it returns to zero.

### 5. Headless boundaries

Run a read-only query:

```bash
"$JANET_INSTALL_DIR/node_modules/.bin/janet" \
  -C "$JANET_PROJECT_DIR" \
  --model openai/gpt-5.6-sol \
  query "Summarize the bundle with citations" \
  --print
```

Confirm it completes without an approval prompt and does not modify the bundle. Then verify that a
task requiring a shell command is denied unless `--allow-exec` is passed deliberately.

### 6. Project isolation

Create a second disposable project and start Janet there. Confirm that:

- It uses a different knowledge bundle and conversation thread.
- It does not expose the first project's files through workspace tools.
- The machine-wide OAuth credential remains available, as intended.

### 7. Observability and privacy

Before enabling anything:

- Run `/observability status`; active and saved state should both report `off`.
- Confirm `~/.agent-knowledge/observability.db` is not created by an off-mode run.
- Set `OTEL_EXPORTER_OTLP_ENDPOINT` by itself and confirm tracing remains off.

Then run `/observability`, select **Local trace history**, and select **Metadata only**. Restart
Janet as instructed, send a message that causes at least one tool call, and run `/traces`.

Expected results:

- The TUI status includes `trace:metadata`.
- `/traces` shows the agent, model, and tool hierarchy.
- The separate `observability.db` file exists.
- Trace metadata does not contain prompt text, response text, tool arguments, tool results,
  absolute project paths, OAuth URLs, or credentials.
- Export or storage failure does not interrupt Janet's response.

For Phoenix, start Phoenix separately using its official local deployment instructions. Select
**Phoenix** in `/observability`, restart Janet, and complete a tool-using turn. Confirm Phoenix
shows one root agent trace with model and tool children under the `janet` project.

The protocol-level integration test can be run without Phoenix. It opens a temporary localhost
receiver and verifies the OTLP protobuf path, payload, and Phoenix project header:

```bash
JANET_OTLP_INTEGRATION=1 \
corepack pnpm --filter @stjbrown/agent-knowledge \
  exec vitest run test/observability-runtime.test.ts
```

For headless OTLP configuration, run:

```bash
JANET_OBSERVABILITY=metadata \
JANET_OBSERVABILITY_BACKEND=otlp \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
"$JANET_INSTALL_DIR/node_modules/.bin/janet" \
  -C "$JANET_PROJECT_DIR" \
  query "Summarize the bundle with citations" \
  --print
```

After testing, use `/observability off`, restart Janet, and confirm no additional traces are
recorded or exported.

## Additional provider coverage

Record these independently so one provider failure does not obscure the core workflow:

| Provider path | Suggested check | Current release status |
| --- | --- | --- |
| OpenAI ChatGPT/Codex browser OAuth | Login, model response, restart | Required |
| OpenAI ChatGPT/Codex device OAuth | Login on a second laptop, model response | Required |
| Anthropic subscription OAuth | Login, Claude response, restart | Desired |
| OpenAI, Anthropic, or Gemini API key | First-run picker and response | Desired |
| Google Vertex ADC | Claude or Gemini response | Optional |
| Amazon Bedrock credential chain | Claude response and one tool call | Optional |

## Record results

Copy this block for every machine/provider combination:

```text
Date:
Tester:
Commit SHA:
Tarball SHA-256:
OS and version:
Architecture:
Node version:
Install method: isolated | global | branch checkout
Provider/auth mode:
Model selected:

Startup/help: PASS | FAIL
OAuth or API-key login: PASS | FAIL
Model response: PASS | FAIL
Permission behavior: PASS | FAIL
Init: PASS | FAIL
Ingest: PASS | FAIL
Query/citations: PASS | FAIL
Lint and exit codes: PASS | FAIL
Visualization: PASS | FAIL
Restart persistence: PASS | FAIL
Project isolation: PASS | FAIL
Active-run cancellation: PASS | FAIL
Default-off observability: PASS | FAIL
Local metadata tracing: PASS | FAIL
Phoenix/custom OTLP tracing: PASS | FAIL

Notes:
Reproduction steps for failures:
```

Classify failures as:

- **Blocker:** installation, authentication, model response, data loss, workspace escape, credential
  exposure, or a broken core lifecycle step.
- **Important:** confusing onboarding, incorrect approvals, persistence problems, or unreliable
  output that has a workaround.
- **Polish:** wording, colors, spacing, or minor interaction friction.

## Credential safety

Janet stores her own credentials in `~/.agent-knowledge/auth.json` with file mode `0600`. Never share
that file, its contents, authorization codes, full OAuth URLs, access tokens, refresh tokens, API
keys, or credential-bearing debug logs in an issue or screenshot. Redact account names and project
identifiers when they are not relevant.

Use `/logout openai-codex` or `/logout anthropic` to remove a provider credential through Janet.
Do not delete the whole `.agent-knowledge` directory merely to reset one provider; it also contains
settings and conversation storage.

## Registry preview installation

Run one final clean-machine check using the registry rather than a local tarball:

```bash
npx --yes @stjbrown/agent-knowledge@next --version
npx --yes @stjbrown/agent-knowledge@next
```

This is the only install behavior the tarball workflow cannot validate before publication.
