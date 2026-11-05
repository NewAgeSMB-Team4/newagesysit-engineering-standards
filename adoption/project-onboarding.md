# Project onboarding checklist

- [ ] Confirm project owner, framework and supported runtime versions.
- [ ] Add NSES submodule at `.engineering/standards` and pin an approved tag.
- [ ] Add project-root `AGENTS.md` and `CLAUDE.md` using the templates.
- [ ] Document project architecture, package manager and exact commands.
- [ ] Identify trust boundaries, sensitive data and authorization model.
- [ ] Enable strict TypeScript for new code; plan migration for legacy code.
- [ ] Ensure lint, typecheck, test and build scripts exist and run in CI.
- [ ] Enable secret and dependency scanning.
- [ ] Add PR template and branch protection.
- [ ] Run NSES checker in report-only mode; triage warnings.
- [ ] Record approved exceptions with expiry.
- [ ] Review onboarding with the framework maintainer.
