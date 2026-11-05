# NSES Technology Profile: React

**Applies to:** React applications that are not primarily governed by a framework-specific profile such as Next.js.

For Next.js applications, use `profiles/nextjs.md`, which also imports the relevant React standards. Do not load this profile in addition to the Next.js profile unless a task specifically requires independent React guidance.

## Core engineering standards

@../core/coding-principles.md
@../core/clean-code.md
@../core/naming-conventions.md
@../core/error-handling.md
@../core/documentation.md

## Architecture standards

@../architecture/component-design.md

## Security standards

@../security/security-baseline.md
@../security/input-validation.md
@../security/data-protection.md
@../security/dependency-security.md

## Performance standards

@../performance/performance-standards.md

## React standards

@../frameworks/react/instructions.md
@../frameworks/react/component-design.md

## Quality standards

@../quality/testing-standards.md
@../quality/test-types.md

## Profile-specific requirements

- Keep components cohesive, composable and focused on presentation or a clearly defined behavior.
- Keep state as local as practical; lift or share it only when required by multiple consumers.
- Use effects to synchronize with external systems, not as a default mechanism for derived state or event handling.
- Keep hooks compliant with the Rules of Hooks and avoid unnecessary custom-hook abstractions.
- Treat browser storage, URL parameters, form input and API responses as untrusted input.
- Avoid premature memoization; measure or identify a concrete rendering problem before adding memoization complexity.
