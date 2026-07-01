# Ecosystem

What others are building on the [LLM Wiki](../concepts/llm_wiki.md) pattern. Karpathy's
[gist](../references/karpathy_llm_wiki.md) drew **900+ comments and 200+ distinct projects** in the
months after posting — a fast, crowded, still-forming space. These pages synthesize that landscape
rather than list every link: a survey, a few featured projects most relevant to *our* goal
(OKF-conformant, portable skills), and the critical debates worth heeding before we build.

* [Landscape](./landscape.md) - the categories of implementations and where the energy is.
* [Critiques & Open Problems](./critiques.md) - truth maintenance, token cost, and the "markdown vs. database" debate.
* [Competitor Comparison](./competitor_comparison.md) - okf-skills vs. openknowledge vs. our plan; what to build vs. reuse.

## Featured projects

Selected for scale, quality, or direct relevance to the OKF + portable-skills direction.

* [okf-skills (scaccogatto)](./okf_skills_scaccogatto.md) - the closest direct competitor: Claude Code OKF skills (author/validate/visualize), plugin + skills.sh.
* [openknowledge (openknowledge-sh)](./openknowledge_cli.md) - the most tooling-complete: a Go CLI with a registry, viewer, exporters, and agent maintenance loop.
* [kiso (oak-invest)](./kiso.md) - the consumer half: a Java engine that publishes OKF bundles as static sites (llms.txt + sitemap).
* [OmegaWiki](./omegawiki.md) - the most complete realization; a full-lifecycle research platform (~1.5k★).
* [karpathy-llm-wiki (Astro-Han)](./karpathy_llm_wiki_astro.md) - Agent-Skills-compatible wiki for Claude Code/Cursor/Codex (~1.3k★).
* [wiki-skills (kfchou)](./wiki_skills.md) - Claude Code skills implementation; closest in shape to what we're building.
* [okf-harness (pumblus)](./okf_harness.md) - an explicitly OKF-compatible local harness — on our exact format.
* [synthadoc](./synthadoc.md) - a no-tools, self-managed compilation engine (~0.5k★).
* [commonplace (zby)](./commonplace.md) - theory-forward, review-gated; also maintains an agent-curated list of related systems.
* [openwiki (langchain-ai)](./openwiki_langchain.md) - LangChain's codebase-doc generator; adjacent code-docs lane, not OKF — a brand signal + ingest technique source.
