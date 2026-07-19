import { existsSync } from "node:fs";
import { checkConformance, formatReport } from "@agent-knowledge/kb-tools";
import { loadSettings } from "./onboarding/settings.js";
import { parseArgs } from "./headless/flags.js";
import { runHeadless } from "./headless/run.js";
import { buildDirective, isSubcommand } from "./commands.js";
import { resolveProjectPaths } from "./agent/paths.js";
import { GREETING } from "./agent/persona.js";

const VERSION = "0.1.0";

const HELP = `${GREETING}

Usage:
  janet                      Start an interactive session (chat with Janet)
  janet init                 Scaffold a new knowledge/ bundle here
  janet ingest <src...>      Ingest source(s) into the bundle
  janet query "<question>"   Answer from the bundle, with citations
  janet lint [--fix]         Health-check the bundle (conformance + drift)
  janet viz [scope]          Render the bundle as a graph

Options:
  -C, --dir <path>           Operate on <path> instead of the current directory
      --bundle <path>        Bundle location (default: <dir>/knowledge)
  -p, --print                Headless: stream to stdout and exit
      --model <provider/id>  Model to use (or set JANET_MODEL)
      --thread <id>          Resume a thread
  -h, --help                 Show this help
  -v, --version              Show version

Also installed as \`ding\` (you summon Janet with a ding).`;

function resolveModelId(values: Record<string, string>): string | undefined {
  return (
    values["model"] ??
    process.env["JANET_MODEL"] ??
    loadSettings().defaultModelId ??
    undefined
  );
}

async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);

  if (parsed.flags.has("help") || parsed.subcommand === "help") {
    process.stdout.write(HELP + "\n");
    return 0;
  }
  if (parsed.flags.has("version")) {
    process.stdout.write(VERSION + "\n");
    return 0;
  }

  const dir = parsed.values["dir"];
  const bundleOverride = parsed.values["bundle"];
  const paths = resolveProjectPaths({ dir, bundle: bundleOverride });
  const modelId = resolveModelId(parsed.values);
  const threadId = parsed.values["thread"] ?? parsed.values["resume"];
  const headless = parsed.flags.has("print") || !process.stdout.isTTY;

  const sub = parsed.subcommand;

  // No subcommand → interactive TUI (chat).
  if (!sub) {
    if (!headless) {
      const { runTui } = await import("./tui/index.js");
      if (modelId && !process.env["JANET_MODEL"]) process.env["JANET_MODEL"] = modelId;
      return runTui({ dir, bundle: bundleOverride });
    }
    process.stderr.write("No subcommand. Try `janet --help`.\n");
    return 2;
  }

  if (!isSubcommand(sub)) {
    process.stderr.write(`Unknown command: ${sub}\nTry \`janet --help\`.\n`);
    return 2;
  }

  // `lint` runs the deterministic conformance check in-process first (no tokens,
  // CI-gateable), then hands the drift audit to the agent.
  if (sub === "lint") {
    if (!existsSync(paths.bundlePath)) {
      process.stderr.write(
        `No bundle at ${paths.bundlePath}. Run \`janet init\` to scaffold one.\n`,
      );
      return 2;
    }
    const report = checkConformance(paths.bundlePath);
    process.stdout.write(formatReport(report) + "\n");
    // If no model is configured, stop after the deterministic pass (still useful
    // and exit-coded for CI).
    if (!modelId) {
      process.stdout.write(
        "\n(No model configured — ran the deterministic conformance pass only. " +
          "Set --model or JANET_MODEL for the drift audit.)\n",
      );
      return report.errors.length ? 1 : 0;
    }
  }

  // Bundle must exist for ingest/query/lint/viz (init creates it).
  if (sub !== "init" && !existsSync(paths.bundlePath)) {
    process.stderr.write(
      `No bundle at ${paths.bundlePath}. Run \`janet init\` to scaffold one.\n`,
    );
    return 2;
  }

  const directive = buildDirective(sub, {
    bundlePath: paths.bundlePath,
    args: parsed.positionals,
    flags: parsed.flags,
  });

  const result = await runHeadless({
    message: directive,
    dir,
    bundle: bundleOverride,
    modelId,
    threadId,
  });
  return result.exitCode;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`\nJanet hit a snag: ${err?.message ?? err}\n`);
    process.exit(1);
  });
