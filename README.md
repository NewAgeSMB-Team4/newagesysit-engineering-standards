# NSES — NewAgeSysIT Engineering Standards

**Version:** 1.2.0  
**Status:** Initial baseline  
**Distribution:** Git submodule  
**Initial scope:** Next.js, NestJS, React, TypeScript, Node.js

NSES is the shared engineering baseline for designing, building, reviewing, securing, testing and maintaining software at NewAgeSysIT. It is intended for developers and AI coding assistants. It is not a substitute for framework documentation, threat modelling, security review or engineering judgement.

## Principles

1. Secure by default; trust boundaries are explicit.
2. Prefer simple, readable, maintainable solutions over clever abstractions.
3. Keep responsibilities separated and dependencies flowing inward.
4. Server-side execution is preferred for trusted operations; browser code receives only data it is allowed to see.
5. Validate at boundaries and authorize every protected operation.
6. Automate deterministic checks; use humans for context and trade-offs.
7. Improve existing code incrementally; do not introduce unrelated rewrites.

## Rule language

- **MUST**: required. A violation blocks merge unless an approved, time-bound exception exists.
- **SHOULD**: expected default. Deviations need a reason documented in the PR or design note.
- **MAY**: optional technique; use when it solves a real problem.

## Central entry point

`ENTRY.md` is the single navigation point for NSES. AI assistants and engineers should start there, identify the project technologies and task scope, and then read the applicable detailed standards. Project-root `CLAUDE.md` can import it with Claude Code's `@` syntax; `AGENTS.md` should explicitly instruct compatible agents to read it. A Git submodule does not automatically load Markdown instructions.

## Repository map

- `core/`: language- and framework-neutral practices.
- `architecture/`: system and component design.
- `security/`: baseline controls and secure development.
- `performance/`: measurement-led optimization.
- `frameworks/`: technology-specific requirements.
- `quality/`: testing and review expectations.
- `ENTRY.md`: central index that directs projects to the matching technology profile.
- `profiles/`: technology-specific entry points for Next.js, NestJS and React; each profile imports the applicable detailed standards.
- `ai-instructions/`: reusable Claude Code and AGENTS project instruction templates.
- `tooling/`: shared ESLint, TypeScript, Prettier, SonarQube and CI configuration (common + framework layers); see `tooling/README.md`.
- `templates/`: reusable PR, exception and design templates.
- `scripts/`: standards validators and the project integration checker; see `scripts/README.md`.
- `standards.manifest.json`: machine-readable declaration of profiles and required standards used by the validators.
- `test/`: unit and integration tests for the scripts.
- `adoption/`: rollout and versioning procedures.

## Consume from a project

From the project root:

```bash
git submodule add https://github.com/NewAgeSMB-Team4/newagesysit-engineering-standards.git .engineering/standards
cd .engineering/standards
git checkout v1.2.0
cd ../..
```

Commit `.gitmodules` and the submodule gitlink. Pin projects to a release tag or approved commit; do not track `main` in production projects. Update deliberately (replace `v1.2.0` with the approved release you are adopting):

```bash
cd .engineering/standards
git fetch --tags
git checkout v1.2.0
cd ../..
git add .engineering/standards
git commit -m "chore: update NSES to v1.2.0"
```

If the submodule path differs, update the import paths in `CLAUDE.md` / `AGENTS.md` accordingly. A submodule is a versioned reference, not a package manager: tools do not automatically load its Markdown files. The project-level agent entry point must explicitly reference the applicable documents, and CI must run the checks you choose to enforce.

## Minimum project integration

1. Add the standards submodule pinned to an approved release.
2. Add project-root `AGENTS.md` and `CLAUDE.md` using `ai-instructions/` templates.
3. Select the matching profile (`profiles/nextjs.md`, `profiles/nestjs.md` or `profiles/react.md`) and reference it from the project-root agent instructions. The profile imports the applicable detailed standards.
4. Configure TypeScript strictness, lint, tests and dependency scanning for that repository.
5. Add the NSES integration check to CI in report-only mode first (`node .engineering/standards/scripts/check-project-compliance.js . --report`); remove `--report` to make it blocking after the pilot.
6. Document project-specific architecture, commands, data classification and exceptions locally.

## Scope and tailoring

Existing repositories may have legacy constraints. Apply MUST controls to new/changed code first, then plan remediation of inherited issues. Never claim a project is compliant solely because its agent file imports NSES. Compliance requires actual automated evidence and review.

## Validating NSES itself

Every pull request to `main` runs `.github/workflows/nses-validate.yml`, which must pass before merge. Run the same checks locally with Node.js 22+ (no dependencies to install):

```bash
npm run validate          # lint, imports, profiles, standards structure and all tests
npm run validate:imports -- --profile nextjs
npm run validate:standards
```

When you add or rename a standard or profile, update `standards.manifest.json` in the same PR. See `scripts/README.md` for every check and result code.

## Checking a consuming project

```bash
node .engineering/standards/scripts/check-project-compliance.js /path/to/project
```

This reports how the project integrates NSES (submodule, pinned version, CLAUDE.md / AGENTS.md, profile for the detected stack, recommended tooling). It is read-only and never reads `.env` or credential files. It is a configuration check, not a security or code-quality audit.

## Release

See `VERSION`, `CHANGELOG.md` and `adoption/versioning-and-governance.md`. Use semantic versioning. Every release should include a migration note when rules or tooling change.

Before tagging, set the CHANGELOG date for the release, bump `VERSION`, `package.json`, `README.md` and `ENTRY.md` together (`npm run validate:standards` fails if they disagree), and confirm the validation workflow passes on `main`.
