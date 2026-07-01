#!/usr/bin/env python3
"""Deterministic OKF v0.1 conformance check for a knowledge bundle (§9).

Usage:  python3 conformance.py <bundle-dir> [--json]

Exit code is non-zero if any ERROR is present. Broken links and soft-guidance
issues are reported as WARN and never fail (SPEC §5.3 / §9 — consumers MUST
tolerate them). This checks structure only; drift (contradictions, stale
claims, orphans, coverage gaps) is the fuzzy, agent-driven half of kb-lint.
"""
import os, re, sys, json, posixpath

RESERVED = {"index.md", "log.md"}
FM_RE = re.compile(r"^---\n(.*?)\n---\n?", re.S)
HEADING_RE = re.compile(r"^#{1,6}\s+(.+?)\s*$", re.M)
LINK_RE = re.compile(r"\]\(([^)#\s]+\.md)(#[^)]*)?\)")
LOG_DATE_RE = re.compile(r"^##\s+(.+?)\s*$", re.M)
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def frontmatter(text):
    m = FM_RE.match(text)
    return m.group(1) if m else None


def check(bundle):
    errors, warns = [], []
    md = []
    for dp, _, fs in os.walk(bundle):
        for f in fs:
            if f.endswith(".md"):
                md.append(os.path.relpath(os.path.join(dp, f), bundle))

    for rel in sorted(md):
        text = open(os.path.join(bundle, rel), encoding="utf-8").read()
        base = os.path.basename(rel)
        fm = frontmatter(text)

        if base in RESERVED:
            # Reserved files carry no frontmatter, except the ROOT index.md may
            # declare okf_version (SPEC §6/§11).
            if fm is not None:
                is_root_index = (rel == "index.md")
                if not (is_root_index and "okf_version" in fm):
                    errors.append(f"{rel}: reserved file must not carry frontmatter")
            if base == "log.md":
                for m in LOG_DATE_RE.finditer(text):
                    if not ISO_DATE_RE.match(m.group(1)):
                        warns.append(f"{rel}: log date heading not ISO 8601: '{m.group(1)}'")
            continue

        # Concept document: rules 1 & 2.
        if fm is None:
            errors.append(f"{rel}: concept has no parseable frontmatter")
            continue
        tm = re.search(r"^type:\s*(.+?)\s*$", fm, re.M)
        if not tm or not tm.group(1).strip():
            errors.append(f"{rel}: missing or empty required 'type'")

    # Broken relative links → WARN only (never a conformance failure).
    for rel in md:
        srcdir = posixpath.dirname(rel)
        for m in LINK_RE.finditer(open(os.path.join(bundle, rel), encoding="utf-8").read()):
            tgt = m.group(1)
            if "://" in tgt:
                continue
            resolved = posixpath.normpath(posixpath.join(srcdir, tgt)) if not tgt.startswith("/") \
                else tgt.lstrip("/")
            if not os.path.exists(os.path.join(bundle, resolved)):
                warns.append(f"{rel}: broken link -> {tgt}")

    return {"bundle": bundle, "concepts": len([f for f in md if os.path.basename(f) not in RESERVED]),
            "files": len(md), "errors": errors, "warnings": warns}


def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    as_json = "--json" in argv
    bundle = args[0] if args else "."
    if not os.path.isdir(bundle):
        print(f"not a directory: {bundle}", file=sys.stderr)
        return 2
    r = check(bundle)
    if as_json:
        print(json.dumps(r, indent=2))
    else:
        print(f"{r['bundle']}: {r['files']} files, {r['concepts']} concepts")
        for e in r["errors"]:
            print(f"  ERROR  {e}")
        for w in r["warnings"]:
            print(f"  warn   {w}")
        verdict = "CONFORMANT" if not r["errors"] else "NON-CONFORMANT"
        print(f"  => {verdict} ({len(r['errors'])} errors, {len(r['warnings'])} warnings)")
    return 1 if r["errors"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
