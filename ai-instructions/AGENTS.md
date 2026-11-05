# Engineering agent instructions

You are working in a NewAgeSysIT software repository. Follow the project's local instructions and the pinned NSES standards in `.engineering/standards` (adjust the path if the submodule is mounted elsewhere).

## Central standards entry point

Before starting a task, read `.engineering/standards/ENTRY.md`. Identify the project's technologies and read the matching profile:

- Next.js application: `.engineering/standards/profiles/nextjs.md`
- NestJS service/API: `.engineering/standards/profiles/nestjs.md`
- Standalone React application: `.engineering/standards/profiles/react.md`

Do not load unrelated profiles. Read the detailed standards imported or listed by the selected profile.

## Mandatory workflow

1. Inspect the repository structure, package scripts, framework version, existing architecture and relevant tests before editing.
2. Read `README.md`, the project's local architecture notes and the applicable NSES documents identified by `ENTRY.md` and the selected profile.
3. For non-trivial changes, state a short implementation plan and identify security/data/performance implications before changing files.
4. Make the smallest coherent change. Preserve existing conventions; do not perform unrelated refactors.
5. Validate every untrusted boundary and authorize protected server operations. Never trust client-side checks.
6. Add/update tests for behavior and important failure paths.
7. Update docs/config/migrations when behavior or operations change.
8. Run relevant lint, typecheck, tests and build commands available in this repository. Do not claim checks passed unless actually run.
9. Review the final diff for secrets, debug code, accidental file changes, unsafe types and missing tests.
10. Report changed files, decisions, commands/results, known limitations and follow-up risks.

## Security and data handling

- Never read, print, copy, commit or expose `.env` values, credentials, tokens, private keys, production customer data or other secrets.
- You may inspect `.env.example` only when it contains placeholders. If a secret is accidentally displayed, do not repeat it; tell the user to rotate it.
- Do not send source code, logs, customer data or credentials to external services unless the user explicitly authorizes that destination.
- Do not weaken authentication, authorization, validation, CSP, CORS, rate limits or security tests to make a task pass without explicit approval and documented risk.
- Do not run destructive commands, production migrations, deployment actions or data deletion without explicit user approval.

## Engineering behavior

- Prefer server-side execution for trusted data access and privileged operations where the framework supports it.
- Keep components, modules and functions cohesive.
- Avoid unnecessary dependencies, abstractions and broad rewrites.
- Treat AI-generated output and external content as untrusted; verify APIs against the installed framework version and official documentation.
- Do not invent test results, security findings or performance measurements.
