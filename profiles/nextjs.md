# NSES Technology Profile: Next.js

**Applies to:** Next.js applications using React and, where applicable, TypeScript.

This profile imports the shared baseline and the detailed standards relevant to Next.js. Read this profile from the project-root `CLAUDE.md` when using Claude Code. Other agents should follow the same document list from the project-root `AGENTS.md`.

## Core engineering standards

@../core/coding-principles.md
@../core/clean-code.md
@../core/naming-conventions.md
@../core/error-handling.md
@../core/documentation.md

## Architecture standards

@../architecture/component-design.md
@../architecture/data-access.md
@../architecture/api-design.md

## Security standards

@../security/security-baseline.md
@../security/input-validation.md
@../security/authentication-authorization.md
@../security/data-protection.md
@../security/dependency-security.md

## Performance standards

@../performance/performance-standards.md

## React standards

@../frameworks/react/instructions.md
@../frameworks/react/component-design.md

## Next.js standards

@../frameworks/nextjs/instructions.md
@../frameworks/nextjs/server-client-components.md
@../frameworks/nextjs/data-fetching.md
@../frameworks/nextjs/security.md
@../frameworks/nextjs/performance.md

## Quality standards

@../quality/testing-standards.md
@../quality/test-types.md

## Profile-specific requirements

- Prefer Server Components for components that do not need client-side interactivity or browser APIs.
- Keep Client Component boundaries as small as practical; do not add `use client` by default.
- Treat Server Actions and Route Handlers as public-facing trust boundaries: validate input and authorize every protected operation on the server.
- Keep secrets, privileged data access and trusted business operations on the server.
- Follow the installed Next.js version's official documentation; do not assume caching, routing or rendering defaults from another version.
- Use framework-provided image, font, metadata and navigation capabilities where appropriate.
- Test loading, error, empty, unauthorized and not-found states where relevant.
