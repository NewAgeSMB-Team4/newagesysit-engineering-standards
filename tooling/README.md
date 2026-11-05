# NSES shared tooling

Reusable configuration for ESLint, TypeScript, Prettier, SonarQube and CI in Next.js, NestJS and React projects.

## Design

Each tool has a **common layer**, which is framework-neutral, plus a **framework layer** for Next.js, NestJS or React. Projects reference these layers from the pinned NSES submodule and add their own settings after them. This lets a project adopt NSES without replacing its existing configuration:

| Tool | Common layer | Framework layers | How a project consumes it |
| --- | --- | --- | --- |
| ESLint (flat config) | `eslint/common.mjs` | `eslint/nextjs.mjs`, `eslint/nestjs.mjs`, `eslint/react.mjs` | Spread into the project's `eslint.config.mjs`, then add overrides |
| TypeScript | `typescript/tsconfig.base.json` | `typescript/tsconfig.nextjs.json`, `typescript/tsconfig.nestjs.json`, `typescript/tsconfig.react.json` | `"extends"` from the project's `tsconfig.json` |
| Prettier | `prettier/prettier.config.mjs` | none (formatting is framework-neutral) | Re-export or spread from the project's Prettier config |
| SonarQube | `sonar/sonar-project.properties.example` | `sonar/sonar-project.<framework>.properties.example` | Copy, then edit, because properties files cannot extend each other |
| CI | `ci/github-actions-quality.yml`, `ci/security.yml` | Not applicable | Copy into the project's workflows directory |
| Semgrep | `security/semgrep.yml` | Not applicable | Reference from CI |

The layers are referenced from the submodule at the version the project pins. Upgrading NSES can therefore change lint results. Review the CHANGELOG before upgrading.

## Integration steps

These steps assume NSES is mounted at `.engineering/standards`.

1. **Install the tools** the framework layer needs. Use the versions compatible with your framework. The exact package lists are in [eslint/README.md](eslint/README.md).
2. **ESLint.** Spread the framework layer into `eslint.config.mjs`. Copy-ready files are in [eslint/examples/](eslint/examples/nextjs.eslint.config.mjs).
3. **TypeScript.** Add `"extends": "./.engineering/standards/tooling/typescript/tsconfig.<framework>.json"` to `tsconfig.json`. Keep `include`, `exclude`, `outDir`, `baseUrl` and `paths` in the project file. See [typescript/README.md](typescript/README.md).
4. **Prettier.** Re-export the shared config. See [prettier/README.md](prettier/README.md).
5. **SonarQube.** Copy the matching example to `sonar-project.properties`. See [sonar/README.md](sonar/README.md).
6. **CI.** Copy `ci/github-actions-quality.yml`. It runs lint, typecheck, test, build and the NSES project integration check.
7. **Verify.** Run `node .engineering/standards/scripts/check-project-compliance.js .`. It checks that the configuration is present. It does not lint or audit the code.

## Adopting in an existing project

- **Prefer extension over replacement.** If a project already has an ESLint config, add the NSES layer to the existing array rather than rewriting the file. Then fix any new violations, or record them as an approved exception.
- **Introduce stricter TypeScript options incrementally.** Turning on `noUncheckedIndexedAccess` in a legacy codebase can produce many errors. Override it to `false` in the project `tsconfig.json`, with a tracked remediation plan, and do not drop the whole base.
- **Do not reformat the whole repository in a feature PR.** Adopt Prettier in a dedicated formatting-only PR and add that commit to `.git-blame-ignore-revs`.
- **Never place tokens or credentials in these files.** Sonar and CI credentials belong in CI secrets.

## What these configurations do not do

Linting, type checking and static analysis catch classes of defects. They do not prove that authorization, tenant isolation, input validation or data protection are correct. Those still require the tests and reviews required by the security and quality standards.
