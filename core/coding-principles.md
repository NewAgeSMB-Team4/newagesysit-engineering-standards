# Core coding principles

## Required

- **MUST** write code for clarity first. Prefer explicit names and straightforward control flow.
- **MUST** use TypeScript for new JavaScript/TypeScript application code unless a repository has an approved exception.
- **MUST** avoid `any`; use `unknown` at untrusted boundaries and narrow it. Any unavoidable `any` requires a short justification and the narrowest possible scope.
- **MUST** handle rejected promises and expected failure paths. Do not silently swallow errors.
- **MUST** remove dead code, debug output and temporary bypasses before merge.
- **MUST** preserve existing project conventions unless they conflict with a security requirement or an approved migration.
- **SHOULD** keep functions focused, with a clear purpose and limited side effects.
- **SHOULD** prefer immutable transformations and `const`; mutate only when it improves clarity or performance measurably.
- **SHOULD** use early returns to reduce deeply nested conditionals.
- **MAY** introduce abstractions when there is real reuse, complexity reduction or a clear domain concept.

## Avoid

- Premature abstraction, speculative generality and unnecessary design patterns.
- Boolean flags or parameters whose meaning is unclear.
- Large functions/classes/components with unrelated responsibilities.
- Hidden global state, magic values and implicit cross-module coupling.
- Catch-and-ignore, `console.log` left in production code, and disabled lint rules without explanation.

## TypeScript

- Enable `strict` in new projects and progressively move existing projects toward it.
- Define domain types close to the domain that owns them; avoid a giant shared `types.ts`.
- Prefer discriminated unions for stateful variants and exhaustive handling with `never` where practical.
- Validate runtime input; TypeScript types do not validate HTTP payloads, environment variables, database rows or JSON.
- Do not use type assertions to silence a mismatch without proving the invariant.

## Dependencies

- **MUST** justify new runtime dependencies in the PR: purpose, maintenance health, license and security implications.
- **SHOULD** prefer platform/framework capabilities or existing dependencies when appropriate.
- **MUST NOT** add packages with known critical/high exploitable vulnerabilities without documented security approval and mitigation.
