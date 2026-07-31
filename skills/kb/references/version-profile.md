# OKF version profile

The `kb-*` skills **produce OKF v0.2 by default** and consume both v0.2 and legacy v0.1 bundles.
Read the bundle-root `index.md` before writing:

1. `okf_version: "0.2"` → use the v0.2 producer profile below.
2. `okf_version: "0.1"` → preserve the v0.1 profile unless the user asks to migrate it.
3. No declaration → infer the established profile from existing concepts. `generated`/structured
   `sources` indicate v0.2; `timestamp`/`# Citations` indicate v0.1. For a new or empty bundle, use
   v0.2. If a populated bundle is genuinely mixed and the intended write profile is unclear, ask
   once rather than adding another accidental dialect.

Never rewrite untouched concepts merely to normalize their version. A deliberate migration is a
separate, bundle-wide operation with validation before and after.

## Bundle-wide migration preflight

Before planning or performing any format-version or lifecycle migration, load `kb-lint` and run its
bundled frontmatter-aware inventory:

```
node "<kb-lint-skill-dir>/scripts/conformance.mjs" <bundle-dir> --inventory --json
```

Treat that parsed inventory as the source of truth for **active metadata**. An absent observation
means zero. Do not classify frontmatter with repository-wide grep or text search: prose, historical
notes, and fenced YAML examples can contain field names and lifecycle values that are not active
metadata. Text search may support a later prose review, but it must not override the parsed
inventory.

Account for every non-reserved concept and every observed top-level key before proposing the
migration. Preserve unknown keys unless the target specification explicitly replaces them. Do not
change the root `okf_version` until every concept has an explicit mapping and any inventory parse
errors are resolved. After migration, rerun both the inventory and conformance modes; verify the
target fields and lifecycle values, zero unintended legacy active fields, preserved extensions, and
the expected concept count.

**Completion criterion:** the plan cites the parsed preflight counts and affected paths; the finished
migration cites matching postflight counts plus a clean conformance result.

## v0.2 producer profile

For every new concept and every meaningful content change:

- Record production with `generated: { by, at }`. `by` follows the actor convention:
  `<producer>/<version>` for an agent/tool, `human:<id>` for human-authored content, or
  `process:<id>` for an automated process. Never attribute agent-authored content to the user.
- `generated.at` is the ISO 8601 datetime of the last meaningful content change. A metadata-only
  link or formatting fix does not advance it.
- Record provenance as structured `sources`. Every entry has `resource`; add a stable `id` when a
  body claim cites it. Optional `title`, `author`, `usage_count`, `last_modified`, and
  `usage_window` are included only when evidenced.
- Attribute specific claims with markdown footnotes whose labels exactly match `sources[].id`.
  Do not create a new v0.2 `# Citations` list.
- Omitted `status` means `stable`. Use only `draft`, `stable`, or `deprecated`; use
  `stale_after: YYYY-MM-DD` only when the source or schema establishes a real freshness boundary.
- Add `verified` only for an actual verification event against the source/resource. Generation,
  user approval to proceed, and conversational agreement are not verification.
- Preserve unknown extension keys. The trust model's `supersedes`, `superseded_by`, and
  `conflicts_with` remain producer extensions, not OKF fields.

An absent optional family never makes a concept non-conformant. Do not fabricate metadata simply to
populate every v0.2 field.

## v0.1 compatibility profile

When maintaining a declared or clearly established v0.1 bundle:

- retain `timestamp` for meaningful-change time;
- retain the conventional body `# Citations` trail;
- use legacy `status: superseded` for the trust model's retired originals;
- consume v0.2-shaped fields when encountered, but do not partially migrate neighboring concepts.

A v0.2 consumer falls back to `timestamp` when `generated` is absent and may parse legacy
`# Citations` when `sources` is absent. These fallbacks are for compatibility, not the shape new
v0.2 concepts should emit.

## Attested Computations

Treat `type: Attested Computation` as a distinct contract. `runtime` is required for that type; the
computation is either one body fence under `# Computation` or the path named by `computation`.
Agents may bind only declared `parameters` and must not author or alter a sanctioned computation
while answering a query. `executor` and `attester` describe interfaces; their presence does not
authorize execution. Attestation is a runtime verdict and is not written into the bundle as a
receipt.
