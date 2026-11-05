# NSES — NewAgeSysIT Engineering Standards

**Version:** 1.0.0  
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

## Repository map

- `core/`: language- and framework-neutral practices.
- `architecture/`: system and component design.
- `security/`: baseline controls and secure development.
- `performance/`: measurement-led optimization.
- `frameworks/`: technology-specific requirements.
- `quality/`: testing and review expectations.
- `ai-instructions/`: agent entry points and task workflow.
- `tooling/`: example shared lint/typecheck/CI configurations.
- `templates/`: reusable PR, exception and design templates.
- `scripts/`: lightweight repository/project compliance checks.
- `adoption/`: rollout and versioning procedures.

## Consume from a project

From the project root:

```bash
git submodule add https://github.com/<ORG>/newagesysit-engineering-standards.git .engineering/standards
cd .engineering/standards
git checkout v1.0.0
cd ../..
```

Commit `.gitmodules` and the submodule gitlink. Pin projects to a release tag or approved commit; do not track `main` in production projects. Update deliberately:

```bash
cd .engineering/standards
git fetch --tags
git checkout v1.1.0
cd ../..
git add .engineering/standards
git commit -m "chore: update NSES to v1.1.0"
```

If the submodule path differs, update the import paths in `CLAUDE.md` / `AGENTS.md` accordingly. A submodule is a versioned reference, not a package manager: tools do not automatically load its Markdown files. The project-level agent entry point must explicitly reference the applicable documents, and CI must run the checks you choose to enforce.

## Minimum project integration

1. Add the standards submodule pinned to an approved release.
2. Add project-root `AGENTS.md` and `CLAUDE.md` using `ai-instructions/` templates.
3. Select the matching framework instruction file(s).
4. Configure TypeScript strictness, lint, tests and dependency scanning for that repository.
5. Add the NSES compliance script to CI in report-only mode first; promote agreed checks to blocking gates after the pilot.
6. Document project-specific architecture, commands, data classification and exceptions locally.

## Scope and tailoring

Existing repositories may have legacy constraints. Apply MUST controls to new/changed code first, then plan remediation of inherited issues. Never claim a project is compliant solely because its agent file imports NSES. Compliance requires actual automated evidence and review.

## Release

See `VERSION`, `CHANGELOG.md` and `adoption/versioning-and-governance.md`. Use semantic versioning. Every release should include a migration note when rules or tooling change.
