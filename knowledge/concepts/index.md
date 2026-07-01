# Concepts

The ideas behind the LLM Wiki pattern and the vocabulary OKF uses to formalize it.

## The Pattern

* [LLM Wiki](./llm_wiki.md) - a persistent, LLM-maintained knowledge base that compiles knowledge once and keeps it current.
* [Three-Layer Architecture](./three_layer_architecture.md) - raw sources (immutable), the wiki (LLM-owned), and the schema (co-evolved config).
* [Compounding Artifact](./compounding_artifact.md) - the wiki gets richer with every source and every query, rather than being re-derived.
* [Progressive Disclosure](./progressive_disclosure.md) - navigate a growing bundle one level at a time through index files.

## Comparisons & Lineage

* [RAG vs. LLM Wiki](./rag_vs_llm_wiki.md) - retrieve-every-query vs. compile-once-and-maintain.
* [Memex](./memex.md) - Vannevar Bush's 1945 vision, and the maintenance problem that stalled it.

## OKF Vocabulary

* [Knowledge Bundle](./knowledge_bundle.md) - a directory tree of concept documents; the unit of exchange.
* [Concept Document](./concept_document.md) - one markdown file with YAML frontmatter and a body.
