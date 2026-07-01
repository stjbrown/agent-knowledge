---
type: Reference
title: okf-skills (scaccogatto)
description: A Claude Code-native OKF toolchain — okf/validate/visualize skills plus a plugin and skills.sh distribution, driven by the verbatim spec with a deterministic conformance checker. The closest direct competitor to this project.
resource: https://github.com/scaccogatto/okf-skills
tags: [ecosystem, featured, okf-native, competitor, claude-code, skills]
timestamp: 2026-07-01
---

# okf-skills (scaccogatto)

`scaccogatto/okf-skills` (~21★) is *"the OKF toolkit for Claude Code — author, maintain, validate &
visualize Open Knowledge Format bundles."* It is the **closest direct competitor** to what this
project set out to build: portable, OKF-conformant agent skills. Studying it carefully is worth
more than any other entry in the [ecosystem](./landscape.md).

## What it ships

Three skills, distributed both as a **Claude Code plugin** (`.claude-plugin/marketplace.json`) and
via **skills.sh** (`skills/<name>/SKILL.md`) so it works across Cursor, Codex, and 20+ agents:

* **`okf`** — produce / maintain / consume bundles, applying the spec and templates. Auto-triggers
  when a repo already contains an OKF bundle.
* **`validate`** — a *deterministic* §9 [conformance](../spec/conformance.md) check, not an
  eyeball pass. Backed by a standalone `okf_validate.py` (zero-config via `uv` / PEP 723 + PyYAML).
* **`visualize`** — renders a bundle to a self-contained interactive `viz.html` (Cytoscape + marked
  via CDN), mirroring the [reference agent's](../references/okf_readme.md) visualizer.

It vendors the **OKF v0.1 [spec](../spec/index.md) verbatim** (`skills/okf/reference/SPEC.md`) as the
skill's source of truth, ships `templates/` (concept, index, log) and a `CLAUDE-okf.md` snippet that
turns on automatic consume/maintain in a host project.

## Ideas worth stealing

* **Dogfooding via a self-graph.** The repo documents *itself* in OKF under `.okf/` (with an
  `.okf/decisions/` directory of architecture-decision concepts) and CI validates that bundle on
  every push. This is exactly our [dogfooding](../index.md) instinct, taken further with a decisions
  log and CI enforcement — we should add both.
* **Deterministic validation as a first-class skill.** Rather than trust the model to self-check,
  a real script enforces §9. Our [lint](../operations/lint.md) design should include a deterministic
  conformance pass distinct from the fuzzy drift checks.
* **Dual distribution (plugin + skills.sh).** One repo, two install layouts, scripts referenced via
  `${CLAUDE_SKILL_DIR}` so they work in either path. A concrete answer to the "how do we distribute
  portable skills" question.
* **Positioning table** — it frames OKF as *complementary* to `CLAUDE.md` (how to behave),
  auto-memory (what the agent picked up), and wikis (human docs): OKF is *what the team knows*.
  A clean articulation we should adopt.

## Relevance to us

This project overlaps heavily with okf-skills. Rather than duplicate it, our differentiators should
be deliberate: the [three-layer schema seam](../concepts/three_layer_architecture.md#3-the-schema) for
domain portability, the [LLM-Wiki trust model](./critiques.md) (append-only / supersede /
`conflicts_with`) as default maintenance behavior, and the incremental
[ingest](../operations/ingest.md)-from-raw-sources workflow (okf-skills leans toward *authoring* and
*validating* bundles; the living-wiki ingest loop is where we can add value). We should read its
`okf` SKILL.md closely before finalizing ours.

# Citations

1. okf-skills — <https://github.com/scaccogatto/okf-skills>
