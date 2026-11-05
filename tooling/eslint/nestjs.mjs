// NSES ESLint layer for NestJS services (flat config, ESLint 9+).
// Requires in the project: eslint, typescript-eslint.
// Add nsesTypeChecked(import.meta.dirname) from common.mjs in the project config to enable
// type-aware promise rules (recommended for NestJS; see examples/nestjs.eslint.config.mjs).
import tseslint from 'typescript-eslint';
import { nsesCommon, nsesIgnores, nsesTypeScript } from './common.mjs';

export default [
  nsesIgnores(),
  ...tseslint.configs.recommended,
  nsesCommon,
  nsesTypeScript,
  {
    name: 'nses/nestjs',
    files: ['**/*.ts'],
    rules: {
      // Services log through the Nest Logger (structured, redactable), not console.
      'no-console': ['error', {}],
      // Nest dependency injection reads emitted decorator metadata. Converting a constructor
      // parameter's class import to `import type` (this rule's autofix) erases that runtime
      // reference and silently breaks injection, so the rule is disabled for NestJS.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
