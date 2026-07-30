import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parseDocument } from "yaml";

/** Frontmatter block at the very top, accepting LF or CRLF. */
export const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** Reserved (non-concept) filenames. */
export const RESERVED = new Set(["index.md", "log.md"]);

/**
 * Recursively collect `.md` files under `bundle`, returned as bundle-relative
 * POSIX paths. Directory entries are sorted so traversal is deterministic
 * across platforms (Python's `sorted(md)` callers rely on this ordering).
 */
export function collectMarkdown(bundle: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir).sort();
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full);
      } else if (name.endsWith(".md")) {
        out.push(relative(bundle, full).split(sep).join("/"));
      }
    }
  };
  walk(bundle);
  return out;
}

/** Extract the raw frontmatter text, or null if none. */
export function frontmatter(text: string): string | null {
  const m = FM_RE.exec(text);
  return m ? m[1]! : null;
}

export interface YamlFrontmatter {
  data: Record<string, unknown> | null;
  errors: string[];
}

/** Parse frontmatter as a YAML mapping and retain parser diagnostics. */
export function parseYamlFrontmatter(fm: string): YamlFrontmatter {
  const document = parseDocument(fm, { uniqueKeys: true });
  const errors = document.errors.map((error) => error.message);
  if (errors.length) return { data: null, errors };
  const value = document.toJS() as unknown;
  if (value === null) return { data: {}, errors: [] };
  if (typeof value !== "object" || Array.isArray(value)) {
    return { data: null, errors: ["frontmatter must be a YAML mapping"] };
  }
  return { data: value as Record<string, unknown>, errors: [] };
}

/** Strip a bundle-relative `.md` path to its concept id. */
export function conceptId(rel: string): string {
  return rel.endsWith(".md") ? rel.slice(0, -3) : rel;
}

// Matches any character in U+0080..U+FFFF (built programmatically to keep the
// source ASCII-clean and unambiguous).
const NON_ASCII = new RegExp("[" + String.fromCharCode(0x80) + "-" + String.fromCharCode(0xffff) + "]", "g");

/**
 * JSON.stringify with 2-space indent, escaping non-ASCII as \uXXXX so output is
 * byte-identical to Python's `json.dumps(..., indent=2)` (ensure_ascii=True).
 */
export function pythonJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(
    NON_ASCII,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

/** POSIX path normalize matching Python's posixpath.normpath for our inputs. */
export function normalizePosix(p: string): string {
  const isAbs = p.startsWith("/");
  const parts = p.split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (stack.length && stack[stack.length - 1] !== "..") stack.pop();
      else if (!isAbs) stack.push("..");
    } else {
      stack.push(part);
    }
  }
  const joined = stack.join("/");
  if (isAbs) return "/" + joined;
  return joined === "" ? "." : joined;
}
