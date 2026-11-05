# NSES TypeScript configuration

| File | Purpose |
| --- | --- |
| `tsconfig.base.json` | Common strict settings for every project |
| `tsconfig.nextjs.json` | Base settings plus Next.js (bundler resolution, `noEmit`, `next` plugin) |
| `tsconfig.nestjs.json` | Base settings plus NestJS (`nodenext`, decorators, decorator metadata) |
| `tsconfig.react.json` | Base settings plus standalone React using a bundler such as Vite (`react-jsx`, `noEmit`) |

## Usage

Extend the framework file from the project's `tsconfig.json`. Keep every path-based option in the project file:

```jsonc
{
  "extends": "./.engineering/standards/tooling/typescript/tsconfig.nestjs.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./"
  },
  "include": ["src/**/*.ts"]
}
```

TypeScript resolves relative paths in an extended config relative to the file that declares them. For that reason the shared files never set `include`, `exclude`, `files`, `outDir`, `rootDir`, `baseUrl` or `paths`. If they did, those paths would point inside the submodule.

Next.js rewrites the project `tsconfig.json` with any settings it requires, such as `jsx` and `include`. That is expected; keep the `extends` line.

## Notes

- `noUncheckedIndexedAccess` makes indexed access return `T | undefined`. Enable it for new projects. For a legacy codebase, set it to `false` in the project file and plan a migration.
- **NestJS DTOs.** Under `strict`, DTO properties populated by `class-transformer` need definite assignment (`name!: string`) or a constructor. Do not disable `strictPropertyInitialization` project-wide.
- `isolatedModules` is set only for Next.js and React, because those builds use per-file transpilers. NestJS leaves it off: combined with `emitDecoratorMetadata` it raises TS1272 for type-only imports used in decorated signatures.
- Run `npx tsc --showConfig` to see the effective merged configuration.
