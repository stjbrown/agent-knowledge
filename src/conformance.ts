/**
 * Deterministic OKF v0.2 conformance and producer-profile check (SPEC §11).
 *
 * This is the canonical implementation bundled into the kb-lint skill at build time.
 * ERRORs fail conformance; broken links and soft-guidance issues are WARN and
 * never fail (SPEC §6.1 / §11 — consumers MUST tolerate them). Structure only;
 * drift is the fuzzy, agent-driven half of kb-lint.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  RESERVED,
  collectMarkdown,
  frontmatter,
  normalizePosix,
  parseYamlFrontmatter,
  pythonJson,
} from "./shared.js";

const HEADING_LOG_RE = /^##\s+(.+?)\s*$/gm;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LINK_RE = /\]\(([^)#\s]+\.md)(#[^)]*)?\)/g;
const FOOTNOTE_RE = /\[\^([A-Za-z0-9_-]+)\]/g;
const ACTOR_RE = /^(?:human:[^\s:]+|process:[^\s:]+|[^\s/:]+\/[^\s/]+)$/;

export interface ConformanceReport {
  bundle: string;
  okf_version: string | null;
  concepts: number;
  files: number;
  errors: string[];
  warnings: string[];
}

type Data = Record<string, unknown>;

function isRecord(value: unknown): value is Data {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validDate(value: unknown): value is string {
  if (!nonEmptyString(value) || !ISO_DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validDateTime(value: unknown): value is string {
  return nonEmptyString(value) && value.includes("T") && !Number.isNaN(Date.parse(value));
}

function validActor(value: unknown): value is string {
  return nonEmptyString(value) && ACTOR_RE.test(value);
}

function localResourceExists(bundle: string, rel: string, resource: string): boolean {
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(resource)) return true;
  const pathPart = resource.replace(/#.*$/, "");
  if (!pathPart) return true;
  const resolved = resource.startsWith("/")
    ? join(bundle, pathPart.replace(/^\/+/, ""))
    : join(bundle, dirname(rel), pathPart);
  return existsSync(resolved);
}

function validateVerification(rel: string, value: unknown, warnings: string[]): void {
  const events = Array.isArray(value) ? value : [value];
  if (!events.length) {
    warnings.push(`${rel}: verified must be a mapping or non-empty list of mappings`);
    return;
  }
  for (const event of events) {
    if (!isRecord(event) || !validActor(event["by"]) || !validDateTime(event["at"])) {
      warnings.push(`${rel}: verified entries require a valid actor 'by' and ISO 8601 'at'`);
      return;
    }
  }
}

function validateV02Profile(
  bundle: string,
  rel: string,
  text: string,
  data: Data,
  warnings: string[],
): void {
  if (Object.prototype.hasOwnProperty.call(data, "timestamp")) {
    warnings.push(`${rel}: legacy 'timestamp' in v0.2; use generated.at`);
  }
  if (/^#\s+Citations\s*$/m.test(text)) {
    warnings.push(`${rel}: legacy '# Citations' in v0.2; use structured sources`);
  }

  const sourceIds = new Set<string>();
  const sources = data["sources"];
  if (sources !== undefined) {
    if (!Array.isArray(sources)) {
      warnings.push(`${rel}: sources must be a list of mappings`);
    } else {
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        if (!isRecord(source) || !nonEmptyString(source["resource"])) {
          warnings.push(`${rel}: sources[${i}] requires non-empty 'resource'`);
          continue;
        }
        if (source["id"] !== undefined) {
          if (!nonEmptyString(source["id"])) {
            warnings.push(`${rel}: sources[${i}].id must be a non-empty string`);
          } else if (sourceIds.has(source["id"])) {
            warnings.push(`${rel}: duplicate sources id '${source["id"]}'`);
          } else {
            sourceIds.add(source["id"]);
          }
        }
        if (source["usage_count"] !== undefined) {
          if (typeof source["usage_count"] !== "number" || source["usage_count"] < 0) {
            warnings.push(`${rel}: sources[${i}].usage_count must be a non-negative number`);
          }
          const window = source["usage_window"] ?? data["usage_window"];
          if (!isRecord(window) || !validDate(window["from"]) || !validDate(window["to"])) {
            warnings.push(`${rel}: sources[${i}].usage_count requires a valid usage_window`);
          }
        }
        if (source["last_modified"] !== undefined && !validDate(source["last_modified"])) {
          warnings.push(`${rel}: sources[${i}].last_modified must be YYYY-MM-DD`);
        }

        const resource = source["resource"];
        if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(resource) || /\s/.test(resource)) continue;
        const looksLikePath = /^(?:\/|\.\.?\/)/.test(resource) || /\.[A-Za-z0-9]+(?:#.*)?$/.test(resource);
        if (looksLikePath && !localResourceExists(bundle, rel, resource)) {
          warnings.push(`${rel}: broken source resource -> ${resource}`);
        }
      }
    }
  }

  if (data["usage_window"] !== undefined) {
    const window = data["usage_window"];
    if (!isRecord(window) || !validDate(window["from"]) || !validDate(window["to"])) {
      warnings.push(`${rel}: usage_window requires valid 'from' and 'to' dates`);
    }
  }

  const footnotes = new Set([...text.matchAll(FOOTNOTE_RE)].map((match) => match[1]!));
  for (const id of footnotes) {
    if (!sourceIds.has(id)) warnings.push(`${rel}: footnote '${id}' has no matching sources[].id`);
  }

  const generated = data["generated"];
  if (generated !== undefined) {
    if (!isRecord(generated) || !validActor(generated["by"])) {
      warnings.push(`${rel}: generated requires a valid actor 'by'`);
    } else if (!validDateTime(generated["at"])) {
      warnings.push(`${rel}: generated.at must be an ISO 8601 datetime`);
    }
  }

  if (data["verified"] !== undefined) validateVerification(rel, data["verified"], warnings);

  const status = data["status"];
  if (status !== undefined && !["draft", "stable", "deprecated"].includes(String(status))) {
    warnings.push(`${rel}: status must be draft, stable, or deprecated`);
  }

  const staleAfter = data["stale_after"];
  if (staleAfter !== undefined) {
    if (!validDate(staleAfter)) {
      warnings.push(`${rel}: stale_after must be an ISO 8601 YYYY-MM-DD date`);
    } else if (new Date().toISOString().slice(0, 10) >= staleAfter) {
      warnings.push(`${rel}: concept is stale as of ${staleAfter}`);
    }
  }

  if (data["type"] === "Attested Computation") {
    if (!nonEmptyString(data["runtime"])) {
      warnings.push(`${rel}: Attested Computation requires non-empty 'runtime'`);
    }
    const hasPath = nonEmptyString(data["computation"]);
    const hasBody = /^#\s+Computation\s*$/m.test(text);
    if (hasPath === hasBody) {
      warnings.push(`${rel}: Attested Computation must use exactly one computation path or body section`);
    }
    const parameters = data["parameters"];
    if (parameters !== undefined && (!Array.isArray(parameters) || parameters.some((parameter) =>
      !isRecord(parameter) || !nonEmptyString(parameter["name"]) ||
      !nonEmptyString(parameter["type"]) || typeof parameter["required"] !== "boolean"
    ))) {
      warnings.push(`${rel}: parameters must be { name, type, required } mappings`);
    }
    for (const field of ["executor", "attester"] as const) {
      const contract = data[field];
      if (contract !== undefined && (!isRecord(contract) || !nonEmptyString(contract["resource"]))) {
        warnings.push(`${rel}: ${field} requires non-empty 'resource' when present`);
      } else if (isRecord(contract) && nonEmptyString(contract["resource"]) &&
        !localResourceExists(bundle, rel, contract["resource"])) {
        warnings.push(`${rel}: broken ${field}.resource -> ${contract["resource"]}`);
      }
    }
    if (hasPath && !localResourceExists(bundle, rel, data["computation"] as string)) {
      warnings.push(`${rel}: broken computation path -> ${data["computation"]}`);
    }
  }
}

export function checkConformance(bundle: string): ConformanceReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const md = collectMarkdown(bundle);

  let okfVersion: string | null = null;
  if (md.includes("index.md")) {
    const rootFm = frontmatter(readFileSync(join(bundle, "index.md"), "utf-8"));
    if (rootFm !== null) {
      const parsed = parseYamlFrontmatter(rootFm);
      const declared = parsed.data?.["okf_version"];
      if (nonEmptyString(declared)) okfVersion = declared;
    }
  }

  const posixBasename = (rel: string): string => rel.split("/").pop() ?? rel;

  for (const rel of [...md].sort()) {
    const text = readFileSync(join(bundle, rel), "utf-8");
    const base = posixBasename(rel);
    const fm = frontmatter(text);

    if (RESERVED.has(base)) {
      // Reserved files carry no frontmatter, except the ROOT index.md may
      // declare only okf_version (SPEC §8/§11).
      if (fm !== null) {
        const isRootIndex = rel === "index.md";
        const parsed = parseYamlFrontmatter(fm);
        const keys = parsed.data ? Object.keys(parsed.data) : [];
        const isOnlyVersion =
          isRootIndex &&
          parsed.errors.length === 0 &&
          parsed.data !== null &&
          keys.length === 1 &&
          keys[0] === "okf_version";
        if (isOnlyVersion && (
          !nonEmptyString(parsed.data!["okf_version"]) ||
          !/^\d+\.\d+$/.test(parsed.data!["okf_version"] as string)
        )) {
          errors.push(`${rel}: okf_version must be a string in <major>.<minor> form`);
        } else if (
          !isRootIndex ||
          parsed.errors.length > 0 ||
          !parsed.data ||
          keys.length !== 1 ||
          keys[0] !== "okf_version"
        ) {
          errors.push(`${rel}: reserved file must not carry frontmatter`);
        }
      }
      if (base === "log.md") {
        for (const m of text.matchAll(HEADING_LOG_RE)) {
          if (!ISO_DATE_RE.test(m[1]!)) {
            errors.push(`${rel}: log date heading not ISO 8601: '${m[1]}'`);
          }
        }
      }
      continue;
    }

    // Concept document: rules 1 & 2.
    if (fm === null) {
      errors.push(`${rel}: concept has no parseable frontmatter`);
      continue;
    }
    const parsed = parseYamlFrontmatter(fm);
    if (parsed.errors.length > 0 || !parsed.data) {
      errors.push(`${rel}: concept has no parseable frontmatter`);
      continue;
    }
    const type = parsed.data["type"];
    if (typeof type !== "string" || !type.trim()) {
      errors.push(`${rel}: missing or empty required 'type'`);
    }

    const hasV02Fields = ["sources", "generated", "verified", "status", "stale_after"].some(
      (key) => Object.prototype.hasOwnProperty.call(parsed.data!, key),
    ) || type === "Attested Computation";
    if (okfVersion === "0.2" || (okfVersion === null && hasV02Fields)) {
      validateV02Profile(bundle, rel, text, parsed.data, warnings);
    }
  }

  // Broken relative links → WARN only (never a conformance failure).
  for (const rel of md) {
    const srcdir = dirname(rel) === "." ? "" : dirname(rel);
    const text = readFileSync(join(bundle, rel), "utf-8");
    for (const m of text.matchAll(LINK_RE)) {
      const tgt = m[1]!;
      if (tgt.includes("://")) continue;
      const resolved = tgt.startsWith("/")
        ? tgt.replace(/^\/+/, "")
        : normalizePosix(srcdir ? `${srcdir}/${tgt}` : tgt);
      if (!existsSync(join(bundle, resolved))) {
        warnings.push(`${rel}: broken link -> ${tgt}`);
      }
    }
  }

  return {
    bundle,
    okf_version: okfVersion,
    concepts: md.filter((f) => !RESERVED.has(posixBasename(f))).length,
    files: md.length,
    errors,
    warnings,
  };
}

export function formatReport(r: ConformanceReport): string {
  const lines = [`${r.bundle}: ${r.files} files, ${r.concepts} concepts`];
  for (const e of r.errors) lines.push(`  ERROR  ${e}`);
  for (const w of r.warnings) lines.push(`  warn   ${w}`);
  const verdict = r.errors.length === 0 ? "CONFORMANT" : "NON-CONFORMANT";
  lines.push(`  => ${verdict} (${r.errors.length} errors, ${r.warnings.length} warnings)`);
  return lines.join("\n");
}

export function runCli(argv: string[]): number {
  const args = argv.filter((a) => !a.startsWith("--"));
  const asJson = argv.includes("--json");
  const bundle = args[0] ?? ".";
  let isDir = false;
  try {
    isDir = statSync(bundle).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) {
    process.stderr.write(`not a directory: ${bundle}\n`);
    return 2;
  }
  const r = checkConformance(bundle);
  if (asJson) {
    process.stdout.write(pythonJson(r) + "\n");
  } else {
    process.stdout.write(formatReport(r) + "\n");
  }
  return r.errors.length ? 1 : 0;
}
