---
type: Spec Section
title: "OKF §10 — Attested Computations"
description: A concept type that carries not just what a value means but a sanctioned way to compute it, so a consumer can confirm the agent ran the blessed computation rather than improvising.
tags: [okf, spec, attested-computation, trust, provenance]
timestamp: 2026-07-31
---

# Attested Computations

OKF v0.2 (§10) introduces the **`type: Attested Computation`** concept: it carries not
just what a value *means* but a sanctioned way to *compute* it, so a consumer can
confirm the agent ran the blessed computation instead of improvising its own.
[Provenance](./citations.md) (§5.1) answers "where did this claim come from";
attestation answers "was this number produced the way we said it must be." **OKF records
the computation and the means to check it; it does not execute anything itself.**

> **New in v0.2.** This concept type, its contract fields, and the verification-vs-
> attestation distinction are all new. A v0.1 bundle simply has no Attested Computation
> concepts.

## §10.1 A computation is its own concept

A sanctioned computation is a standalone concept; a concept that needs the value (a
`Metric`, a `BigQuery Table`) links to it with a normal markdown link (§6). Three
properties motivate the standalone concept:

* **`runtime` defines what `parameters` mean** — a parameter is a SQL bind variable, a
  dbt var, or a Python argument depending on `runtime`, so keeping them together makes
  the binding semantics self-evident.
* **One computation, many consumers** — referenced once and reused across a metric, a
  dashboard concept, and a report.
* **Trust state is per computation** — `verified`, `stale_after`, and a single
  `attester` describe one thing; revenue, profit, and margin each verify and attest
  independently.

## §10.2 Contract fields

In addition to the [provenance/trust/lifecycle](./provenance_trust_lifecycle.md) families
(§5), an Attested Computation concept carries:

* **`runtime`** — REQUIRED. Says how to run the computation and what `parameters` mean.
  Examples: `bigquery`, `postgres`, `dbt`, `python`, `Looker`.
* **`parameters`** — a list of typed, named holes the agent may fill, each
  `{ name, type, required }`.
* **`computation`** — optional path (§6.2) to a file holding the computation, used
  instead of an inline body fence. Absent ⇒ the body `# Computation` fence is the
  computation.
* **`executor`** — how it is run. `resource` names run instructions or code; `receipt`
  declares the fields a run must return (e.g. a BigQuery `job_id` and the SQL actually
  executed).
* **`attester`** — the deterministic check. `resource` names code (no LLM) that takes a
  receipt and returns a verdict, meant to run consumer-side.

What sits behind a `resource` (a Skill, a script, a container) is a packaging choice;
OKF fixes the interface, not the packaging.

## §10.3 The computation — inline or file

Provide it either as a single fenced code block under `# Computation` (best for a short
computation reviewed alongside the contract), or by setting `computation` to a path and
omitting the body fence (best for a long/generated computation shared with non-OKF
tooling). The agent MAY only supply *values* for the declared `parameters`; it **MUST
NOT** author or edit the computation. Because the [attester](#§105-how-a-consumer-uses-it)
compares on the expanded, compiled artifact the receipt carries (`executed_sql`,
`compiled_sql`), a rewritten query, a swapped computation file, or a mutated dependency
fails the check — making "did the sanctioned thing run" a mechanical comparison rather
than a judgement call.

## §10.4 Concepts that use a computation

A readable concept (e.g. an income-statement overview discussing revenue, profit, and
margin) stays one concept and links to **one Attested Computation per figure**. Because
each computation is its own concept, revenue can be fresh while profit is past its
`stale_after`, and each attests on its own run.

## §10.5 How a consumer uses it (informative)

Runtime artifacts below are **not** stored in the bundle:

1. **Discover** via `type: Attested Computation` (liftable into `index.md`).
2. **Load** the contract from frontmatter and the computation from the body or file.
3. **Parameterize** — the agent supplies values for the declared parameters.
4. **Execute** — the executor runs the bound computation, returning a receipt shaped by
   `executor.receipt`.
5. **Attest** — the consumer runs the attester over the receipt, confirming provenance
   (the computation that ran equals `computation` bound with the claimed parameters, not
   agent-authored SQL) and fidelity (the displayed value matches the receipt's source,
   re-read by job id).
6. **Gate** — refuse to display a failing attestation; warn or refuse when
   `today >= stale_after`; surface the verdict on success so trust is visible.

## §10.6 Verification versus attestation

Both exist and are distinct:

* **`verified`** (§5.2) confirms the *definition* still matches policy — doc-level,
  slow, recorded in the bundle.
* **Attestation** confirms a single *run* produced the value the sanctioned way —
  per-call, runtime, **not** stored in the bundle.

A concept with a stale definition can still attest cleanly, and a freshly-verified
definition still requires attestation on each run — which is why both are needed.

# Citations

1. [OKF Specification (SPEC.md)](../references/okf_spec.md)
