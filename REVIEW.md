# Janet launch-readiness review

This document tracks the findings from the 2026-07-19 review of the `janet-agent` branch and the
work required before Janet is merged or published. It complements [`PLAN.md`](./PLAN.md): the plan
describes the product and implementation; this file is the release-readiness checklist.

## Decisions

- **npm package:** publish as **`@stjbrown/agent-knowledge`** for the initial release.
- **CLI binaries:** keep `janet` and `ding`.
- **Future naming:** moving the repository and package identity to `janet-agent` remains an open
  option. The scoped name is the launch choice, not a permanent rejection of that rename.

## Must be complete before publish

- [x] Janet has real unit tests, and the complete CI-equivalent pipeline passes locally.
- [ ] Confirm the updated workflow passes in hosted CI from a clean checkout.
- [x] The npm tarball contains `LICENSE`, `NOTICE`, README, `dist/`, and all six bundled skills.
- [x] `janet lint` preserves deterministic conformance failures in its process exit code.
- [x] `--thread` resumes the requested thread in both headless and interactive modes.
- [x] Skill resolution checks project and user `.agents/skills` / `.claude/skills` roots and falls
  back per skill to the bundled copy.
- [x] Headless permissions are command-specific and fail closed; ordinary query/lint runs are
  read-only, and shell execution requires an explicit opt-in.
- [x] The conformance checker parses YAML rather than using substring/line regular expressions;
  malformed YAML and empty `type` values fail, while CRLF frontmatter works.
- [x] OAuth error logging never prints token response values.

## Verification gaps that need real credentials or external coordination

- [ ] Validate Anthropic and OpenAI subscription OAuth end to end with real accounts.
- [ ] Validate the Bedrock gateway with AWS credentials.
- [x] Expose OpenAI browser and device-code login modes through the TUI `/login` command.
- [ ] Decide whether a separate noninteractive login command is needed outside the TUI.
- [ ] Decide whether private subscription endpoints are stable enough for a supported feature or
  should remain explicitly experimental.
- [ ] Submit the optional Herdr integration PR.

## Follow-up hardening

- [x] Reject an absolute `--bundle` outside the project workspace with a clear error.
- [ ] Include the bundle identity in thread scoping when several bundles live in one project.
- [ ] Scope write tools to the selected bundle where practical instead of relying only on prompts.
- [ ] Add TTY-driven smoke coverage for onboarding, approval, question, OAuth, and model-picker
  interactions.
- [ ] Remove unused dependencies and keep the production dependency audit clean.

## Review evidence

After the first remediation pass, the monorepo build and Janet typecheck pass; all 21 tests pass;
the in-repo knowledge bundle has zero conformance errors or warnings; and fresh skill-script builds
match the committed hashes. The packed `@stjbrown/agent-knowledge` artifact contains the expected
metadata, documentation, executable, and six skills. Its installed-tarball smoke test is part of CI.

The remaining production dependency advisory is low severity in an indirect
`@ai-sdk/provider-utils` version (GHSA-866g-f22w-33x8). No patched release exists in the currently
compatible major line, so it is tracked rather than hidden behind an unsafe major upgrade. The
install also reports an indirect Zod peer-range mismatch inherited through Mastra/AI SDK; builds and
tests currently pass, but dependency upgrades should re-check it.
