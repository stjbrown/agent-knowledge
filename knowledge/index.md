---
okf_version: "0.1"
---

# Agent Knowledge — OKF & LLM Wiki

A knowledge bundle about the [Open Knowledge Format (OKF)](./spec/index.md) and the
[LLM Wiki](./concepts/llm_wiki.md) pattern it formalizes. This bundle is written *in* OKF
so the repository doubles as a worked, self-demonstrating example: to see what a conformant
bundle looks like, browse the files here.

The purpose of this bundle is to collect and cross-link everything we know about OKF and the
LLM Wiki pattern before building the portable agent skills that will create and maintain
bundles like this one.

## Concepts

The ideas behind the pattern — what an LLM Wiki is and why it works.

* [LLM Wiki](./concepts/llm_wiki.md) - a persistent, LLM-maintained knowledge base that compiles knowledge once and keeps it current.
* [Three-Layer Architecture](./concepts/three_layer_architecture.md) - raw sources, the wiki, and the schema.
* [Compounding Artifact](./concepts/compounding_artifact.md) - why a persistent wiki beats query-time retrieval.
* [Progressive Disclosure](./concepts/progressive_disclosure.md) - navigating a bundle one level at a time via index files.
* [RAG vs. LLM Wiki](./concepts/rag_vs_llm_wiki.md) - retrieval every query vs. compile once, maintain forever.
* [Memex](./concepts/memex.md) - Vannevar Bush's 1945 antecedent, and the maintenance problem the LLM solves.
* [Knowledge Bundle](./concepts/knowledge_bundle.md) - the OKF term for a directory of concept documents.
* [Concept Document](./concepts/concept_document.md) - the OKF term for a single markdown-plus-frontmatter file.

## Spec

The OKF v0.1 specification, one page per section.

* [OKF Specification Overview](./spec/index.md) - what OKF is and how these pages map to the spec.
* [Motivation](./spec/motivation.md) - why standardize on markdown + frontmatter.
* [Terminology](./spec/terminology.md) - bundle, concept, concept ID, frontmatter, body, link, citation.
* [Bundle Structure](./spec/bundle_structure.md) - a directory tree of markdown files.
* [Reserved Filenames](./spec/reserved_filenames.md) - `index.md` and `log.md`.
* [Frontmatter](./spec/frontmatter.md) - required and recommended keys.
* [Body](./spec/body.md) - conventional headings, no required sections.
* [Cross-linking](./spec/cross_linking.md) - absolute and relative markdown links as edges.
* [Index Files](./spec/index_files.md) - directory listings for progressive disclosure.
* [Log Files](./spec/log_files.md) - date-grouped change history.
* [Citations](./spec/citations.md) - external sources under a numbered heading.
* [Conformance](./spec/conformance.md) - what makes a bundle conformant.
* [Versioning](./spec/versioning.md) - `<major>.<minor>` and `okf_version`.

## Operations

The LLM Wiki workflows the skills will implement.

* [Ingest](./operations/ingest.md) - read a source, extract signal, integrate it across the wiki.
* [Query](./operations/query.md) - navigate, synthesize an answer, and file valuable answers back.
* [Lint](./operations/lint.md) - health-check the bundle for drift, orphans, and gaps.

## Implementations

Existing instantiations of the pattern.

* [personal work wiki](./implementations/personal_work_wiki.md) - a working personal work wiki with ingest/query/lint/status skills.
* [the OKF-native agent](./implementations/okf_native_agent.md) - a private, OKF-native deployable agent — prior art for the format-first direction.

## Ecosystem

What others are building — the 200+ projects and debates that followed Karpathy's gist.

* [Ecosystem Overview](./ecosystem/index.md) - how to read the landscape and the featured projects.
* [Landscape](./ecosystem/landscape.md) - the categories of implementations and where OKF sits.
* [Critiques & Open Problems](./ecosystem/critiques.md) - truth maintenance, token cost, markdown-vs-database.

## Design

Our own analysis informing the build — synthesis about the format, not source material.

* [Skill Design — the kb-* family](./design/skill_design.md) - the build plan for our skills, designed with the writing-great-skills framework.
* [Lessons from the OKF Sample Bundles](./design/sample_bundle_lessons.md) - what the ga4/stackoverflow/crypto_bitcoin bundles teach about authoring conformant bundles.
* [OKF Spec Evolution](./design/spec_evolution.md) - what the open PRs reveal about where v0.1 is still in flux, and the resulting decisions.

## References

External source material this bundle is compiled from.

* [OKF Specification (SPEC.md)](./references/okf_spec.md) - the OKF v0.1 spec on GitHub.
* [OKF README & Reference Agent](./references/okf_readme.md) - the reference agent, enrich, and visualize commands.
* [Karpathy — LLM Wiki gist](./references/karpathy_llm_wiki.md) - the idea file that originated the pattern.
* [qmd](./references/qmd.md) - local markdown search engine (BM25 + vector + LLM re-rank).
* [OKF vs. RAG — infographic](./references/okf_vs_rag_infographic.md) - a two-panel explainer/marketing visual of the RAG-vs-OKF contrast.
