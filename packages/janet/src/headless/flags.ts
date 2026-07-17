export interface ParsedArgs {
  /** First positional token (subcommand or undefined). */
  subcommand?: string;
  /** Remaining positional tokens. */
  positionals: string[];
  /** Boolean flags present (e.g. "fix", "print", "help"). */
  flags: Set<string>;
  /** Value flags (e.g. --model x, --dir path, --bundle path, --thread id). */
  values: Record<string, string>;
}

const VALUE_FLAGS = new Set(["model", "dir", "bundle", "thread", "resume", "C"]);

/**
 * Minimal arg parser. Supports `--flag`, `--key value`, `--key=value`, short
 * `-p`/`-h`/`-C`, and positionals. Deliberately dependency-free.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Set<string>();
  const values: Record<string, string> = {};

  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]!;
    if (tok === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (tok.startsWith("--")) {
      const body = tok.slice(2);
      const eq = body.indexOf("=");
      if (eq >= 0) {
        values[body.slice(0, eq)] = body.slice(eq + 1);
      } else if (VALUE_FLAGS.has(body)) {
        values[body] = argv[++i] ?? "";
      } else {
        flags.add(body);
      }
    } else if (tok.startsWith("-") && tok.length > 1) {
      const short = tok.slice(1);
      if (short === "p") flags.add("print");
      else if (short === "h") flags.add("help");
      else if (short === "v") flags.add("version");
      else if (short === "C") values["dir"] = argv[++i] ?? "";
      else flags.add(short);
    } else {
      positionals.push(tok);
    }
  }

  return {
    subcommand: positionals[0],
    positionals: positionals.slice(1),
    flags,
    values,
  };
}
