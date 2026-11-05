# ESLint integration notes

NSES does not publish a universal ESLint config yet because Next.js, React and NestJS repositories can use different ESLint majors and plugin versions. Adopt the config format supported by the project's installed tooling.

Minimum policy:
- TypeScript-aware linting enabled.
- React/Next.js rules enabled for UI projects.
- Hooks rules enabled for React projects.
- Accessibility linting enabled where compatible.
- No blanket disabling of security or correctness rules.
- CI runs lint and fails on errors; warnings should be budgeted and reduced.

Use `examples/eslint.config.mjs` as a starting point only; verify plugin versions and APIs before installing.
