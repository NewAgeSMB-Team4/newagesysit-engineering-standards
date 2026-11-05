// NSES common ESLint layer (flat config). Framework-neutral and plugin-free:
// this file imports nothing and registers no plugins, so it can be composed with
// any framework preset (including eslint-config-next) without plugin conflicts.
//
// Do not use this file on its own; import the framework layer (nextjs.mjs,
// react.mjs or nestjs.mjs), which registers the plugins these rules need.

const JS_TS_FILES = ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}'];
const TS_FILES = ['**/*.{ts,mts,cts,tsx}'];

/** Global ignores. Pass framework build directories as `extra`. */
export function nsesIgnores(extra = []) {
  return {
    name: 'nses/ignores',
    ignores: ['node_modules/**', 'coverage/**', 'dist/**', '.engineering/**', ...extra],
  };
}

/** Core ESLint correctness and security rules that apply to every project. */
export const nsesCommon = {
  name: 'nses/common',
  files: JS_TS_FILES,
  rules: {
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-debugger': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};

/**
 * TypeScript rules. Requires the `@typescript-eslint` plugin to be registered by an
 * earlier config (typescript-eslint presets or eslint-config-next/typescript).
 */
export const nsesTypeScript = {
  name: 'nses/typescript',
  files: TS_FILES,
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description', minimumDescriptionLength: 10 }],
  },
};

/**
 * Opt-in type-aware rules (slower; require type information).
 * Strongly recommended for NestJS and other server code, where an un-awaited
 * promise can silently drop errors.
 *
 * @param {string} tsconfigRootDir Directory containing the project's tsconfig.json
 *   (use `import.meta.dirname` from the project's eslint.config.mjs).
 */
export function nsesTypeChecked(tsconfigRootDir) {
  if (!tsconfigRootDir) throw new Error('nsesTypeChecked(tsconfigRootDir) requires the project root directory.');
  return {
    name: 'nses/type-checked',
    files: TS_FILES,
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/only-throw-error': 'error',
    },
  };
}
