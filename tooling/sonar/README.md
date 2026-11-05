# NSES SonarQube configuration

| File | Use for |
| --- | --- |
| `sonar-project.properties.example` | Common settings for any TypeScript project |
| `sonar-project.nextjs.properties.example` | Next.js: `app/` and `src/` sources; excludes `.next/`, `out/` and `public/` |
| `sonar-project.nestjs.properties.example` | NestJS: `test/**/*.e2e-spec.ts`; excludes module wiring from coverage |
| `sonar-project.react.properties.example` | Standalone React or Vite: excludes stories and `main.tsx` from coverage |

Sonar properties files cannot include or extend other files. Each framework example therefore repeats the common block, which is clearly marked. When the common block changes, update all four files in the same PR.

## Usage

1. Copy the matching example to `sonar-project.properties` in the project root.
2. Set `sonar.projectKey` and `sonar.projectName`, and adjust the source and test paths to the project layout.
3. Configure the test runner to write `coverage/lcov.info`. For Jest or Vitest, use the `lcov` coverage reporter.
4. Provide `SONAR_TOKEN` and `SONAR_HOST_URL` as CI secrets. **Never commit tokens to this file.**
5. Define the quality gate thresholds in SonarQube itself, following company policy.

## Notes

- Always exclude `.engineering/**`. The NSES submodule is not project code.
- Keep coverage exclusions narrow and justified. Excluding business logic to meet a gate is not acceptable.
- A passing quality gate does not mean the code is secure. See `security/security-baseline.md`.
