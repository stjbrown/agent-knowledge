---
type: Spec Section
title: Conventions
description: Folder taxonomy and ingest/maintenance conventions for this bundle.
tags: [schema, meta]
timestamp: 2026-01-01T00:00:00Z
---

# Conventions

How this bundle is structured and maintained. The `kb-*` skills read this to fit themselves to the
domain.

## Folder taxonomy

- `concepts/` — the domain entities (`customer`, `order`).
- `spec/` — this schema layer ([types](types.md) + conventions).
- `references/` — mirrored external sources as `type: Reference` concepts (none yet).

## Naming

Lowercase, underscores for multi-word filenames. A concept's filename is its identity; keep it
stable (supersede rather than rename when meaning changes).

## Ingest routing

When ingesting a source, extract entities and route them: people → `concepts/` as `customer`;
purchases → `concepts/` as `order`; the source document itself → `references/` as `Reference`, cited
by whatever it supports.

## Maintenance

Follow the trust model (see the `kb` skill's `references/trust-model.md`): append-only on meaning,
supersede with provenance, `conflicts_with` over silent overwrite, events additive, every change
logged. Keep each directory's `index.md` current; regenerate any `_overview` after its children
change.
