// Example eslint.config.mjs for a standalone React (e.g. Vite) project using NSES.
// Install: npm i -D eslint typescript-eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y
import { defineConfig } from 'eslint/config';
import nses from './.engineering/standards/tooling/eslint/react.mjs';

export default defineConfig([
  ...nses,
  // Project-specific additions and overrides go after the NSES layer.
]);
