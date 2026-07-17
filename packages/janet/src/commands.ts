/**
 * Subcommand → skill directive mapping. Each CLI subcommand becomes a message
 * telling Janet to load and follow the matching kb-* skill against the target
 * bundle. The procedures live in the skills; this only routes to them.
 */
export type SubcommandName = "init" | "ingest" | "query" | "lint" | "viz";

export interface DirectiveContext {
  bundlePath: string;
  /** Positional args after the subcommand (sources, query text, scope, etc.). */
  args: string[];
  /** Flags like --fix. */
  flags: Set<string>;
}

export const SUBCOMMANDS: readonly SubcommandName[] = ["init", "ingest", "query", "lint", "viz"];

export function isSubcommand(x: string): x is SubcommandName {
  return (SUBCOMMANDS as readonly string[]).includes(x);
}

export function buildDirective(cmd: SubcommandName, ctx: DirectiveContext): string {
  const bundle = ctx.bundlePath;
  switch (cmd) {
    case "init":
      return `Load and follow the kb-init skill to scaffold a new OKF knowledge bundle at ${bundle}. If it already exists, say so and stop rather than overwriting.`;
    case "ingest": {
      const sources = ctx.args.length ? ctx.args.join(", ") : "(no source given)";
      return `Load and follow the kb-ingest skill to ingest the following source(s) into the bundle at ${bundle}: ${sources}. Integrate per the trust model — update the index and log.md.`;
    }
    case "query": {
      const q = ctx.args.join(" ").trim();
      return `Load and follow the kb-query skill to answer this question from the bundle at ${bundle}, with citations: ${q || "(no question given)"}`;
    }
    case "lint": {
      const fix = ctx.flags.has("fix") ? " Run in fix mode: repair what is safe." : "";
      return `Load and follow the kb-lint skill to health-check the bundle at ${bundle}. The deterministic conformance pass has already run; focus on the drift audit and report findings by severity.${fix}`;
    }
    case "viz": {
      const scope = ctx.args.join(" ").trim();
      return `Load and follow the kb-visualize skill to render the bundle at ${bundle} as a graph${scope ? ` scoped to: ${scope}` : ""}. Write a self-contained HTML file next to the bundle and give the path.`;
    }
  }
}
