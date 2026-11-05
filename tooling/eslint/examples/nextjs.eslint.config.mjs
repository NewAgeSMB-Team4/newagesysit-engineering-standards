// Example eslint.config.mjs for a Next.js project using NSES.
// Install: npm i -D eslint eslint-config-next
import { defineConfig } from 'eslint/config';
import nses from './.engineering/standards/tooling/eslint/nextjs.mjs';

export default defineConfig([
  ...nses,
  // Project-specific additions and overrides go after the NSES layer.
  {
    rules: {
      // 'react/no-unescaped-entities': 'off',
    },
  },
]);
