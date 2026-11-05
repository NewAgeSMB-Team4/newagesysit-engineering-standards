# NSES validation and compliance scripts

The scripts need Node.js 22 or later. They have no dependencies, so `npm install` is not required. The expected repository structure is declared in [standards.manifest.json](../standards.manifest.json).

| Command | Purpose |
| --- | --- |
| `npm run validate:imports` | Validates `@` imports in every Markdown file |
| `npm run validate:imports -- --profile nextjs` | Validates one profile and everything it imports. The profile can be `nextjs`, `nestjs` or `react`. |
| `npm run validate:imports -- --file path/to/doc.md` | Validates one Markdown file and everything it imports |
| `npm run validate:profiles` | Validates every profile declared in the manifest |
| `npm run validate:standards` | Validates the structure and consistency of the whole standards repository |
| `npm run lint` | Runs syntax, JSON, YAML and Markdown hygiene checks |
| `npm test`, `npm run test:unit`, `npm run test:integration` | Runs the script tests with `node:test` |
| `npm run validate` | Runs all of the above, as CI does |
| `node scripts/check-project-compliance.js /path/to/project` | Checks how a consuming project integrates NSES |

Every command accepts `--json` for machine-readable output, `--verbose` to also list passed checks, and `--help`.

**Result levels.** `PASS` means a check succeeded. `INFO` is context only. `WARNING` should be fixed but does not fail the run. `FAIL` means a mandatory check failed.

**Exit codes.** `0` means no failures. `1` means at least one `FAIL`. `2` means a usage error, such as an unknown option or a missing path. `3` means an unexpected error.

## Import validator (`validate-imports.js`)

The validator finds Claude Code-style imports, `@path/to/file.md`, and resolves each one relative to the file that contains it. It follows nested Markdown imports.

An `@` token counts as an import only when both of these are true:

- It is at the start of a line or follows whitespace. This excludes email addresses.
- Its path starts with `./`, `../`, `/` or `~/`, or ends in `.md`, `.mdx`, `.markdown` or `.txt`, or contains a `/` and has a file extension.

Under these rules the following are not imports:

- npm scopes such as `@nestjs/common`
- decorators such as `@Injectable()`
- mentions such as `@john.doe`
- anything inside fenced code blocks, indented code blocks, inline code spans or HTML comments

| Code | Level | Meaning |
| --- | --- | --- |
| `IMPORT_NOT_FOUND` | FAIL | The imported file does not exist. The message includes the resolved path and suggests a fix when `.md` is missing. |
| `IMPORT_MISSING_PROFILE` | FAIL | The import points to `profiles/<name>.md`, which does not exist, or `--profile` names an unknown profile. |
| `IMPORT_IS_DIRECTORY` | FAIL | The import points to a directory instead of a file. |
| `IMPORT_OUTSIDE_ROOT` | FAIL | The import resolves outside the repository, or to the home directory (`~/`). |
| `IMPORT_CASE_MISMATCH` | FAIL | The letter case differs from the file on disk. This works on Windows and macOS but breaks on Linux CI. |
| `IMPORT_SENSITIVE_FILE` | FAIL | The import targets `.env*`, a key, `.npmrc` or a credentials file. The file is never read. |
| `IMPORT_CIRCULAR` | FAIL | Imports form a cycle. The message shows the cycle path. |
| `IMPORT_DUPLICATE` | WARNING | The same import appears more than once in one file. |
| `IMPORT_ABSOLUTE_PATH` | WARNING | The import uses an absolute path inside the repository, which is not portable. |
| `IMPORT_DEPTH_EXCEEDED` | WARNING | The import chain is deeper than `maxImportDepth` (5), the maximum number of hops Claude Code follows. |

Only Markdown targets are read and followed. Other targets are checked for existence only. In the AI instruction templates (`templateFiles` in the manifest), `.engineering/standards/...` is mapped to the repository root, because those files are written from the consuming project's point of view.

**Known limitations.** An inline code span that continues across a line break is not tracked. HTML blocks other than comments are scanned as text.

## Standards validator (`validate-standards.js`)

| Section | Checks |
| --- | --- |
| 1. Repository structure | `ENTRY.md`, `README.md`, `CHANGELOG.md` and `VERSION` exist |
| 2. Version consistency | `VERSION` is a valid semantic version. The `**Version:**` line in `README.md` and `ENTRY.md`, and the `package.json` version, match it. `CHANGELOG.md` has a `## [x.y.z]` entry for it. |
| 3. Technology profiles | Every declared profile exists and is referenced from `ENTRY.md`. Each profile imports the baseline and its framework's required standards. No profile imports another profile. Cross-framework imports, such as Next.js importing React standards, are allowed only when listed in the manifest with a reason. Profile files that are not declared produce a warning. |
| 4. Required standards | Every required core, architecture, security, performance, quality and template document exists and has a title |
| 5. AI instruction templates | The `CLAUDE.md` template imports `ENTRY.md` and an example profile. The `AGENTS.md` template references `ENTRY.md` and every profile. |
| 6. Markdown imports | Every import in the repository resolves (same rules as the import validator) |
| 7. Documentation references | Repository paths in inline code (for example `profiles/nextjs.md`) and relative Markdown links resolve to files. Names of files in the consuming project are listed in `projectLevelFileNames`. `CHANGELOG.md` is excluded because it records historical paths. |

### Changing the structure

- **Adding a profile.** Create `profiles/<name>.md` and add it to `profiles` in the manifest, with `frameworkDirs`, `detect.dependencies` and `requiredImports`. Then reference it from `ENTRY.md` and from both templates in `ai-instructions/`.
- **Allowing a deliberate cross-framework import.** Add `{ "path", "reason" }` to the profile's `allowedCrossFrameworkImports`. An entry without a reason fails validation.

## Project integration checker (`check-project-compliance.js`)

```bash
node .engineering/standards/scripts/check-project-compliance.js .            # from the project root
node scripts/check-project-compliance.js /path/to/project --report           # never fails the run
node scripts/check-project-compliance.js /path/to/project --standards-path vendor/nses --json
```

The checker reports on the following:

- **Technology stack**, detected from `package.json`. Next.js, NestJS, React and TypeScript are supported, and React is not reported separately in a Next.js app.
- **NSES installation.** It checks whether NSES is a registered submodule and whether the submodule has been initialized. It also reports the `VERSION` and what the checkout is pinned to (tag, branch or commit), read from git metadata without running git.
- **`CLAUDE.md`.** It checks the `ENTRY.md` import, the profile imports, and whether nested imports resolve all the way into NSES. It also detects template text that was never customized.
- **`AGENTS.md`.** It checks the `ENTRY.md` reference, the profile references, and whether every referenced NSES path resolves.
- **Profile coverage.** It checks that each detected technology has its profile referenced, and that no referenced profile is missing from the detected stack.
- **Recommended tooling**, by presence only. This covers:
  - the lint, typecheck, test and build scripts
  - a lockfile
  - a test framework
  - strict mode in `tsconfig.json`
  - ESLint and Prettier configuration
  - Sonar configuration
  - CI configuration
  - Dependabot or Renovate configuration
- **Hygiene.** It checks that `.gitignore` covers `.env` files.

### Safety guarantees

The tests cover each of these:

- The checker is read-only. The test suite proves the project tree is byte-for-byte unchanged afterwards.
- It reads only allowlisted configuration and instruction files. It never opens `.env*`, keys, `.npmrc` or credential files, and refuses files over 1 MiB.
- It never prints file contents. Credentials in `.gitmodules` URLs are redacted.
- It never executes project scripts, installs packages or makes network requests.

**Scope.** This is a configuration check. A PASS means NSES is wired in and the recommended tooling is configured. It does **not** mean the code is secure, tested or compliant. Security and code-quality evidence comes from the project's CI (lint, typecheck, tests, SAST, dependency and secret scanning) and from human review.

`scripts/check-project-compliance.mjs` remains as a backward-compatible entry point for NSES 1.1.0 CI configurations.
