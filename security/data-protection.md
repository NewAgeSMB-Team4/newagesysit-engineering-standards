# Data protection and secrets

- Classify data at minimum as Public, Internal, Confidential or Restricted; project owners map this to company policy.
- Keep credentials, tokens, signing keys, connection strings and private customer data out of source, prompts, screenshots, logs and test fixtures.
- Use `.env.example` with dummy placeholders only. `.env*` secrets must be ignored by Git; allow only explicitly safe examples.
- Expose only intentionally public values to browser bundles. In Next.js, `NEXT_PUBLIC_` values are public and must never contain secrets.
- Return DTOs/view models rather than raw ORM entities; explicitly allowlist response fields.
- Encrypt data in transit and use approved encryption-at-rest controls for sensitive stores/backups.
- Define retention and deletion behavior; avoid collecting data without a product need.
- Restrict production data access. Use synthetic or masked data in development and testing.

## Secret detection

- **MUST** run automated secret scanning over the full Git history on every pull request (for example the Gitleaks job in `tooling/ci/security.yml`), and enable the hosting platform's secret scanning and push protection where available.
- **MUST** rotate any secret that reached a repository, a log or an AI prompt. Removing it from the code does not remove it from history or from the recipient.

## AI coding assistants

- **MUST** technically block AI assistants from reading secret files where the tool supports it; instructions alone are not a control. Placeholder files (`.env.example`, `.env.sample`, `.env.template`) stay readable, so they **MUST** contain dummy values only. For Claude Code, commit `.claude/settings.json` with the deny list from `ai-instructions/claude-settings.json`, and extend it with project-specific secret locations.
- **MUST NOT** paste secrets, production customer data or Restricted data into prompts, and must not approve an assistant request to read them.
- **SHOULD** configure the equivalent ignore or permission settings in every other assistant the team uses.
