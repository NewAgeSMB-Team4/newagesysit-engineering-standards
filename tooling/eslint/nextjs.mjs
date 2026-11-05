// NSES ESLint layer for Next.js (flat config, ESLint 9+ / Next.js 16+).
// Requires in the project: eslint, eslint-config-next (matching the installed Next.js major).
//
// eslint-config-next already registers the react, react-hooks, jsx-a11y, @next/next and
// (via /typescript) @typescript-eslint plugins, so this layer adds NSES rules only.
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { nsesCommon, nsesIgnores, nsesTypeScript } from './common.mjs';

export default [
  ...nextVitals,
  ...nextTs,
  nsesIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  nsesCommon,
  nsesTypeScript,
];
