# NSES implementation roadmap

## Phase 0 — Governance and baseline (week 1)

- Confirm engineering owner and security approver.
- Create the central Git repository and protect `main`.
- Publish v1.0.0 and agree on MUST/SHOULD/MAY definitions.
- Decide the supported Node.js LTS line, package managers and minimum framework support policy.
- Create an inventory of active Next.js, NestJS and React repositories.

**Exit criteria:** owner assigned, repository protected, release tagged, project inventory started.

## Phase 1 — Pilot adoption (weeks 2–3)

- Choose one actively maintained Next.js project and one NestJS API.
- Add NSES as a pinned submodule.
- Add concise project-specific `CLAUDE.md` / `AGENTS.md` entry points.
- Run the baseline checker in report-only mode.
- Add lint, typecheck, tests and build checks using existing project scripts.
- Record legacy gaps; do not block all work on inherited violations.

**Exit criteria:** both pilots can use the standards, checks run in CI, gaps have owners.

## Phase 2 — Security and quality gates (weeks 4–5)

- Add secret scanning and dependency vulnerability scanning.
- Add static analysis (e.g. SonarQube and/or Semgrep) with agreed severity thresholds.
- Require tests and CI checks for protected branches.
- Add focused security tests for auth, authorization, tenant isolation and sensitive workflows.
- Promote verified critical/high controls to blocking gates.

**Exit criteria:** required checks are reliable, findings are triaged, exception process works.

## Phase 3 — Broader rollout (weeks 6–8)

- Roll out to remaining Next.js, NestJS and React repositories in batches.
- Train developers and reviewers using examples and PR templates.
- Track adoption and remediation; publish office hours/FAQ.
- Review friction and update standards through pull requests.

**Exit criteria:** each in-scope project has an owner, pinned NSES version and adoption status.

## Phase 4 — Audit platform integration (later)

- Build a NestJS-based NSES audit service only after the baseline checks are stable.
- Ingest results from CI/scanners; do not reimplement mature scanners.
- Store project, commit, NSES version, scanner version, findings, severity, owner and remediation state.
- Provide trend dashboards and exception expiry reminders.
- Keep source code access minimal; prefer SARIF/JSON reports over uploading full repositories.

## Suggested adoption metrics

- Percentage of in-scope repositories pinned to an approved NSES release.
- Percentage with required CI checks enabled.
- Critical/high vulnerability age and remediation SLA.
- Percentage of protected-branch PRs with passing tests/typecheck/lint.
- Exception count, age and expiry compliance.
- Trend in escaped defects and production incidents.

Do not use a single compliance score as a substitute for risk-based review.
