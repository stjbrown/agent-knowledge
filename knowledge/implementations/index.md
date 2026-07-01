# Implementations

Existing instantiations of the [LLM Wiki](../concepts/llm_wiki.md) pattern. Studying them is how we
decide what the portable OKF skills should generalize and what belongs in each project's
[schema layer](../concepts/three_layer_architecture.md#3-the-schema).

* [personal work wiki](./personal_work_wiki.md) - a working personal work wiki (Obsidian + Claude Code) with ingest/query/lint/status skills; pre-OKF conventions.
* [the OKF-native agent](./okf_native_agent.md) - a deployable, OKF-native agent (Mastra) with a multi-bundle workspace and `okf` read/write skills carrying a trust model.
