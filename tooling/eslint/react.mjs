// NSES ESLint layer for standalone React applications (e.g. Vite), flat config, ESLint 9+.
// Requires in the project: eslint, typescript-eslint, eslint-plugin-react,
// eslint-plugin-react-hooks (v6.1+), eslint-plugin-jsx-a11y.
// Do not use this layer in Next.js projects; use nextjs.mjs, which already includes React rules.
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { nsesCommon, nsesIgnores, nsesTypeScript } from './common.mjs';

const JSX_FILES = ['**/*.{jsx,tsx}'];

export default [
  nsesIgnores(['build/**']),
  ...tseslint.configs.recommended,
  { ...react.configs.flat.recommended, files: JSX_FILES, settings: { react: { version: 'detect' } } },
  { ...react.configs.flat['jsx-runtime'], files: JSX_FILES },
  reactHooks.configs.flat.recommended,
  { ...jsxA11y.flatConfigs.recommended, files: JSX_FILES },
  nsesCommon,
  nsesTypeScript,
];
