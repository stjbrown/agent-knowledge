import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** Frontmatter block at the very top: ---\n<body>\n--- (DOTALL, non-greedy). */
export const FM_RE = /^---\n([\s\S]*?)\n---\n?/;

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
