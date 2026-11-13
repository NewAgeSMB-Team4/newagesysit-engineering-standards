# Changelog

All notable changes to NSES are documented here.

## [Unreleased]

### Changed
- The repository is now public under the MIT license (`LICENSE`). Projects no longer need a GitHub token, deploy key or access request to add NSES or to check out the submodule in CI.

### Migration notes
- Optional: remove any token or deploy key a project set up only to check out the NSES submodule.

## [1.3.1] - 2026-11-11

### Fixed
- Project checker now detects the technology stack in monorepos. Run from the repository root, it reads the workspace packages declared in the root `package.json` (`workspaces`, npm or Yarn) or in `pnpm-workspace.yaml`, evaluates each package on its own, and reports where each stack was found (for example "Next.js in apps/web"). Previously a monorepo root passed without any profile coverage check, because its `package.json` usually lists no framework.
- New `STACK_WORKSPACE_PACKAGE_INVALID` warning for a workspace `package.json` that is not valid JSON.

### Migration notes
- A monorepo that passed before can now FAIL with `PROFILE_NOT_CONFIGURED` if an app's stack has no profile in `CLAUDE.md` / `AGENTS.md`. Add the missing profile, or keep `--report` in CI while you fix it.

## [1.3.0] - 2026-11-11

### Added
- `ai-instructions/claude-settings.json`: Claude Code `permissions.deny` template that blocks secret `.env` variants, private keys, registry tokens and cloud credentials while keeping `.env.example` / `.env.sample` / `.env.template` readable. Projects copy it to `.claude/settings.json`.
- `ai-instructions/secret-protection.md`: per-tool setup for blocking secret files in Claude Code, Cursor, GitHub Copilot, Codex CLI, Gemini CLI and Windsurf / Devin Desktop, with each tool's limits and a verification test.
- Gitleaks `secret-scan` job (official Docker image pinned by digest, full history, redacted output) in `tooling/ci/security.yml`; README documents local Docker and installed-binary usage.
- `security/data-protection.md`: MUST rules for secret scanning, rotating leaked secrets and technically blocking AI assistants from secret files.
- Project checker warns with `AI_SECRET_DENY_MISSING` / `AI_SETTINGS_INVALID` when `.claude/settings.json` does not block `.env` reads.

### Changed
- README rewritten as a step-by-step adoption guide with ready-to-paste `CLAUDE.md` / `AGENTS.md` per stack.

### Migration notes
- Existing projects get a new checker WARNING until they add `.claude/settings.json`; it never fails the run.

## [1.2.0] - 2026-11-05

Milestone: Automated Standards Validation & Enforcement.

### Added
- `standards.manifest.json`: machine-readable declaration of supported profiles, required standards, per-profile required imports and documented cross-framework imports.
- `npm run validate:imports`: Markdown import validator (whole repository, `--profile <name>`, `--all-profiles`, `--file <path>`). Detects missing files, directory imports, missing profiles, imports outside the repository, letter-case mismatches, sensitive-file imports, duplicate and circular imports, and chains deeper than Claude Code's import limit. Ignores imports inside code blocks, inline code and HTML comments.
- `npm run validate:standards`: repository validator with PASS / WARNING / FAIL results for structure, semantic version and version consistency, profiles, required standards, AI templates, imports and documentation path references.
- `npm run lint`: dependency-free syntax, JSON, YAML and Markdown hygiene checks.
- Unit and integration tests using the built-in `node:test` runner (no dependencies).
- `.github/workflows/nses-validate.yml`: pull request and `main` validation with least-privilege permissions and SHA-pinned actions; `.github/dependabot.yml` keeps action pins current.
- Shared tooling layers: common + Next.js / NestJS / React configurations for ESLint (flat config), TypeScript and Sonar, plus a shared Prettier configuration, with integration guides.
- `scripts/README.md` documenting every command, result code and exit code.

### Changed
- `scripts/check-project-compliance.js` replaces the `.mjs` checker and accepts a project path (`node scripts/check-project-compliance.js /path/to/project`). It now detects the technology stack, NSES submodule, pinned version/tag, CLAUDE.md and AGENTS.md integration, referenced profiles (including nested import validation), and recommended quality tooling. It never reads `.env` or credential files, never prints file contents, redacts credentials in submodule URLs and does not modify or execute anything in the target project.
- Example CI workflows in `tooling/ci/` pin actions to full commit SHAs and call the new checker path.
- `tooling/typescript/tsconfig.strict.example.json` became `tooling/typescript/tsconfig.base.json`, which projects can `extend` directly.
- `tooling/eslint/examples/eslint.config.mjs` was replaced by per-framework examples.
- README now uses the actual GitHub organisation in the submodule URL.
- `profiles/react.md` now imports `security/dependency-security.md`; dependency security is part of the baseline for every profile.
- `profiles/nextjs.md` now imports `core/logging-observability.md`, matching the NestJS profile (server-side Route Handlers, Server Actions and middleware need structured, redacted logging).

### Migration notes
- `scripts/check-project-compliance.mjs` still works and forwards to the new script; update CI to the `.js` path when convenient.
- The checker now reports **FAIL** for missing NSES integration (for example, no ENTRY.md import). Keep `--report` in CI during adoption to stay non-blocking, then remove it to enforce.
- Projects that copied `tsconfig.strict.example.json` are unaffected; to adopt the shared base, use `"extends": "./.engineering/standards/tooling/typescript/tsconfig.base.json"`.

## [1.1.0] - 2026-11-05

### Added
- Central `ENTRY.md` navigation guidance for technology profiles.
- Technology profiles for Next.js, NestJS and React under `profiles/`.
- Profile-level imports for applicable core, architecture, security, performance, framework and quality standards.

### Changed
- Clarified that Next.js profile includes the relevant React standards.
- Clarified profile selection for standalone React and multi-technology repositories.

## [1.0.0] - 2026-11-05

### Added
- Initial NewAgeSysIT Engineering Standards baseline.
- Core, architecture, security, performance and framework-specific guidance.
- AI instruction templates, tooling examples, adoption guidance and compliance checker.
