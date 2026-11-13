# NSES — Central Engineering Standards Entry Point

**Company:** NewAgeSysIT  
**Framework:** NewAgeSysIT Engineering Standards (NSES)  
**Version:** 1.3.2

This is the central index for engineers and AI coding assistants consuming NSES. Identify the technologies used by the project and task, then load the matching profile under `profiles/`. Profiles import the applicable detailed standards. Do not load unrelated framework guidance unless the task crosses those boundaries.

## 1. Rule levels

- **MUST:** Required. A violation must be fixed or covered by an approved, documented, time-bound exception.
- **SHOULD:** Recommended default. Deviations require a sound technical reason.
- **MAY:** Optional; use when it provides a clear benefit.

Security, privacy, access control and data-protection requirements are not optional merely because a project is legacy.

## 2. Choose the technology profile

- Next.js application: read `profiles/nextjs.md`. This profile includes the relevant React standards.
- NestJS service/API: read `profiles/nestjs.md`.
- React application not governed by Next.js: read `profiles/react.md`.
- Multi-technology repository: read each profile that applies to the code being changed. Avoid loading unrelated profiles.

## 3. Always-applicable security baseline

The technology profiles include the common security documents. At minimum, security requirements apply to every project that handles requests, identity, permissions, data, dependencies, configuration or external integrations. Validate untrusted input at boundaries and enforce authorization on the server for every protected operation.

## 4. Task workflow

Before editing:

1. Read project-root `CLAUDE.md` and/or `AGENTS.md`, plus any more-specific instructions in affected directories.
2. Inspect the project structure, package scripts, installed framework versions, existing architecture and relevant tests. Do not assume versions or tooling.
3. Read this entry point and the matching technology profile(s).
4. Identify security, privacy, performance, data migration and compatibility implications.
5. For non-trivial work, provide a concise plan before implementation.

While editing:

1. Make the smallest coherent change and preserve established project conventions unless there is a justified reason to change them.
2. Keep responsibilities separated; prefer cohesive reusable components/modules over oversized files or premature abstractions.
3. Validate untrusted input at boundaries and authorize protected operations server-side.
4. Do not read, print, copy or expose secret values, production customer data or confidential information. Use placeholder-only example files where needed.
5. Do not introduce dependencies, weaken controls, perform destructive operations or make production changes without appropriate approval.

Before completing:

1. Review the final diff for correctness, security, privacy, accidental changes and missing tests.
2. Run applicable lint, typecheck, tests and build commands available in the project.
3. Report changed files, checks actually run and their results, unresolved issues, assumptions and follow-up risks.
4. Do not silently ignore a MUST rule. Raise a conflict or request an approved exception.

## 5. Project-specific instructions and conflicts

Project-root and directory-level instructions provide local context: architecture, commands, framework versions, deployment procedures and approved exceptions. They supplement NSES; they do not silently override mandatory NSES security or data-protection requirements.

If instructions conflict:

1. Do not weaken a mandatory security or privacy control.
2. Preserve existing project behavior unless the task authorizes a change.
3. Explain the conflict and ask for clarification when the safe resolution is not clear.
4. Record approved deviations using `templates/exception-request.md`, including owner, rationale, risk, compensating controls and expiry/review date.

## 6. Maintenance

NSES is versioned. Projects must pin an approved tag or commit through the Git submodule and upgrade deliberately. Do not assume the latest `main` branch is approved for a project. See `adoption/versioning-and-governance.md` and `CHANGELOG.md`.
