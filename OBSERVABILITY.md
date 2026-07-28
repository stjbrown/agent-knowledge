# Janet observability design

## Goals

Janet is a local CLI agent, not a web application. Observability therefore belongs in the CLI
runtime and must not require Mastra Studio, a Mastra development server, or any other always-on
Janet process.

The foundation has five constraints:

1. Tracing is strictly off by default.
2. Metadata-only capture is the recommended mode.
3. Local inspection works without a collector.
4. Remote export uses standard OTLP so Phoenix is the first supported backend, not the only one.
5. Secrets come from the process environment and are never written to Janet settings.

## Runtime architecture

Each interactive or headless Janet process creates one observability runtime during controller
startup:

```text
session.sendMessage
  -> Mastra tracing options
  -> Mastra Observability
     -> local Mastra storage exporter -> ~/.agent-knowledge/observability.db
     -> generic OTLP exporter         -> Phoenix or another OTLP backend
```

No observability object or exporter is constructed while capture is off. The ordinary
`threads.db` continues to hold Janet thread history. Local traces use a separate
`observability.db`, routed through Mastra composite storage, with a seven-day default retention
window.

Completed spans are flushed before Janet destroys its controller. Export and pruning failures are
best effort and must not turn a successful Janet response into a failed response.

## Capture modes

| Mode | Captured | Excluded |
|---|---|---|
| `off` | Nothing | All spans and exports |
| `metadata` | Timing, hierarchy, model and tool identity, token usage, status, and errors | Prompts, responses, tool arguments, and tool results |
| `full` | Metadata plus prompt, response, and tool payload content | Nothing beyond Mastra's sensitive-data filtering and serialization limits |

Full capture requires a second explicit confirmation in the TUI. Both captured modes exclude
streaming model-chunk spans and cap serialized string, object, array, and nesting sizes.

Project identity is represented by Janet's existing hashed resource ID. Settings and status output
never show authentication headers. Endpoint status output strips credentials, query parameters,
and fragments.

## Destinations

### Local history

Local history uses Mastra's storage exporter and libSQL. `/traces` lists recent root traces and
renders their agent, model, and tool hierarchy without printing captured payloads.

### Phoenix

Phoenix uses the same generic OTLP/HTTP protobuf path as any other compatible collector. Janet
adds the Phoenix project name as both an OpenInference resource attribute and the
`x-project-name` request header. A base collector endpoint such as `http://localhost:6006` is
normalized by Mastra's OTLP exporter to `/v1/traces`.

Phoenix runs separately from Janet. Follow the
[Phoenix local deployment documentation](https://arize.com/docs/phoenix) to run its collector and
UI.

### Custom OTLP

Custom OTLP accepts any HTTP or HTTPS base endpoint compatible with OTLP/HTTP protobuf. Credentials
and vendor headers use the standard `OTEL_EXPORTER_OTLP_HEADERS` environment variable. This keeps
the runtime backend-neutral and avoids storing secrets or adding vendor-specific code to Janet.

## Configuration

The TUI is the primary interactive setup:

```text
/observability
/observability status
/observability off
/traces
```

The TUI persists only nonsecret preferences in `~/.agent-knowledge/settings.json`. Changes apply
after restart so a process never has two competing observability lifecycles.

Environment variables override saved settings for headless runs and automation:

| Variable | Purpose |
|---|---|
| `JANET_OBSERVABILITY` | `off`, `metadata`, or `full` |
| `JANET_OBSERVABILITY_BACKEND` | `local`, `phoenix`, or `otlp` |
| `JANET_OBSERVABILITY_SAMPLE_RATE` | Number from `0` through `1` |
| `PHOENIX_COLLECTOR_ENDPOINT` | Phoenix base collector endpoint |
| `PHOENIX_PROJECT_NAME` | Phoenix project, default `janet` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Generic OTLP base endpoint |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Trace-specific OTLP endpoint |
| `OTEL_EXPORTER_OTLP_HEADERS` | Runtime-only comma-separated headers |

Precedence is:

1. Janet environment overrides
2. Saved Janet settings
3. Strictly off defaults

Standard `OTEL_*` variables can configure an explicitly enabled run, but cannot enable tracing by
themselves. Janet does not automatically load a project `.env`.

## Cancellation

Cancellation is part of the observability foundation because a trace is not useful if a runaway
turn cannot be stopped. Keyboard handling is global rather than tied to the focused editor:

- Esc or the first Ctrl+C calls `session.abort()` for an active turn.
- A second Ctrl+C within the double-press window force exits if abort is not completing.
- `/cancel` uses the same active-turn abort path.
- A single idle Ctrl+C clears editor input or shows the exit hint; a second exits Janet.

## Verification

The automated suite covers:

- default-off resolution even when standard OTEL variables exist
- metadata and full privacy flags
- malformed and missing configuration
- separate local trace storage
- local trace persistence and concurrent Janet processes
- content-free local trace rendering
- global cancellation and force-exit behavior
- endpoint and header redaction

An opt-in integration test opens a temporary local collector and verifies a nonempty
Phoenix-compatible protobuf request, `/v1/traces`, and `x-project-name`:

```bash
JANET_OTLP_INTEGRATION=1 \
corepack pnpm --filter @stjbrown/agent-knowledge \
  exec vitest run test/observability-runtime.test.ts
```

The release test plan in [`TESTING.md`](./TESTING.md) adds a real TUI, Phoenix UI, and clean-install
pass.

## Evals roadmap

Tracing comes first because it supplies the run records needed to design useful evals. The next
layer should remain backend-neutral:

1. Define a small Janet evaluator interface over completed run records.
2. Start with deterministic checks already owned by this project: OKF conformance, citation
   integrity, expected file changes, repeated tool attempts, and successful cancellation.
3. Store evaluator name, version, score, label, and explanation as trace metadata or linked score
   records.
4. Add a fixture corpus for init, ingest, query, lint, and failure-recovery scenarios.
5. Add optional model-graded evaluators only after the deterministic baseline is stable.
6. Export the same results to Phoenix or another backend without changing evaluator logic.

Tool extensibility is intentionally a separate follow-up. Traces should tell us which capabilities
Janet lacks before the project commits to a tool-provider interface or bundled defaults.
