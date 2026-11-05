// NSES shared Prettier configuration (framework-neutral; Prettier 3+).
// Formatting has no framework-specific settings in NSES; Next.js, NestJS and React use the same file.
//
// Use from a project's prettier.config.mjs:
//   import nses from './.engineering/standards/tooling/prettier/prettier.config.mjs';
//   export default { ...nses /* , project overrides */ };

/** @type {import('prettier').Config} */
const config = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
};

export default config;
