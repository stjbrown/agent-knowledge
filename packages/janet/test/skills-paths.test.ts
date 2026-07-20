import {
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureSkillLinks } from "../src/agent/skills-paths.js";

const roots: string[] = [];

function makeSkill(root: string, name: string): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\n---\n`, "utf-8");
  return dir;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("ensureSkillLinks", () => {
  it("resolves every skill independently with project, user, then bundled precedence", () => {
    const root = mkdtempSync(join(tmpdir(), "janet-skills-"));
    roots.push(root);
    const project = join(root, "project");
    const home = join(root, "home");
    mkdirSync(project, { recursive: true });
    mkdirSync(home, { recursive: true });

    const projectKb = makeSkill(join(project, ".agents", "skills"), "kb");
    const userQuery = makeSkill(join(home, ".claude", "skills"), "kb-query");
    // A partial Janet-specific user root must not suppress bundled fallbacks.
    const userInit = makeSkill(join(home, ".agent-knowledge", "skills"), "kb-init");

    const mount = ensureSkillLinks(project, home);
    const links = join(project, ".agent-knowledge", "skills");

    expect(readlinkSync(join(links, "kb"))).toBe(projectKb);
    expect(readlinkSync(join(links, "kb-query"))).toBe(userQuery);
    expect(readlinkSync(join(links, "kb-init"))).toBe(userInit);
    expect(readlinkSync(join(links, "kb-ingest"))).toContain("/skills/kb-ingest");
    expect(mount.allowedPaths).toEqual(expect.arrayContaining([projectKb, userQuery, userInit]));
  });

  it("preserves a real project-local mounted skill", () => {
    const root = mkdtempSync(join(tmpdir(), "janet-skills-local-"));
    roots.push(root);
    const project = join(root, "project");
    const home = join(root, "home");
    mkdirSync(home, { recursive: true });
    const local = makeSkill(join(project, ".agent-knowledge", "skills"), "kb");

    const mount = ensureSkillLinks(project, home);

    expect(mount.allowedPaths).toContain(local);
  });
});
