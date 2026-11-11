# Project onboarding checklist

- [ ] Confirm project owner, framework and supported runtime versions.
- [ ] Add NSES submodule at `.engineering/standards` and pin an approved tag.
- [ ] Add project-root `AGENTS.md` and `CLAUDE.md` using the templates.
- [ ] Document project architecture, package manager and exact commands.
- [ ] Identify trust boundaries, sensitive data and authorization model.
- [ ] Enable strict TypeScript for new code; plan migration for legacy code.
- [ ] Ensure lint, typecheck, test and build scripts exist and run in CI.
- [ ] Commit `.claude/settings.json` with the secret deny list from `ai-instructions/claude-settings.json`.
- [ ] Enable secret scanning (Gitleaks job in `tooling/ci/security.yml`, plus platform push protection) and dependency scanning; scan the full history once and rotate anything found.
- [ ] Add PR template and branch protection.
- [ ] Run `node .engineering/standards/scripts/check-project-compliance.js . --report`; fix FAIL results and triage warnings.
- [ ] Adopt the shared tooling layers where practical (see `tooling/README.md`).
- [ ] Add the NSES integration check to CI (see `tooling/ci/github-actions-quality.yml`); remove `--report` once clean.
- [ ] Record approved exceptions with expiry.
- [ ] Review onboarding with the framework maintainer.
