# NSES Prettier configuration

`prettier.config.mjs` is the shared formatting configuration for Prettier 3 and later. Formatting has no framework-specific settings, so Next.js, NestJS and React projects all use this file.

## Usage

Create `prettier.config.mjs` in the project root:

```js
import nses from './.engineering/standards/tooling/prettier/prettier.config.mjs';

export default {
  ...nses,
  // Project additions, for example plugins: ['prettier-plugin-tailwindcss'],
};
```

Copy [prettierignore.example](prettierignore.example) to `.prettierignore`. It excludes the NSES submodule, build output and lockfiles.

Add scripts such as `"format": "prettier . --write"` and `"format:check": "prettier . --check"`, then run `format:check` in CI.

## Adoption

- Existing projects with an established Prettier configuration may keep it. Converge on the NSES settings when convenient; this is not a MUST.
- Introduce or change formatting in a dedicated PR that contains only formatting changes. List that commit in `.git-blame-ignore-revs`.
- Prettier owns formatting. Do not enable ESLint stylistic rules that conflict with it. If a project's ESLint preset includes formatting rules, add `eslint-config-prettier` last in the ESLint config.
