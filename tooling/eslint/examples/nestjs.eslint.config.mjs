// Example eslint.config.mjs for a NestJS service using NSES.
// Install: npm i -D eslint typescript-eslint
import { defineConfig } from 'eslint/config';
import nses from './.engineering/standards/tooling/eslint/nestjs.mjs';
import { nsesTypeChecked } from './.engineering/standards/tooling/eslint/common.mjs';

export default defineConfig([
  ...nses,
  // Type-aware promise rules; uses the project's tsconfig.json.
  nsesTypeChecked(import.meta.dirname),
  // Project-specific additions and overrides go after the NSES layers.
]);
