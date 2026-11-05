# Versioning and governance

## Ownership

- **Engineering Standards Owner:** maintains structure, releases and cross-framework consistency.
- **Framework Maintainers:** own Next.js, NestJS and React guidance and verify changes against official docs.
- **Security Reviewer:** approves security baseline changes and critical/high exceptions.
- **Project Owners:** pin versions, adopt standards and maintain project-specific deviations.

## Change process

1. Open a PR describing problem, affected rules and rationale.
2. Identify whether the change is MUST, SHOULD or MAY.
3. Include examples and enforcement implications.
4. Obtain framework maintainer review; security reviewer for security changes.
5. Update changelog and migration notes.
6. Release a signed/protected semantic version tag according to company Git policy.

## Semantic versioning

- **MAJOR:** incompatible rule changes, removed rules or changes that may require project refactoring.
- **MINOR:** new backward-compatible standards, examples or optional tooling.
- **PATCH:** clarifications, typo fixes and non-behavioral corrections.

Projects pin to a release tag/commit and upgrade intentionally. Do not force a moving branch into production projects.

## Exceptions

Exceptions must be narrow, risk-assessed, owned, approved and time-bound. Security-critical exceptions require security approval. Expired exceptions are treated as open compliance gaps.

## Review cadence

Review framework guidance at least quarterly and after major framework/security releases or a material incident. Check all external links and tool configuration examples before publishing.
