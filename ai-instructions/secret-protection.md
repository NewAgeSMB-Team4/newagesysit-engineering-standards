# Keeping secrets away from AI coding assistants

This guide shows how to stop each AI coding assistant from reading secret files in your project, while still letting it read placeholder files such as `.env.example`.

**Why this matters.** `CLAUDE.md` and `AGENTS.md` *ask* the assistant not to read secrets. An instruction can be forgotten, misread or overridden by text the assistant reads elsewhere (a README, an issue, a web page). The settings below are enforced by the tool itself, so the assistant cannot open the file even if it tries.

**What counts as a secret file.** Anything holding a real password, token or key:

- environment files: `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.staging`, `.env.test` and similar;
- private keys and certificates: `*.pem`, `*.key`, `*.p12`, `*.pfx`, SSH keys;
- registry and login tokens: `.npmrc`, `.netrc`;
- cloud credentials: `credentials.json`, `service-account*.json`, any `secrets/` folder.

**What stays readable.** `.env.example`, `.env.sample` and `.env.template` (also per-environment ones such as `.env.production.example`). The assistant needs them to know which variables exist, so they **must contain dummy values only**.

## Summary

| Tool | Where you configure it | Blocks shell commands like `cat .env`? |
| --- | --- | --- |
| [Claude Code](#claude-code) | `.claude/settings.json` (committed) | **Yes** |
| [Cursor](#cursor) | `.cursorignore` (committed) | No |
| [GitHub Copilot](#github-copilot) | GitHub repository or organization settings | No |
| [OpenAI Codex CLI](#openai-codex-cli) | Codex `config.toml` permission profile | Partly; see the section |
| [Gemini CLI](#gemini-cli) | `.geminiignore` (committed) | No |
| [Windsurf / Devin Desktop](#windsurf--devin-desktop) | `.devinignore` (committed) | Not documented; assume no |

**No tool's ignore file is a complete security boundary.** Most only block the assistant's built-in file tools. A shell command, a plugin or an MCP server can still read the file. So also:

1. Keep real production secrets out of developer machines. Use a secret manager, and give local `.env` files development-only values.
2. Approve terminal commands yourself rather than letting the assistant run them automatically, especially commands that print files.
3. Run the [Gitleaks secret scan](../README.md#scan-for-leaked-secrets-gitleaks) so a leak is caught even if everything else fails.

## Claude Code

Copy the NSES template into your project and commit it:

```bash
mkdir -p .claude
cp .engineering/standards/ai-instructions/claude-settings.json .claude/settings.json
```

The template ([claude-settings.json](claude-settings.json)) contains `permissions.deny` rules such as `Read(**/.env)` and `Read(**/*.pem)`. They also block secret folders in your home directory: SSH, AWS, Azure, Google Cloud, GitHub CLI, Docker, Kubernetes and Git credentials.

- **Strength:** in current versions, deny rules also apply to shell commands (`cat .env`, `grep` over the file and so on), not only to the Read tool. Keep Claude Code up to date.
- **Exceptions are impossible:** an `allow` rule cannot override a `deny` rule. That is why the template lists each secret `.env` variant by name instead of `.env.*`, which would also block `.env.example`.
- **Unusual names:** if you use a name the template does not list, such as `.env.client-a`, add a rule for it: `"Read(**/.env.client-a)"`.
- **Already have a `.claude/settings.json`?** Merge the `deny` entries into your existing `permissions.deny` list instead of overwriting the file.
- **Checked automatically:** the NSES project checker warns (`AI_SECRET_DENY_MISSING`) if this file does not block `.env` reads.

## Cursor

Create `.cursorignore` in the project root (same syntax as `.gitignore`) and commit it:

```gitignore
# Secrets: never visible to Cursor's AI features
.env
.env.*
*.env
.envrc
!.env.example
!.env.sample
!.env.template
!.env.*.example
*.pem
*.key
*.p12
*.pfx
.npmrc
.netrc
credentials.json
service-account*.json
secrets/
```

- Cursor supports `!` exceptions, so `.env.*` plus the `!` lines blocks every variant while keeping the examples readable.
- **Does not protect against:** commands the Agent runs in the terminal, or MCP tools. Cursor's documentation says complete protection is not guaranteed.
- Source: [Cursor — ignore files](https://cursor.com/docs/context/ignore-files)

## GitHub Copilot

Copilot uses **content exclusion**, configured on GitHub rather than in a file. It requires a **Copilot Business or Enterprise** plan.

1. Open the repository on GitHub, then go to **Settings → Copilot → Content exclusion**. An organization owner can set the same rules for all repositories under the organization's settings.
2. Paste the paths below and save.
3. Allow up to 30 minutes for IDEs to pick up the change.

```yaml
- ".env"
- ".env.local"
- ".env.*.local"
- ".env.development"
- ".env.dev"
- ".env.test"
- ".env.staging"
- ".env.production"
- ".env.prod"
- "*.env"
- ".envrc"
- "*.pem"
- "*.key"
- "*.p12"
- "*.pfx"
- ".npmrc"
- ".netrc"
- "credentials.json"
- "service-account*.json"
- "secrets/**"
```

- Exceptions (`!`) are not documented, so list each secret file by name. A bare file name matches in any folder.
- **Does not protect against:** indirect access by agents (for example through the terminal), symlinks, third-party MCP servers, and Copilot Chat in Xcode and Eclipse. GitHub describes it as "not a filesystem security boundary".
- Sources: [content exclusion overview](https://docs.github.com/en/copilot/concepts/context/content-exclusion) · [how to configure it](https://docs.github.com/en/copilot/how-tos/configure-content-exclusion/exclude-content-from-copilot)

## OpenAI Codex CLI

Codex has no ignore file. Instead it uses **filesystem permission profiles** in its `config.toml`, which can deny reading specific paths. `AGENTS.md` is an instruction file only; it does not block anything.

A profile that keeps the workspace writable but denies secret files looks like this:

```toml
default_permissions = "project"

[permissions.project.filesystem]
":minimal" = "read"
glob_scan_max_depth = 5

[permissions.project.filesystem.":workspace_roots"]
"." = "write"
"**/.env" = "deny"
"**/.env.local" = "deny"
"**/.env.*.local" = "deny"
"**/.env.development" = "deny"
"**/.env.staging" = "deny"
"**/.env.production" = "deny"
"**/*.pem" = "deny"
"**/*.key" = "deny"
"**/.npmrc" = "deny"
"**/credentials.json" = "deny"
```

> **Verify before relying on it.** This feature is new and changes between Codex versions. The snippet follows the documented key names, but check it against the [Codex permissions documentation](https://developers.openai.com/codex/permissions) for your installed version, then [test it](#test-that-the-block-works).

- Permission profiles cannot be combined with the older `sandbox_mode` settings; use one or the other.
- An administrator can enforce read blocks for everyone through a managed `requirements.toml`, which developers cannot override.
- **Does not protect against:** MCP servers, connectors, and web or browser tools. On Linux, WSL and Windows, files created after a sandboxed command starts may not be covered.

## Gemini CLI

Create `.geminiignore` in the project root (same syntax as `.gitignore`) and commit it:

```gitignore
.env
.env.local
.env.*.local
.env.development
.env.dev
.env.test
.env.staging
.env.production
.env.prod
*.env
.envrc
*.pem
*.key
.npmrc
.netrc
credentials.json
service-account*.json
secrets/
```

- `!` exceptions are documented, but there is an open bug report that they do not work for re-allowing files, so list secret files by name as above. `.env.example` is then readable because nothing matches it.
- Restart Gemini CLI after changing the file.
- **Does not protect against:** the shell tool. Users report that `cat .env` still works. To close that gap, disable or require approval for the shell tool in Gemini CLI's settings.
- Sources: [.geminiignore](https://geminicli.com/docs/cli/gemini-ignore/) · [configuration](https://geminicli.com/docs/reference/configuration/)

## Windsurf / Devin Desktop

Windsurf is now **Devin Desktop**. Create `.devinignore` in the project root and commit it. Older projects may use `.windsurfignore` or `.codeiumignore`; those names still work. Use the same contents as the [Gemini CLI list](#gemini-cli) above.

- Matching files are not indexed, and the agent cannot view, edit or create them.
- Exceptions (`!`) are not documented, so list secret files by name.
- **Does not protect against:** nothing is documented about the terminal or autocomplete, so assume they are not covered.
- Source: [Devin Desktop — ignore files](https://docs.devin.ai/desktop/context-awareness/windsurf-ignore)

## Test that the block works

After setting up any tool, check it. Use a harmless dummy file so that no real secret is ever involved:

1. Create a throwaway `.env.local` containing only `TEST_VALUE=not-a-secret`.
2. Ask the assistant: *"What is the value of TEST_VALUE in .env.local?"* It should refuse or say it cannot access the file.
3. Ask: *"Run a terminal command to print .env.local."* This shows whether the shell is also blocked. Do not approve the command if the tool asks.
4. Ask it to read `.env.example`. It should succeed.
5. Delete the dummy file.

If step 2 succeeds, the configuration is not working. Fix it before using the assistant on that project.
