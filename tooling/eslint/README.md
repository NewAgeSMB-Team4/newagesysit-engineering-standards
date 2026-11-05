# NSES ESLint configuration

These are ESLint flat configs for ESLint 9 and later. They are split into a common layer and one layer per framework.

| File | Purpose | Project dependencies |
| --- | --- | --- |
| `common.mjs` | Framework-neutral rules: `nsesIgnores()`, `nsesCommon`, `nsesTypeScript`, and the opt-in `nsesTypeChecked()`. It has no imports and registers no plugins. | none |
| `nextjs.mjs` | Next.js: `eslint-config-next` core-web-vitals and typescript, plus the NSES rules | `eslint`, `eslint-config-next` |
| `react.mjs` | Standalone React (for example Vite): typescript-eslint, react, react-hooks and jsx-a11y, plus the NSES rules | `eslint`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks` (6.1 or later), `eslint-plugin-jsx-a11y` |
| `nestjs.mjs` | NestJS: typescript-eslint plus the NSES rules, with `no-console` set to error (use the Nest `Logger`) | `eslint`, `typescript-eslint` |

The common layer contains only rules so that it can be composed with presets that already register plugins. `eslint-config-next` already registers react, react-hooks, jsx-a11y and `@typescript-eslint`. Registering those plugins a second time from another copy fails with "Cannot redefine plugin". For the same reason, **do not combine `react.mjs` with `nextjs.mjs`**.

## Usage

Spread the framework layer and add project rules after it. Later entries override earlier ones.

```js
// eslint.config.mjs (Next.js)
import { defineConfig } from 'eslint/config';
import nses from './.engineering/standards/tooling/eslint/nextjs.mjs';

export default defineConfig([...nses, { rules: { /* project overrides */ } }]);
```

Copy-ready examples:

- [examples/nextjs.eslint.config.mjs](examples/nextjs.eslint.config.mjs)
- [examples/react.eslint.config.mjs](examples/react.eslint.config.mjs)
- [examples/nestjs.eslint.config.mjs](examples/nestjs.eslint.config.mjs)

The layer files import their plugins with bare package names. Node resolves those packages from the project's `node_modules`, because the submodule directory sits inside the project. Install the packages listed above in the project. NSES has no runtime dependencies of its own.

## Type-aware rules

`nsesTypeChecked(import.meta.dirname)` enables `no-floating-promises`, `no-misused-promises`, `await-thenable` and `only-throw-error`. These rules need type information, so linting is slower. They are strongly recommended for NestJS and any server code, where a promise that is never awaited can silently swallow errors. The NestJS example enables them.

## NestJS and `consistent-type-imports`

`nestjs.mjs` turns off `@typescript-eslint/consistent-type-imports`. Nest dependency injection relies on decorator metadata. If an injected class's import is rewritten to `import type`, the class reference is erased from the emitted JavaScript, and injection breaks at runtime without any compile error.

## Policy

- TypeScript-aware linting is enabled.
- React and Next.js rules are enabled for UI projects, including the Rules of Hooks and accessibility rules.
- Do not disable security or correctness rules wholesale. Narrow, commented overrides are acceptable.
- CI runs lint and fails on errors. Track warnings and reduce them over time.
- Verify plugin versions against the framework version the project has installed before upgrading.
